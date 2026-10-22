-- Etapa 2, passo 2.4: listas fixas, imóveis, fotos e registro de edições.
--
-- Regras desta migration (ver CLAUDE.md e docs/visao-geral.md):
-- - Imóvel do proprietário nasce pendente, com o termo de exclusividade aceito.
-- - Status e exclusividade só mudam por funções do banco: aprovar e reprovar (admin)
--   e reenviar (proprietário, passo explícito). A aprovação falha se o imóvel mudou
--   depois que o admin abriu a tela (contador versao). Ao aprovar, a exclusividade
--   de 6 meses começa a contar.
-- - Assinante ativo vê só imóvel disponível; o proprietário vê os dele; o admin, todos.
-- - O contato do proprietário NÃO fica no imóvel: só sai pela função
--   contato_do_proprietario(), e só se ele escolheu mostrar naquele imóvel (RNF06).
-- - Edição do proprietário em imóvel disponível fica registrada campo a campo,
--   inclusive fotos (RNF11). Edição do admin não é registrada.
-- - O proprietário apaga só imóvel pendente ou reprovado (RF12).
-- - Ainda em aberto (Pendências da Etapa 4): editar imóvel pendente. Por enquanto o
--   banco não deixa; liberar depois é uma migration nova.
-- - A captação pelo admin (imóvel que já entra disponível) vem no passo 4.7.

-- ---------------------------------------------------------------
-- 1. Listas fixas: tipos de imóvel e bairros de Florianópolis
-- ---------------------------------------------------------------
-- Ficam vazias aqui: o conteúdo ainda está em Pendências (Etapa 4).
-- Item fora de uso não é apagado: vira ativo = false (os imóveis antigos continuam apontando para ele).

create table public.tipos_imovel (
  id    bigint generated always as identity primary key,
  nome  text not null unique,
  ativo boolean not null default true,
  constraint tipos_imovel_nome_tamanho check (char_length(btrim(nome)) between 2 and 60)
);

create table public.bairros (
  id    bigint generated always as identity primary key,
  nome  text not null unique,
  ativo boolean not null default true,
  constraint bairros_nome_tamanho check (char_length(btrim(nome)) between 2 and 80)
);

alter table public.tipos_imovel enable row level security;
alter table public.bairros enable row level security;

revoke all on table public.tipos_imovel, public.bairros from anon, authenticated;
grant select on table public.tipos_imovel, public.bairros to authenticated;
grant insert (nome, ativo), update (nome, ativo) on table public.tipos_imovel to authenticated;
grant insert (nome, ativo), update (nome, ativo) on table public.bairros to authenticated;

create policy "tipos_imovel: logado le" on public.tipos_imovel
  for select to authenticated using (true);
create policy "tipos_imovel: admin cria" on public.tipos_imovel
  for insert to authenticated with check ((select public.eh_admin()));
create policy "tipos_imovel: admin altera" on public.tipos_imovel
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy "bairros: logado le" on public.bairros
  for select to authenticated using (true);
create policy "bairros: admin cria" on public.bairros
  for insert to authenticated with check ((select public.eh_admin()));
create policy "bairros: admin altera" on public.bairros
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- ---------------------------------------------------------------
-- 2. Imóveis
-- ---------------------------------------------------------------

-- "em negociação" e "contrato em análise" não ficam guardados: são calculados
-- (tem_proposta_aceita, ligado na Etapa 8, e os contratos, na Etapa 9).
-- expirado = a exclusividade venceu sem renovação (Etapa 12).
create type public.status_imovel as enum (
  'pendente',
  'reprovado',
  'disponivel',
  'vendido',
  'expirado'
);

create table public.imoveis (
  id                   uuid primary key default gen_random_uuid(),
  proprietario_id      uuid not null default auth.uid() references public.perfis (id),
  captado_pelo_admin   boolean not null default false,

  -- Dados do RF07
  titulo               text not null,
  descricao            text not null default '',
  tipo_id              bigint not null references public.tipos_imovel (id),
  endereco             text not null,
  bairro_id            bigint not null references public.bairros (id),
  preco                numeric(14, 2) not null,
  quartos              smallint not null default 0,
  banheiros            smallint not null default 0,
  vagas                smallint not null default 0,
  area                 numeric(10, 2) not null,

  -- Escolha do proprietário, por imóvel (decisão de 22/10/2026)
  mostrar_contato      boolean not null default false,

  status               public.status_imovel not null default 'pendente',
  motivo_reprovacao    text,

  -- Termo de exclusividade: qual versão foi aceita e quando (o banco preenche a data).
  -- Imóvel captado pelo admin: o dono aceita no primeiro acesso (até lá, fica em branco).
  termo_versao         text,
  termo_aceito_em      timestamptz,

  -- Exclusividade: começa na aprovação (ou na captação) e dura 6 meses.
  -- O fim fica guardado para a renovação (Etapa 12) só empurrar a data.
  exclusividade_inicio timestamptz,
  exclusividade_fim    timestamptz,

  -- Ligado pelas propostas na Etapa 8. true = "em negociação" no catálogo.
  tem_proposta_aceita  boolean not null default false,

  -- Sobe a cada mudança de conteúdo (inclusive fotos). A aprovação confere este
  -- número para falhar se o imóvel mudou depois que o admin abriu a tela (RF14).
  versao               integer not null default 1,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint imoveis_titulo_tamanho check (char_length(btrim(titulo)) between 3 and 120),
  constraint imoveis_descricao_tamanho check (char_length(descricao) <= 5000),
  constraint imoveis_endereco_tamanho check (char_length(btrim(endereco)) between 3 and 200),
  constraint imoveis_preco_positivo check (preco > 0),
  constraint imoveis_area_positiva check (area > 0),
  constraint imoveis_comodos_validos check (
    quartos between 0 and 99 and banheiros between 0 and 99 and vagas between 0 and 99
  ),
  -- Imóvel do proprietário só existe com o termo aceito.
  constraint imoveis_termo_aceito check (
    captado_pelo_admin or (termo_versao is not null and termo_aceito_em is not null)
  ),
  -- Reprovado sempre tem motivo.
  constraint imoveis_reprovado_com_motivo check (
    status <> 'reprovado' or char_length(btrim(coalesce(motivo_reprovacao, ''))) > 0
  ),
  -- Imóvel que já passou pela aprovação tem a exclusividade marcada.
  constraint imoveis_exclusividade_marcada check (
    status in ('pendente', 'reprovado')
    or (exclusividade_inicio is not null and exclusividade_fim is not null)
  )
);

comment on table public.imoveis is
  'Imóveis. O contato do proprietário não fica aqui: só sai por contato_do_proprietario().';

create index imoveis_proprietario_idx on public.imoveis (proprietario_id);
create index imoveis_status_idx on public.imoveis (status);

alter table public.imoveis enable row level security;

-- ---------------------------------------------------------------
-- 3. Fotos e registro de edições
-- ---------------------------------------------------------------

create table public.fotos_imovel (
  id        uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis (id) on delete cascade,
  -- Caminho do arquivo no Supabase Storage (o bucket e as políticas vêm na Etapa 4).
  caminho   text not null unique,
  ordem     smallint not null,
  criado_em timestamptz not null default now(),

  -- Duas fotos não ocupam a mesma posição. "deferrable" deixa trocar a ordem de
  -- duas fotos na mesma operação.
  constraint fotos_imovel_ordem_unica unique (imovel_id, ordem) deferrable initially immediate,
  constraint fotos_imovel_ordem_valida check (ordem between 1 and 100)
);

create index fotos_imovel_imovel_idx on public.fotos_imovel (imovel_id);

alter table public.fotos_imovel enable row level security;

create table public.edicoes_imovel (
  id           bigint generated always as identity primary key,
  imovel_id    uuid not null references public.imoveis (id) on delete cascade,
  campo        text not null,
  valor_antigo text,
  valor_novo   text,
  editado_por  uuid references public.perfis (id) on delete set null,
  editado_em   timestamptz not null default now(),
  revisado_em  timestamptz,
  revisado_por uuid references public.perfis (id) on delete set null
);

create index edicoes_imovel_imovel_idx on public.edicoes_imovel (imovel_id);

alter table public.edicoes_imovel enable row level security;

-- ---------------------------------------------------------------
-- 4. Gatilhos: preenchimento automático, versão e registro de edições
-- ---------------------------------------------------------------

-- No cadastro pelo app, o banco preenche a data do aceite do termo. Os campos de
-- status, exclusividade e versão nem podem ser enviados (ver permissões abaixo).
create function public.preparar_novo_imovel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.termo_aceito_em := case when new.termo_versao is not null then now() end;
  end if;
  return new;
end;
$$;

create trigger preparar_novo_imovel
  before insert on public.imoveis
  for each row execute function public.preparar_novo_imovel();

-- Colunas de conteúdo: as que o proprietário edita e que ficam registradas.
-- Mudar qualquer uma sobe a versão.
create function public.subir_versao_do_imovel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['status', 'motivo_reprovacao', 'termo_versao', 'termo_aceito_em',
                             'exclusividade_inicio', 'exclusividade_fim', 'tem_proposta_aceita',
                             'versao', 'atualizado_em'])
     is distinct from
     (to_jsonb(old) - array['status', 'motivo_reprovacao', 'termo_versao', 'termo_aceito_em',
                             'exclusividade_inicio', 'exclusividade_fim', 'tem_proposta_aceita',
                             'versao', 'atualizado_em'])
  then
    new.versao := old.versao + 1;
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

create trigger subir_versao_do_imovel
  before update on public.imoveis
  for each row execute function public.subir_versao_do_imovel();

-- Registra cada campo alterado pelo proprietário num imóvel disponível (RNF11).
-- Edição do admin não é registrada. security definer porque o proprietário não
-- tem permissão de gravar direto em edicoes_imovel.
create function public.registrar_edicao_do_imovel()
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
    foreach v_campo in array array['titulo', 'descricao', 'tipo_id', 'endereco', 'bairro_id',
                                   'preco', 'quartos', 'banheiros', 'vagas', 'area',
                                   'mostrar_contato']
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

create trigger registrar_edicao_do_imovel
  after update on public.imoveis
  for each row execute function public.registrar_edicao_do_imovel();

-- Foto acrescentada, tirada ou trocada de posição: sobe a versão do imóvel e, se ele
-- está disponível e quem mexeu não é admin, registra a edição.
create function public.registrar_edicao_de_foto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imovel uuid := coalesce(new.imovel_id, old.imovel_id);
  v_status public.status_imovel;
begin
  update public.imoveis set versao = versao + 1, atualizado_em = now()
  where id = v_imovel
  returning status into v_status;

  if v_status = 'disponivel'
     and (select auth.uid()) is not null
     and not public.eh_admin()
  then
    insert into public.edicoes_imovel (imovel_id, campo, valor_antigo, valor_novo, editado_por)
    values (
      v_imovel,
      'fotos',
      case when tg_op in ('DELETE', 'UPDATE') then old.caminho || ' (posição ' || old.ordem || ')' end,
      case when tg_op in ('INSERT', 'UPDATE') then new.caminho || ' (posição ' || new.ordem || ')' end,
      (select auth.uid())
    );
  end if;
  return null;
end;
$$;

create trigger registrar_edicao_de_foto
  after insert or update or delete on public.fotos_imovel
  for each row execute function public.registrar_edicao_de_foto();

revoke execute on function public.preparar_novo_imovel() from public, anon, authenticated;
revoke execute on function public.subir_versao_do_imovel() from public, anon, authenticated;
revoke execute on function public.registrar_edicao_do_imovel() from public, anon, authenticated;
revoke execute on function public.registrar_edicao_de_foto() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 5. Funções de status (aprovar, reprovar, reenviar)
-- ---------------------------------------------------------------
-- O status não pode ser alterado direto pelo app: só por estas funções, que
-- conferem quem chama e em que situação o imóvel está.

-- Admin aprova o imóvel pendente, desde que ele não tenha mudado desde que a
-- tela foi aberta (p_versao é a versão que o admin viu). A exclusividade começa agora.
create function public.aprovar_imovel(p_imovel uuid, p_versao integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin aprova imóveis' using errcode = 'P0001';
  end if;

  update public.imoveis
  set status = 'disponivel',
      motivo_reprovacao = null,
      exclusividade_inicio = now(),
      exclusividade_fim = now() + interval '6 months'
  where id = p_imovel
    and status = 'pendente'
    and versao = p_versao;

  if not found then
    raise exception 'O imóvel mudou depois que a tela foi aberta, ou não está pendente. Abra de novo e confira.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- Admin reprova o imóvel pendente, com motivo (o proprietário vê).
create function public.reprovar_imovel(p_imovel uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin reprova imóveis' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_motivo, ''))) = 0 then
    raise exception 'Escreva o motivo da reprovação' using errcode = 'P0001';
  end if;

  update public.imoveis
  set status = 'reprovado', motivo_reprovacao = btrim(p_motivo)
  where id = p_imovel and status = 'pendente';

  if not found then
    raise exception 'Só imóvel pendente pode ser reprovado' using errcode = 'P0001';
  end if;
end;
$$;

-- Proprietário reenvia o imóvel reprovado para aprovação (passo explícito: editar
-- não reenvia sozinho).
create function public.reenviar_imovel(p_imovel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.imoveis
  set status = 'pendente', motivo_reprovacao = null
  where id = p_imovel
    and status = 'reprovado'
    and proprietario_id = (select auth.uid());

  if not found then
    raise exception 'Só o proprietário reenvia, e só imóvel reprovado' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.aprovar_imovel(uuid, integer) from public, anon;
revoke execute on function public.reprovar_imovel(uuid, text) from public, anon;
revoke execute on function public.reenviar_imovel(uuid) from public, anon;
grant execute on function public.aprovar_imovel(uuid, integer) to authenticated;
grant execute on function public.reprovar_imovel(uuid, text) to authenticated;
grant execute on function public.reenviar_imovel(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 6. Contato do proprietário (RNF06)
-- ---------------------------------------------------------------
-- Telefone e e-mail do dono do imóvel. Devolve uma linha só se:
-- - quem pergunta é assinante ativo, o imóvel está disponível e o proprietário
--   escolheu mostrar o contato nele; ou
-- - quem pergunta é o próprio dono ou o admin.
-- Em qualquer outro caso, não devolve nada (nem um erro que revele algo).
create function public.contato_do_proprietario(p_imovel uuid)
returns table (telefone text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.telefone, u.email::text
  from public.imoveis i
  join public.perfis p on p.id = i.proprietario_id
  join auth.users u on u.id = p.id
  where i.id = p_imovel
    and (
      (i.status = 'disponivel' and i.mostrar_contato and public.eh_assinante_ativo())
      or i.proprietario_id = (select auth.uid())
      or public.eh_admin()
    );
$$;

revoke execute on function public.contato_do_proprietario(uuid) from public, anon;
grant execute on function public.contato_do_proprietario(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 7. Permissões e políticas de RLS
-- ---------------------------------------------------------------

-- Imóveis: pelo app, só os campos de conteúdo (e a versão do termo, no cadastro).
-- status, exclusividade, captado_pelo_admin, versao e tem_proposta_aceita não
-- podem ser enviados nem alterados direto.
revoke all on table public.imoveis from anon, authenticated;
grant select, delete on table public.imoveis to authenticated;
grant insert (titulo, descricao, tipo_id, endereco, bairro_id, preco, quartos, banheiros,
              vagas, area, mostrar_contato, termo_versao)
  on table public.imoveis to authenticated;
grant update (titulo, descricao, tipo_id, endereco, bairro_id, preco, quartos, banheiros,
              vagas, area, mostrar_contato)
  on table public.imoveis to authenticated;

-- Quem vê: o dono, o assinante ativo (só disponível) e o admin.
create policy "imoveis: dono le os proprios"
  on public.imoveis for select to authenticated
  using (proprietario_id = (select auth.uid()));

create policy "imoveis: assinante ativo le os disponiveis"
  on public.imoveis for select to authenticated
  using (status = 'disponivel' and (select public.eh_assinante_ativo()));

create policy "imoveis: admin le todos"
  on public.imoveis for select to authenticated
  using ((select public.eh_admin()));

-- Cadastro: só proprietário, e só no próprio nome.
create policy "imoveis: proprietario cadastra"
  on public.imoveis for insert to authenticated
  with check (
    (select public.meu_tipo()) = 'proprietario'
    and proprietario_id = (select auth.uid())
  );

-- Edição: o dono, em imóvel reprovado ou disponível (pendente: ainda em aberto,
-- ver Pendências da Etapa 4). O admin edita qualquer um, sem registro.
create policy "imoveis: dono edita reprovado ou disponivel"
  on public.imoveis for update to authenticated
  using (proprietario_id = (select auth.uid()) and status in ('reprovado', 'disponivel'))
  with check (proprietario_id = (select auth.uid()) and status in ('reprovado', 'disponivel'));

create policy "imoveis: admin edita"
  on public.imoveis for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Apagar: o dono, só pendente ou reprovado (RF12). As fotos vão junto.
create policy "imoveis: dono apaga pendente ou reprovado"
  on public.imoveis for delete to authenticated
  using (proprietario_id = (select auth.uid()) and status in ('pendente', 'reprovado'));

-- Fotos: vê quem vê o imóvel (o RLS de imoveis vale dentro da consulta abaixo).
-- Mexe o dono (imóvel pendente, reprovado ou disponível) e o admin.
revoke all on table public.fotos_imovel from anon, authenticated;
grant select, delete on table public.fotos_imovel to authenticated;
grant insert (imovel_id, caminho, ordem), update (ordem) on table public.fotos_imovel to authenticated;

create policy "fotos_imovel: le quem ve o imovel"
  on public.fotos_imovel for select to authenticated
  using (exists (select 1 from public.imoveis i where i.id = imovel_id));

create policy "fotos_imovel: dono ou admin acrescenta"
  on public.fotos_imovel for insert to authenticated
  with check (
    (select public.eh_admin())
    or exists (select 1 from public.imoveis i
               where i.id = imovel_id
                 and i.proprietario_id = (select auth.uid())
                 and i.status in ('pendente', 'reprovado', 'disponivel'))
  );

create policy "fotos_imovel: dono ou admin muda a ordem"
  on public.fotos_imovel for update to authenticated
  using (
    (select public.eh_admin())
    or exists (select 1 from public.imoveis i
               where i.id = imovel_id
                 and i.proprietario_id = (select auth.uid())
                 and i.status in ('pendente', 'reprovado', 'disponivel'))
  );

create policy "fotos_imovel: dono ou admin tira"
  on public.fotos_imovel for delete to authenticated
  using (
    (select public.eh_admin())
    or exists (select 1 from public.imoveis i
               where i.id = imovel_id
                 and i.proprietario_id = (select auth.uid())
                 and i.status in ('pendente', 'reprovado', 'disponivel'))
  );

-- Registro de edições: só o admin lê e marca como revisado. Ninguém grava direto.
revoke all on table public.edicoes_imovel from anon, authenticated;
grant select on table public.edicoes_imovel to authenticated;
grant update (revisado_em, revisado_por) on table public.edicoes_imovel to authenticated;

create policy "edicoes_imovel: admin le"
  on public.edicoes_imovel for select to authenticated
  using ((select public.eh_admin()));

create policy "edicoes_imovel: admin marca como revisado"
  on public.edicoes_imovel for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));
