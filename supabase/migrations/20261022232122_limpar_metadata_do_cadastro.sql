-- Etapa 3, passo 3.2a (correção): a limpeza do metadata no gatilho de cadastro
-- (migration 20261022231442) não basta.
--
-- Por quê: logo depois de criar a conta, o Supabase Auth regrava raw_user_meta_data
-- com a cópia que tem na memória (mais sub, email e email_verified), desfazendo a
-- limpeza. Visto num signUp real em 22/10/2026.
--
-- Correção: antes de toda gravação em auth.users, as chaves que o cadastro copia
-- para perfis e assinantes saem do metadata. Vale para a regravação do Auth e para
-- um updateUser({ data }) feito pelo próprio usuário depois.
-- O primeiro token, devolvido pelo signUp, ainda leva esses dados (o Auth monta o
-- token com a cópia da memória); a partir da renovação da sessão, ele sai limpo.
-- O app nunca lê o tipo no token: lê em perfis.

create function public.limpar_metadata_do_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.raw_user_meta_data := new.raw_user_meta_data
    - array['tipo', 'nome', 'telefone', 'creci', 'nome_imobiliaria', 'convite'];
  return new;
end;
$$;

revoke execute on function public.limpar_metadata_do_cadastro() from public, anon, authenticated;

create trigger limpar_metadata_do_cadastro
  before update of raw_user_meta_data on auth.users
  for each row
  when (new.raw_user_meta_data ?| array['tipo', 'nome', 'telefone', 'creci', 'nome_imobiliaria', 'convite'])
  execute function public.limpar_metadata_do_cadastro();
