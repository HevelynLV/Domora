-- Etapa 3, passo 3.2a: ajustes do banco para o cadastro pelo app.
--
-- Por quê:
-- - O Supabase Auth não repassa ao app o código do erro do gatilho de cadastro
--   (CRECI repetido e convite inválido chegam iguais: "Database error saving new
--   user", confirmado com um signUp real em 22/10/2026). Por isso o app pergunta
--   antes, com creci_disponivel() e convite_valido(), que respondem só sim ou não.
--   O unique e as checagens do gatilho continuam como última barreira.
-- - "12.345-J", "12345J" e "12345-J SC" eram CRECIs diferentes. Agora o unique vale
--   para o CRECI normalizado (só letras e números, sem "CRECI" e sem a UF SC, que é
--   fixa no piloto). A coluna creci continua com o que a pessoa digitou.
-- - O gatilho de cadastro passa a apagar de raw_user_meta_data os dados que ele
--   copia para perfis e assinantes (e o código do convite). Essa cópia ia no token
--   e o próprio usuário consegue alterá-la; o app lê o tipo só em perfis.

-- ---------------------------------------------------------------
-- 1. CRECI normalizado
-- ---------------------------------------------------------------
create function public.normalizar_creci(p_creci text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(upper(coalesce(p_creci, '')), '[^A-Z0-9]', '', 'g'),
               '^CRECI', ''),
             '^SC', ''),
           'SC$', '');
$$;

comment on function public.normalizar_creci(text) is
  'CRECI só com letras e números, sem "CRECI" e sem a UF SC: "CRECI/SC 12.345-J" vira "12345J".';

alter table public.assinantes
  add column creci_normalizado text
  generated always as (public.normalizar_creci(creci)) stored;

alter table public.assinantes drop constraint assinantes_creci_unico;

alter table public.assinantes
  add constraint assinantes_creci_normalizado_unico unique (creci_normalizado),
  add constraint assinantes_creci_normalizado_formato check (creci_normalizado ~ '^[A-Z0-9]{3,}$');

-- ---------------------------------------------------------------
-- 2. Perguntas do cadastro (antes de criar a conta)
-- ---------------------------------------------------------------
-- Respondem só sim ou não e não devolvem dado nenhum. Podem ser chamadas sem
-- login, porque o cadastro acontece antes do login.

create function public.creci_disponivel(p_creci text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.normalizar_creci(p_creci) <> ''
     and not exists (
       select 1 from public.assinantes a
       where a.creci_normalizado = public.normalizar_creci(p_creci)
     );
$$;

-- Mesmas condições que o gatilho de cadastro confere no convite.
create function public.convite_valido(p_codigo text, p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.convites c
    join public.assinantes a on a.id = c.assinante_id
    where c.token_hash = encode(sha256(convert_to(coalesce(p_codigo, ''), 'UTF8')), 'hex')
      and c.usado_em is null
      and c.expira_em > now()
      and a.tipo = 'imobiliaria'
      and a.status = 'ativo'
      and not a.bloqueado_pelo_admin
      and (c.email is null or lower(c.email) = lower(coalesce(p_email, '')))
  );
$$;

revoke execute on function public.creci_disponivel(text) from public;
revoke execute on function public.convite_valido(text, text) from public;
grant execute on function public.creci_disponivel(text) to anon, authenticated;
grant execute on function public.convite_valido(text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- 3. Cadastro: apaga do metadata o que foi copiado
-- ---------------------------------------------------------------
-- Igual à função do passo 2.7, com a limpeza de raw_user_meta_data no fim.

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

  -- O que foi copiado para perfis e assinantes sai do metadata (e do token).
  update auth.users
  set raw_user_meta_data = raw_user_meta_data
        - array['tipo', 'nome', 'telefone', 'creci', 'nome_imobiliaria', 'convite']
  where id = new.id;

  return new;
end;
$$;
