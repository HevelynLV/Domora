---
description: Atualiza o ROADMAP.md (e o README, se preciso) antes do push, para a próxima pessoa
---

Antes de eu dar `git push`, atualize o `ROADMAP.md` para a próxima pessoa. Durante a etapa, "Onde paramos" já é atualizado a cada passo (regra do `CLAUDE.md`); este comando é a atualização completa, no fim da etapa ou antes de qualquer push.

1. Rode `git fetch origin` e confira se a outra pessoa mudou algo: `git log HEAD..origin/main --oneline` (e, se esta branch já foi enviada, `git log HEAD..@{u} --oneline`). Se aparecer algum commit, pare e me avise antes de mexer no `ROADMAP.md`: primeiro é preciso trazer essas mudanças para a branch (`git merge origin/main` ou `git pull`). Não use só `git pull` numa branch que ainda não foi enviada: ele falha e não traz o que mudou na `main`.
2. Veja o que mudou: `git status`, `git log` (commits desde o último push, ou `git log main..HEAD` se a branch ainda não foi enviada) e o `git diff` correspondente.
3. Pergunte meu nome, se não souber (no projeto trabalham Hevelyn e Gabriel), e atualize **"Onde paramos"**:
   - data de hoje e meu nome
   - etapa atual e o passo do `docs/prompts.md` em que ela está
   - o que foi feito, em linguagem simples (sem jargão)
   - o próximo passo exato, específico o suficiente para alguém começar sem me perguntar nada
4. Atualize **"Pendências e decisões em aberto"**:
   - tire o que foi resolvido (decisão tomada também vai para "Decisões tomadas" na `docs/visao-geral.md`, com a data, e para o `CLAUDE.md`)
   - acrescente bugs conhecidos, itens da auditoria que ficaram para depois e decisões novas, sempre com a etapa em que precisam ser resolvidos; marque com **(banco)** o que muda tabelas ou status
5. Confira o que a outra pessoa vai precisar fazer no computador dela. Procure no diff desde o último push:
   - `process.env.` novos no código: variável nova no `.env.local` (e no `.env.example`, sem valor)
   - mudanças no `package.json`: pacote ou ferramenta nova (`npm install`)
   - arquivos novos em `supabase/migrations/`: migration nova
   Para cada item encontrado:
   - coloque no **"Atenção"** o que fazer, em passos
   - atualize o checklist "Como começar a trabalhar no PAUTA" do `README.md`, para quem chegar depois
   - migration nova entra na lista **"Migrations aplicadas no banco"**, mas só se `npx supabase migration list` mostrar que ela já está no banco (coluna Remote) e eu confirmar que o `testar_rls.sql` passou. Se não, pare e me avise em vez de listar
   - no "Atenção", deixe só o que é novo e a outra pessoa ainda não fez; o que já virou rotina fica só no README
6. Em **"Etapas do MVP"**, marque como `[x]` só a etapa que está funcionando, passou na auditoria (`/auditar-etapa`) e cumpre o "Pronto quando". Se estiver pela metade, deixe `[ ]` e explique em "Pendências".
7. Adicione uma linha no **"Histórico"**: data, nome e o que foi feito.
8. Me mostre as mudanças no `ROADMAP.md` (e no `README.md`, na `docs/visao-geral.md` e no `CLAUDE.md`, se mexeu neles) e espere eu aprovar antes de fazer o commit.
9. Depois de aprovado, faça o commit com a mensagem `docs: atualiza roadmap` e me diga o comando de push e, se for o fim da etapa, o texto do Pull Request.
