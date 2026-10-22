-- Etapa 2, passo 2.3: assinantes (imobiliária ou corretor autônomo) e convites.
--
-- Regras desta migration (ver CLAUDE.md e docs/visao-geral.md, decisões de 22/10/2026):
-- - Assinante é quem paga a mensalidade: a imobiliária OU o corretor autônomo.
--   O CRECI não repete entre nenhum deles e o status da assinatura fica num lugar só.
-- - O corretor convidado não tem status próprio: segue o da imobiliária. Se ela for
--   bloqueada ou vencer, ele perde o acesso na hora.
-- - Só o admin muda o status pelo app. Ele não marca "vencido" (isso é do pagamento,
--   Etapa 11) nem passa um vencido para ativo (só o pagamento libera).
-- - Excluir a imobiliária pendente (RF16): apagar a conta do responsável apaga o
--   assinante junto e libera o CRECI. Só vale para assinante pendente e sem corretores.
-- - Convite: só o responsável de imobiliária ativa cria; o código fica guardado só
--   embaralhado (hash), vale uma vez e vence (padrão: 7 dias, ajustável na Etapa 5).

-- ---------------------------------------------------------------
-- 1. Assinantes
-- ---------------------------------------------------------------

create type public.tipo_assinante as enum ('imobiliaria', 'autonomo');

create table public.assinantes (
  id             uuid primary key default gen_random_uuid(),
  tipo           public.tipo_assinante not null,
  -- Imobiliária: o nome dela. Autônomo: o nome do corretor.
  nome           text not null,
  -- Guardado padronizado (maiúsculas, sem espaços) pelo gatilho de cadastro.
  creci          text not null,
  -- Quem criou a conta: o responsável pela imobiliária ou o próprio autônomo.
  -- Apagar a conta dele apaga o assinante (RF16). A checagem fica para o fim da
  -- transação porque, no cadastro, o assinante nasce um instante antes do perfil.
  responsavel_id uuid not null unique
                 references public.perfis (id) on delete cascade
                 deferrable initially deferred,
  status         public.status_assinatura not null default 'pendente',
  criado_em      timestamptz not null default now(),

  constraint assinantes_creci_unico unique (creci),
  constraint assinantes_nome_tamanho check (char_length(btrim(nome)) between 2 and 120),
  constraint assinantes_creci_formato check (creci ~ '^[A-Z0-9/.-]{4,30}$')
);

comment on table public.assinantes is
  'Quem paga a mensalidade: imobiliária ou corretor autônomo. O status vale também para os corretores convidados.';

alter table public.assinantes enable row level security;

-- Perfil de assinante aponta para o assinante: o responsável e o autônomo para o
-- próprio; o corretor convidado para o da imobiliária. Os outros tipos, para nenhum.
alter table public.perfis
  add column assinante_id uuid references public.assinantes (id);

alter table public.perfis
  add constraint perfis_assinante_conforme_tipo
  check ((tipo in ('imobiliaria', 'corretor', 'autonomo')) = (assinante_id is not null));

-- ---------------------------------------------------------------
-- 2. Convites
-- ---------------------------------------------------------------

create table public.convites (
  id           uuid primary key default gen_random_uuid(),
  assinante_id uuid not null references public.assinantes (id) on delete cascade,
  -- Opcional: convite por link não tem e-mail. Se tiver, só esse e-mail usa.
  email        text,
  -- sha256 do código do convite, em hexadecimal. O código em si nunca fica no banco.
  token_hash   text not null unique,
  criado_por   uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '7 days',
  usado_em     timestamptz,
  usado_por    uuid references public.perfis (id) on delete set null,

  constraint convites_token_hash_formato check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint convites_email_formato check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table public.convites is
  'Convites da imobiliária para corretores. Guarda só o hash do código; vale uma vez e vence.';

alter table public.convites enable row level security;

-- ---------------------------------------------------------------
-- 3. Funções auxiliares de RLS
-- ---------------------------------------------------------------

-- O assinante do usuário logado (o próprio ou o da imobiliária dele).
create function public.meu_assinante_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.assinante_id from public.perfis p where p.id = (select auth.uid());
$$;

-- O usuário logado é assinante com acesso liberado? (imobiliária, corretor ou
-- autônomo, com a assinatura ativa). É o que protege o catálogo.
create function public.eh_assinante_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis p
    join public.assinantes a on a.id = p.assinante_id
    where p.id = (select auth.uid())
      and a.status = 'ativo'
  );
$$;

revoke execute on function public.meu_assinante_id() from public, anon;
revoke execute on function public.eh_assinante_ativo() from public, anon;
grant execute on function public.meu_assinante_id() to authenticated;
grant execute on function public.eh_assinante_ativo() to authenticated;

-- ---------------------------------------------------------------
-- 4. Regras de status e de exclusão do assinante
-- ---------------------------------------------------------------

-- Pelo app (papel authenticated, ou seja, o admin pela tela), o status só pode
-- ir para ativo ou bloqueado, e um vencido não volta para ativo sem pagar.
-- O webhook do Asaas (Etapa 11) usa outro papel e não passa por esta regra.
create function public.conferir_mudanca_de_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and current_user = 'authenticated' then
    if new.status not in ('ativo', 'bloqueado') then
      raise exception 'O status % não pode ser definido pelo app', new.status
        using errcode = 'P0001';
    end if;
    if old.status = 'vencido' and new.status = 'ativo' then
      raise exception 'Assinante com pagamento vencido só volta a ativo pelo pagamento'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger conferir_mudanca_de_status
  before update of status on public.assinantes
  for each row execute function public.conferir_mudanca_de_status();

-- Só assinante pendente pode ser excluído (RF16). Um ativo, bloqueado ou vencido
-- tem histórico (imóveis trabalhados, propostas, cobranças) e não some assim.
create function public.conferir_exclusao_de_assinante()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pendente' then
    raise exception 'Só assinante pendente pode ser excluído (status atual: %)', old.status
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger conferir_exclusao_de_assinante
  before delete on public.assinantes
  for each row execute function public.conferir_exclusao_de_assinante();

revoke execute on function public.conferir_mudanca_de_status() from public, anon, authenticated;
revoke execute on function public.conferir_exclusao_de_assinante() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 5. Cadastro: agora também imobiliária, autônomo e corretor por convite
-- ---------------------------------------------------------------
-- Substitui a função do passo 2.2 (o gatilho continua o mesmo).
-- Dados esperados em raw_user_meta_data (options.data do signUp):
--   todos:        tipo, nome, telefone
--   imobiliaria:  nome_imobiliaria, creci
--   autonomo:     creci
--   corretor:     convite (o código recebido no link)

create or replace function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo      text := new.raw_user_meta_data ->> 'tipo';
  v_nome      text := btrim(coalesce(new.raw_user_meta_data ->> 'nome', ''));
  v_telefone  text := coalesce(new.raw_user_meta_data ->> 'telefone', '');
  v_creci     text := upper(regexp_replace(coalesce(new.raw_user_meta_data ->> 'creci', ''), '\s', '', 'g'));
  v_convite   text := coalesce(new.raw_user_meta_data ->> 'convite', '');
  v_assinante uuid;
  v_convite_id uuid;
begin
  -- Telefone: só números e sem o 0 da frente (aceita "0 48 9...").
  v_telefone := regexp_replace(v_telefone, '\D', '', 'g');
  v_telefone := regexp_replace(v_telefone, '^0+', '');

  if v_tipo = 'proprietario' then
    null;

  elsif v_tipo = 'imobiliaria' then
    if v_creci = '' then
      raise exception 'O CRECI da imobiliária é obrigatório' using errcode = 'P0001';
    end if;
    insert into public.assinantes (tipo, nome, creci, responsavel_id)
    values ('imobiliaria', btrim(coalesce(new.raw_user_meta_data ->> 'nome_imobiliaria', '')),
            v_creci, new.id)
    returning id into v_assinante;

  elsif v_tipo = 'autonomo' then
    if v_creci = '' then
      raise exception 'O CRECI do corretor autônomo é obrigatório' using errcode = 'P0001';
    end if;
    insert into public.assinantes (tipo, nome, creci, responsavel_id)
    values ('autonomo', v_nome, v_creci, new.id)
    returning id into v_assinante;

  elsif v_tipo = 'corretor' then
    -- O convite tem que existir, não ter sido usado, estar na validade, ser de
    -- imobiliária ativa e, se tiver e-mail, ser o mesmo e-mail do cadastro.
    -- "for update" trava o convite: dois cadastros ao mesmo tempo não usam o mesmo.
    select c.id, c.assinante_id into v_convite_id, v_assinante
    from public.convites c
    join public.assinantes a on a.id = c.assinante_id
    where c.token_hash = encode(sha256(convert_to(v_convite, 'UTF8')), 'hex')
      and c.usado_em is null
      and c.expira_em > now()
      and a.tipo = 'imobiliaria'
      and a.status = 'ativo'
      and (c.email is null or lower(c.email) = lower(new.email))
    for update of c;

    if v_convite_id is null then
      raise exception 'Convite inválido, vencido ou já usado' using errcode = 'P0001';
    end if;

  else
    -- admin nunca; qualquer outro valor também não.
    raise exception 'Tipo de cadastro não permitido: %', coalesce(v_tipo, '(vazio)')
      using errcode = 'P0001';
  end if;

  insert into public.perfis (id, tipo, nome, telefone, assinante_id)
  values (new.id, v_tipo::public.tipo_usuario, v_nome, v_telefone, v_assinante);

  if v_convite_id is not null then
    update public.convites
    set usado_em = now(), usado_por = new.id
    where id = v_convite_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 6. Permissões e políticas de RLS
-- ---------------------------------------------------------------

-- Assinantes: ninguém cria nem apaga pelo app (cria o gatilho de cadastro;
-- apaga a exclusão da conta do responsável). Pelo app, só o status muda,
-- e só pelo admin.
revoke all on table public.assinantes from anon, authenticated;
grant select on table public.assinantes to authenticated;
grant update (status) on table public.assinantes to authenticated;

-- Lê o próprio assinante (o responsável, o autônomo e os corretores da
-- imobiliária); o admin lê todos.
create policy "assinantes: ler o proprio ou admin"
  on public.assinantes
  for select
  to authenticated
  using (id = (select public.meu_assinante_id()) or (select public.eh_admin()));

-- Só o admin muda o status (e a regra do item 4 limita para qual).
create policy "assinantes: admin altera o status"
  on public.assinantes
  for update
  to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Convites: o responsável cria e cancela os da própria imobiliária ativa.
-- usado_em e usado_por só mudam pelo gatilho de cadastro.
revoke all on table public.convites from anon, authenticated;
grant select, delete on table public.convites to authenticated;
grant insert (assinante_id, email, token_hash) on table public.convites to authenticated;

create policy "convites: responsavel ou admin le"
  on public.convites
  for select
  to authenticated
  using (
    (select public.eh_admin())
    or ((select public.meu_tipo()) = 'imobiliaria'
        and assinante_id = (select public.meu_assinante_id()))
  );

create policy "convites: responsavel de imobiliaria ativa cria"
  on public.convites
  for insert
  to authenticated
  with check (
    (select public.meu_tipo()) = 'imobiliaria'
    and assinante_id = (select public.meu_assinante_id())
    and (select public.eh_assinante_ativo())
    and criado_por = (select auth.uid())
  );

create policy "convites: responsavel cancela convite nao usado"
  on public.convites
  for delete
  to authenticated
  using (
    (select public.meu_tipo()) = 'imobiliaria'
    and assinante_id = (select public.meu_assinante_id())
    and usado_em is null
  );
