-- Torna admin uma conta que já existe (RNF03: ninguém vira admin pelo app).
--
-- Como usar:
--   1. A pessoa se cadastra pelo app como PROPRIETÁRIO (/cadastro), com o e-mail
--      que vai usar como admin.
--   2. No painel do Supabase, abra o SQL Editor, cole este arquivo, troque
--      <email> pelo e-mail da conta (só na tela, nunca salve o e-mail aqui) e
--      clique em Run.
--   3. O resultado mostra a conta com tipo "admin". Se não mostrar nenhuma linha,
--      o e-mail está errado ou a conta não é de proprietário.
--
-- Só vale para proprietário: imobiliária, autônomo e corretor têm assinatura
-- ligada ao perfil e não podem virar admin.
-- O SQL Editor roda como dono do banco. Pelo app, quem está logado só pode
-- mudar nome e telefone do perfil (permissão por coluna), nunca o tipo.

update public.perfis p
set tipo = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('<email>')
  and p.tipo = 'proprietario'
returning p.id, u.email, p.nome, p.tipo;
