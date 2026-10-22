-- Etapa 2, passo 2.7 (correção da auditoria, item 1): bloqueio do admin separado
-- da situação do pagamento.
--
-- Antes, "bloqueado" era um valor do status, junto com "vencido". Com isso, o admin
-- tirava alguém do vencido sem pagamento: vencido → bloqueado → ativo.
-- Agora são duas coisas independentes:
-- - status (pendente, ativo, vencido): a situação da assinatura. Pelo app, o admin
--   só ativa um pendente; ativo ↔ vencido é do pagamento (webhook do Asaas, Etapa 11).
-- - bloqueado_pelo_admin: decisão do admin, liga e desliga sem mexer no status.
-- O acesso exige as duas: status ativo E não bloqueado. Desbloquear um vencido não
-- libera nada, porque o status continua vencido (decisão de 22/10/2026).

-- ---------------------------------------------------------------
-- 1. Coluna do bloqueio
-- ---------------------------------------------------------------

alter table public.assinantes
  add column bloqueado_pelo_admin boolean not null default false;

-- O gatilho de status depende da coluna status e sai antes da troca do tipo
-- (volta no item 3).
drop trigger conferir_mudanca_de_status on public.assinantes;

-- Quem estava bloqueado continua bloqueado (a tabela deve estar vazia, mas por garantia).
update public.assinantes
set bloqueado_pelo_admin = true, status = 'ativo'
where status = 'bloqueado';

-- ---------------------------------------------------------------
-- 2. Status sem "bloqueado"
-- ---------------------------------------------------------------
-- O Postgres não tira um valor de um enum: o tipo é criado de novo, com o mesmo nome.

alter type public.status_assinatura rename to status_assinatura_antigo;

create type public.status_assinatura as enum (
  'pendente',
  'ativo',
  'vencido'
);

alter table public.assinantes alter column status drop default;
alter table public.assinantes
  alter column status type public.status_assinatura
  using status::text::public.status_assinatura;
alter table public.assinantes alter column status set default 'pendente';

drop type public.status_assinatura_antigo;

comment on column public.assinantes.status is
  'Situação da assinatura: pendente (até o admin ativar), ativo ou vencido (pagamento atrasado). Só o pagamento tira do vencido.';
comment on column public.assinantes.bloqueado_pelo_admin is
  'Decisão do admin, independente do pagamento. Bloqueado não tem acesso, nem os corretores da imobiliária.';

-- ---------------------------------------------------------------
-- 3. Regra de mudança de status
-- ---------------------------------------------------------------
-- Pelo app (papel authenticated, ou seja, o admin pela tela), o status só muda de
-- pendente para ativo. ativo ↔ vencido é do webhook do Asaas (Etapa 11), que usa
-- outro papel e não passa por esta regra. O bloqueio é a outra coluna.

create or replace function public.conferir_mudanca_de_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and current_user = 'authenticated' then
    if not (old.status = 'pendente' and new.status = 'ativo') then
      raise exception 'Pelo app, o status só muda de pendente para ativo (de % para % não pode)',
        old.status, new.status
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.conferir_mudanca_de_status() from public, anon, authenticated;

create trigger conferir_mudanca_de_status
  before update of status on public.assinantes
  for each row execute function public.conferir_mudanca_de_status();

-- O admin liga e desliga o bloqueio (a política "assinantes: admin altera o status"
-- já deixa só o admin alterar a linha).
grant update (bloqueado_pelo_admin) on table public.assinantes to authenticated;

-- ---------------------------------------------------------------
-- 4. Acesso: status ativo e não bloqueado
-- ---------------------------------------------------------------

create or replace function public.eh_assinante_ativo()
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
      and not a.bloqueado_pelo_admin
  );
$$;

-- ---------------------------------------------------------------
-- 5. Cadastro: convite só de imobiliária ativa e não bloqueada
-- ---------------------------------------------------------------
-- Igual à função do passo 2.3, com "and not a.bloqueado_pelo_admin" na busca do convite.

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
    -- imobiliária ativa e não bloqueada e, se tiver e-mail, ser o mesmo e-mail do cadastro.
    -- "for update" trava o convite: dois cadastros ao mesmo tempo não usam o mesmo.
    select c.id, c.assinante_id into v_convite_id, v_assinante
    from public.convites c
    join public.assinantes a on a.id = c.assinante_id
    where c.token_hash = encode(sha256(convert_to(v_convite, 'UTF8')), 'hex')
      and c.usado_em is null
      and c.expira_em > now()
      and a.tipo = 'imobiliaria'
      and a.status = 'ativo'
      and not a.bloqueado_pelo_admin
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
