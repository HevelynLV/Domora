-- Etapa 2, passo 2.2: tipos, perfis e funções auxiliares de RLS.
--
-- Regras desta migration (ver CLAUDE.md e docs/visao-geral.md):
-- - Cada conta do Supabase Auth tem um perfil, criado pelo próprio banco no cadastro.
-- - O tipo do usuário é definido só pelo banco: ninguém vira admin pelo app (RNF03).
--   Nesta migration o cadastro aceita só "proprietario". Imobiliária e corretor
--   autônomo (que precisam de CRECI e da tabela assinantes) entram no passo 2.3;
--   corretor de imobiliária, só por convite (2.3); admin, nunca pelo app.
-- - Cada pessoa lê só o próprio perfil; o admin lê todos.
-- - Pelo app, só nome e telefone podem ser alterados.

-- ---------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------

-- imobiliaria = responsável pela imobiliária; corretor = entrou por convite;
-- autonomo = corretor autônomo, assina sem imobiliária.
create type public.tipo_usuario as enum (
  'proprietario',
  'imobiliaria',
  'corretor',
  'autonomo',
  'admin'
);

-- bloqueado = decisão do admin; vencido = pagamento atrasado no Asaas.
-- Desbloquear não libera um vencido: só o pagamento libera (decisão de 22/10/2026).
-- Usado pela tabela assinantes (passo 2.3).
create type public.status_assinatura as enum (
  'pendente',
  'ativo',
  'bloqueado',
  'vencido'
);

-- ---------------------------------------------------------------
-- 2. Perfis
-- ---------------------------------------------------------------

create table public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  tipo      public.tipo_usuario not null,
  nome      text not null,
  -- Só números: DDD (dois dígitos de 1 a 9) + número de 8 ou 9 dígitos.
  telefone  text not null,
  criado_em timestamptz not null default now(),

  constraint perfis_nome_tamanho check (char_length(btrim(nome)) between 2 and 120),
  constraint perfis_telefone_formato check (telefone ~ '^[1-9]{2}[0-9]{8,9}$')
);

comment on table public.perfis is
  'Um perfil por conta do Supabase Auth. O tipo é definido pelo banco e não muda pelo app.';

alter table public.perfis enable row level security;

-- ---------------------------------------------------------------
-- 3. Funções auxiliares de RLS
-- ---------------------------------------------------------------
-- security definer: rodam com a permissão de quem criou a função e por isso
-- leem a tabela perfis sem passar pelo RLS. Sem isso, a política de perfis,
-- que chama eh_admin(), chamaria a si mesma sem parar.
-- search_path vazio: a função só enxerga o que tem o schema escrito (public.),
-- para ninguém conseguir trocar uma tabela por outra com o mesmo nome.

create function public.meu_tipo()
returns public.tipo_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.tipo from public.perfis p where p.id = (select auth.uid());
$$;

create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.meu_tipo() = 'admin', false);
$$;

-- Só quem está logado pode chamar.
revoke execute on function public.meu_tipo() from public, anon;
revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.meu_tipo() to authenticated;
grant execute on function public.eh_admin() to authenticated;

-- ---------------------------------------------------------------
-- 4. Criação do perfil no cadastro
-- ---------------------------------------------------------------
-- O app envia tipo, nome e telefone no cadastro (options.data do signUp),
-- que chegam aqui em raw_user_meta_data. Se algo estiver errado, o cadastro
-- inteiro falha e nenhuma conta é criada.

create function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo     text := new.raw_user_meta_data ->> 'tipo';
  v_nome     text := btrim(coalesce(new.raw_user_meta_data ->> 'nome', ''));
  v_telefone text := coalesce(new.raw_user_meta_data ->> 'telefone', '');
begin
  -- Só proprietário por enquanto (imobiliária e autônomo: passo 2.3).
  if v_tipo is distinct from 'proprietario' then
    raise exception 'Tipo de cadastro não permitido: %', coalesce(v_tipo, '(vazio)')
      using errcode = 'P0001';
  end if;

  -- Telefone: só números e sem o 0 da frente (aceita "0 48 9...").
  v_telefone := regexp_replace(v_telefone, '\D', '', 'g');
  v_telefone := regexp_replace(v_telefone, '^0+', '');

  insert into public.perfis (id, tipo, nome, telefone)
  values (new.id, v_tipo::public.tipo_usuario, v_nome, v_telefone);

  return new;
end;
$$;

-- Função de gatilho: ninguém chama direto.
revoke execute on function public.criar_perfil_no_cadastro() from public, anon, authenticated;

create trigger criar_perfil_no_cadastro
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();

-- ---------------------------------------------------------------
-- 5. Permissões e políticas de RLS
-- ---------------------------------------------------------------
-- Para o banco, todo usuário logado é o mesmo papel (authenticated). As
-- permissões abaixo valem para todos; o RLS escolhe QUAIS LINHAS cada um vê.

-- Ninguém de fora (anon) acessa perfis. Logado: lê e altera só nome e telefone.
-- Não há permissão de insert (só o gatilho cria) nem de delete (apagar a conta
-- apaga o perfil junto). A coluna tipo não pode ser alterada pelo app (RNF03).
revoke all on table public.perfis from anon, authenticated;
grant select on table public.perfis to authenticated;
grant update (nome, telefone) on table public.perfis to authenticated;

-- Lê o próprio perfil; o admin lê todos.
create policy "perfis: ler o proprio ou admin"
  on public.perfis
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()));

-- Altera só o próprio perfil (e, pelas permissões acima, só nome e telefone).
create policy "perfis: alterar o proprio"
  on public.perfis
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
