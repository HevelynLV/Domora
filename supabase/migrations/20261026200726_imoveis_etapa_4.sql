-- Etapa 4, passo 4.2: cadastro do imóvel (decisões de 26/10/2026, plano da Etapa 4).
--
-- 1. Termo de exclusividade em versões: o imóvel guarda qual versão foi aceita, e só
--    a versão vigente pode ser aceita. A Etapa 4 usa um texto provisório; o final
--    entra antes do piloto (Etapa 13) como uma versão nova, sem mudar o fluxo.
-- 2. Rascunho: o imóvel do proprietário nasce em rascunho (sem termo) e vai para
--    pendente só pela função enviar_imovel(), com o termo vigente e pelo menos uma
--    foto. Rascunho só o dono vê, edita e apaga; não entra na fila do admin.
-- 3. O dono edita o imóvel pendente (dados, fotos e contato), sem registro de
--    edições; a versão sobe, e a aprovação de uma tela antiga falha (RF14).
-- 4. Fotos: no máximo 20 por imóvel, e o caminho do arquivo começa com o id do
--    imóvel (o mesmo formato das políticas do bucket, no passo 4.3).
-- 5. Itens da auditoria da Etapa 2: tipo ou bairro fora de uso é recusado; a
--    revisão da edição é preenchida pelo banco; versão e registro de edições usam
--    a mesma lista de campos.
-- 6. Conteúdo das listas de tipos de imóvel e de bairros de Florianópolis.

-- ---------------------------------------------------------------
-- 1. Termo de exclusividade
-- ---------------------------------------------------------------

create table public.termos_exclusividade (
  versao     text primary key,
  texto      text not null,
  -- true = texto de teste. Nenhum proprietário real aceita uma versão provisória.
  provisorio boolean not null,
  -- Só uma versão vigente por vez (índice abaixo). Trocar o texto é criar uma
  -- versão nova e passar o vigente para ela, numa migration.
  vigente    boolean not null default false,
  criado_em  timestamptz not null default now(),

  constraint termos_exclusividade_versao_formato check (versao ~ '^[a-z0-9-]{3,40}$'),
  constraint termos_exclusividade_texto_preenchido check (char_length(btrim(texto)) > 0)
);

create unique index termos_exclusividade_um_vigente
  on public.termos_exclusividade (vigente) where vigente;

alter table public.termos_exclusividade enable row level security;

-- Todo logado lê (o proprietário lê antes de aceitar; o admin confere). Ninguém
-- grava pelo app.
revoke all on table public.termos_exclusividade from anon, authenticated;
grant select on table public.termos_exclusividade to authenticated;

create policy "termos_exclusividade: logado le" on public.termos_exclusividade
  for select to authenticated using (true);

insert into public.termos_exclusividade (versao, texto, provisorio, vigente)
values ('2026-10-provisorio', $termo$TEXTO PROVISÓRIO, SÓ PARA TESTES. Este não é o termo de exclusividade definitivo do PAUTA e não vale para imóveis reais.

1. O proprietário dá ao PAUTA a exclusividade da venda do imóvel por 6 (seis) meses, contados da aprovação do imóvel pela equipe PAUTA.

2. Durante esse prazo, o imóvel só é vendido por meio do PAUTA, e o proprietário não tira o imóvel de venda.

3. Vários corretores e imobiliárias assinantes do PAUTA podem trabalhar o imóvel ao mesmo tempo.

4. As visitas são marcadas pelo app, e o proprietário confirma ou recusa cada uma. O proprietário aceita ou recusa cada proposta.

5. Antes do fim do prazo, o proprietário recebe um aviso para renovar. Sem renovação, o imóvel sai do catálogo no vencimento.

6. O proprietário escolhe, para cada imóvel, se mostra o próprio telefone e e-mail aos corretores.$termo$, true, true);

-- Imóvel só guarda versão que existe.
alter table public.imoveis
  add constraint imoveis_termo_versao_fk
  foreign key (termo_versao) references public.termos_exclusividade (versao);

-- Só a versão vigente pode ser aceita (no cadastro, no envio ou no aceite do dono
-- de imóvel captado). Um imóvel que já tem uma versão antiga continua com ela.
create function public.conferir_termo_vigente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.termo_versao is not null
     and new.termo_versao is distinct from (case when tg_op = 'UPDATE' then old.termo_versao end)
     and not exists (select 1 from public.termos_exclusividade t
                     where t.versao = new.termo_versao and t.vigente)
  then
    raise exception 'Só a versão vigente do termo de exclusividade pode ser aceita'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger conferir_termo_vigente
  before insert or update of termo_versao on public.imoveis
  for each row execute function public.conferir_termo_vigente();

revoke execute on function public.conferir_termo_vigente() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 2. Rascunho
-- ---------------------------------------------------------------

-- O imóvel do proprietário nasce em rascunho. O captado pelo admin (passo 4.7)
-- informa o status ao ser criado.
alter table public.imoveis alter column status set default 'rascunho';

-- O termo é exigido fora do rascunho (antes: desde o insert).
alter table public.imoveis drop constraint imoveis_termo_aceito;
alter table public.imoveis add constraint imoveis_termo_aceito check (
  captado_pelo_admin
  or status = 'rascunho'
  or (termo_versao is not null and termo_aceito_em is not null)
);

alter table public.imoveis drop constraint imoveis_exclusividade_marcada;
alter table public.imoveis add constraint imoveis_exclusividade_marcada check (
  status in ('rascunho', 'pendente', 'reprovado')
  or (exclusividade_inicio is not null and exclusividade_fim is not null)
);

-- O termo agora é aceito só pela função enviar_imovel(): o app não manda mais a
-- versão no insert.
revoke insert (termo_versao) on table public.imoveis from authenticated;

-- Proprietário manda o rascunho para a aprovação, aceitando o termo (passo 3 do
-- cadastro). Exige a versão vigente do termo e pelo menos uma foto.
create function public.enviar_imovel(p_imovel uuid, p_termo_versao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- for update: dois envios ao mesmo tempo não passam os dois.
  perform 1 from public.imoveis
  where id = p_imovel and proprietario_id = (select auth.uid()) and status = 'rascunho'
  for update;
  if not found then
    raise exception 'Só o proprietário envia, e só imóvel em rascunho' using errcode = 'P0001';
  end if;

  if char_length(btrim(coalesce(p_termo_versao, ''))) = 0 then
    raise exception 'Aceite o termo de exclusividade para enviar' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.fotos_imovel where imovel_id = p_imovel) then
    raise exception 'Envie pelo menos uma foto antes de mandar para a aprovação' using errcode = 'P0001';
  end if;

  -- O gatilho conferir_termo_vigente recusa uma versão que não é a vigente.
  update public.imoveis
  set status = 'pendente', termo_versao = p_termo_versao, termo_aceito_em = now()
  where id = p_imovel;
end;
$$;

revoke execute on function public.enviar_imovel(uuid, text) from public, anon;
grant execute on function public.enviar_imovel(uuid, text) to authenticated;

-- Reenviar o reprovado também exige pelo menos uma foto (o dono pode ter tirado todas).
create or replace function public.reenviar_imovel(p_imovel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.imoveis
  where id = p_imovel and proprietario_id = (select auth.uid()) and status = 'reprovado'
  for update;
  if not found then
    raise exception 'Só o proprietário reenvia, e só imóvel reprovado' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.fotos_imovel where imovel_id = p_imovel) then
    raise exception 'Envie pelo menos uma foto antes de mandar para a aprovação' using errcode = 'P0001';
  end if;

  update public.imoveis
  set status = 'pendente', motivo_reprovacao = null
  where id = p_imovel;
end;
$$;

-- ---------------------------------------------------------------
-- 3. Quem vê, edita e apaga (rascunho e pendente)
-- ---------------------------------------------------------------

-- O admin não vê rascunho: ele ainda não foi enviado.
drop policy "imoveis: admin le todos" on public.imoveis;
create policy "imoveis: admin le todos, menos rascunho"
  on public.imoveis for select to authenticated
  using ((select public.eh_admin()) and status <> 'rascunho');

drop policy "imoveis: admin edita" on public.imoveis;
create policy "imoveis: admin edita, menos rascunho"
  on public.imoveis for update to authenticated
  using ((select public.eh_admin()) and status <> 'rascunho')
  with check ((select public.eh_admin()) and status <> 'rascunho');

-- O dono edita rascunho, pendente, reprovado e disponível. Só a edição em
-- disponível vai para o registro (gatilho registrar_edicao_do_imovel).
drop policy "imoveis: dono edita reprovado ou disponivel" on public.imoveis;
create policy "imoveis: dono edita rascunho, pendente, reprovado ou disponivel"
  on public.imoveis for update to authenticated
  using (proprietario_id = (select auth.uid())
         and status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
  with check (proprietario_id = (select auth.uid())
              and status in ('rascunho', 'pendente', 'reprovado', 'disponivel'));

-- O dono apaga rascunho, pendente ou reprovado (RF12). As fotos vão junto.
drop policy "imoveis: dono apaga pendente ou reprovado" on public.imoveis;
create policy "imoveis: dono apaga rascunho, pendente ou reprovado"
  on public.imoveis for delete to authenticated
  using (proprietario_id = (select auth.uid()) and status in ('rascunho', 'pendente', 'reprovado'));

-- Fotos: o dono mexe em rascunho, pendente, reprovado e disponível; o admin, em
-- qualquer imóvel menos rascunho.
drop policy "fotos_imovel: dono ou admin acrescenta" on public.fotos_imovel;
drop policy "fotos_imovel: dono ou admin muda a ordem" on public.fotos_imovel;
drop policy "fotos_imovel: dono ou admin tira" on public.fotos_imovel;

create policy "fotos_imovel: dono ou admin acrescenta"
  on public.fotos_imovel for insert to authenticated
  with check (
    exists (select 1 from public.imoveis i
            where i.id = imovel_id
              and ((i.proprietario_id = (select auth.uid())
                    and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
                   or ((select public.eh_admin()) and i.status <> 'rascunho')))
  );

create policy "fotos_imovel: dono ou admin muda a ordem"
  on public.fotos_imovel for update to authenticated
  using (
    exists (select 1 from public.imoveis i
            where i.id = imovel_id
              and ((i.proprietario_id = (select auth.uid())
                    and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
                   or ((select public.eh_admin()) and i.status <> 'rascunho')))
  );

create policy "fotos_imovel: dono ou admin tira"
  on public.fotos_imovel for delete to authenticated
  using (
    exists (select 1 from public.imoveis i
            where i.id = imovel_id
              and ((i.proprietario_id = (select auth.uid())
                    and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
                   or ((select public.eh_admin()) and i.status <> 'rascunho')))
  );

-- ---------------------------------------------------------------
-- 4. Fotos: caminho e limite
-- ---------------------------------------------------------------

-- O arquivo fica na pasta do imóvel no bucket ({imovel_id}/{nome}.jpg), e não em
-- outro imóvel (auditoria da Etapa 2). O nome só tem letras, números, - e _.
alter table public.fotos_imovel add constraint fotos_imovel_caminho_do_imovel check (
  caminho ~ ('^' || imovel_id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

-- No máximo 20 fotos por imóvel (decisão de 26/10/2026).
create function public.conferir_limite_de_fotos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trava o imóvel: dois envios ao mesmo tempo não passam juntos do limite.
  perform 1 from public.imoveis where id = new.imovel_id for update;
  if (select count(*) from public.fotos_imovel where imovel_id = new.imovel_id) >= 20 then
    raise exception 'Cada imóvel tem no máximo 20 fotos' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger conferir_limite_de_fotos
  before insert on public.fotos_imovel
  for each row execute function public.conferir_limite_de_fotos();

revoke execute on function public.conferir_limite_de_fotos() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 5. Itens da auditoria da Etapa 2
-- ---------------------------------------------------------------

-- Tipo ou bairro fora de uso (ativo = false) não entra em imóvel novo nem numa
-- troca. Imóvel que já usa o item continua com ele.
create function public.conferir_listas_ativas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo_id is distinct from (case when tg_op = 'UPDATE' then old.tipo_id end)
     and not exists (select 1 from public.tipos_imovel where id = new.tipo_id and ativo)
  then
    raise exception 'Este tipo de imóvel não está em uso. Escolha outro.' using errcode = 'P0001';
  end if;
  if new.bairro_id is distinct from (case when tg_op = 'UPDATE' then old.bairro_id end)
     and not exists (select 1 from public.bairros where id = new.bairro_id and ativo)
  then
    raise exception 'Este bairro não está em uso. Escolha outro.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger conferir_listas_ativas
  before insert or update of tipo_id, bairro_id on public.imoveis
  for each row execute function public.conferir_listas_ativas();

revoke execute on function public.conferir_listas_ativas() from public, anon, authenticated;

-- A revisão da edição é preenchida pelo banco: o admin só marca (revisado_em com
-- qualquer valor); a data é a de agora e o revisor é quem está logado. Edição já
-- revisada não volta nem muda de revisor.
revoke update (revisado_por) on table public.edicoes_imovel from authenticated;

create function public.preencher_revisao_da_edicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revisado_em is not null then
    new.revisado_em := old.revisado_em;
    new.revisado_por := old.revisado_por;
  elsif new.revisado_em is not null then
    new.revisado_em := now();
    new.revisado_por := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger preencher_revisao_da_edicao
  before update on public.edicoes_imovel
  for each row execute function public.preencher_revisao_da_edicao();

revoke execute on function public.preencher_revisao_da_edicao() from public, anon, authenticated;

-- Uma lista só dos campos de conteúdo: a mesma para subir a versão e para o
-- registro de edições (antes eram duas listas que podiam divergir).
create function public.campos_de_conteudo_do_imovel()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['titulo', 'descricao', 'tipo_id', 'endereco', 'bairro_id', 'preco', 'quartos',
               'banheiros', 'vagas', 'area', 'mostrar_contato'];
$$;

create or replace function public.subir_versao_do_imovel()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_campo text;
begin
  foreach v_campo in array public.campos_de_conteudo_do_imovel()
  loop
    if (to_jsonb(old) -> v_campo) is distinct from (to_jsonb(new) -> v_campo) then
      new.versao := old.versao + 1;
      new.atualizado_em := now();
      exit;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.registrar_edicao_do_imovel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campo text;
begin
  if old.status = 'disponivel'
     and (select auth.uid()) is not null
     and not public.eh_admin()
  then
    foreach v_campo in array public.campos_de_conteudo_do_imovel()
    loop
      if (to_jsonb(old) -> v_campo) is distinct from (to_jsonb(new) -> v_campo) then
        insert into public.edicoes_imovel (imovel_id, campo, valor_antigo, valor_novo, editado_por)
        values (new.id, v_campo, to_jsonb(old) ->> v_campo, to_jsonb(new) ->> v_campo,
                (select auth.uid()));
      end if;
    end loop;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------
-- 6. Listas fixas (decisão de 26/10/2026)
-- ---------------------------------------------------------------
-- Bairros: os 56 bairros oficiais do Decreto municipal nº 29.142 (abril de 2026),
-- conforme a lista publicada por região. Conferir contra o texto do decreto; uma
-- correção é uma migration nova (ou o admin desativa e acrescenta).

insert into public.tipos_imovel (nome) values
  ('Casa'), ('Apartamento'), ('Cobertura'), ('Terreno'), ('Sala comercial')
on conflict (nome) do nothing;

insert into public.bairros (nome) values
  -- Central
  ('Centro'), ('Agronômica'), ('José Mendes'), ('Carvoeira'), ('Córrego Grande'), ('Itacorubi'),
  ('Pantanal'), ('Santa Mônica'), ('Trindade'), ('João Paulo'), ('Monte Verde'), ('Saco Grande'),
  ('Costeira do Pirajubaé'), ('Saco dos Limões'),
  -- Continental
  ('Balneário'), ('Canto'), ('Capoeiras'), ('Coloninha'), ('Estreito'), ('Jardim Atlântico'),
  ('Monte Cristo'), ('Abraão'), ('Bom Abrigo'), ('Coqueiros'), ('Itaguaçu'), ('Jardim Capoeiras'),
  -- Norte da Ilha
  ('Cachoeira do Bom Jesus'), ('Ponta das Canas'), ('Praia Brava'), ('Vargem do Bom Jesus'),
  ('Vargem Grande'), ('Canasvieiras'), ('Daniela'), ('Jurerê'), ('Praia do Forte'), ('Ingleses'),
  ('Santinho'), ('Ratones'), ('Vargem Pequena'), ('Cacupé'), ('Sambaqui'), ('Santo Antônio de Lisboa'),
  -- Sul da Ilha
  ('Alto Ribeirão'), ('Ribeirão da Ilha'), ('Armação'), ('Pântano do Sul'), ('Campeche'),
  ('Morro das Pedras'), ('Rio Tavares'), ('Carianos'), ('Tapera da Base'),
  -- Leste da Ilha
  ('Costa da Lagoa'), ('Lagoa da Conceição'), ('Moçambique'), ('Rio Vermelho'), ('Barra da Lagoa')
on conflict (nome) do nothing;
