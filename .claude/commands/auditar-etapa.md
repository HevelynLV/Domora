---
description: Audita a etapa N do PAUTA contra os requisitos e o CLAUDE.md, sem corrigir nada
argument-hint: <número da etapa>
---

Use a skill requesting-code-review do Superpowers para auditar a Etapa $ARGUMENTS do PAUTA.

Esta auditoria precisa rodar numa sessão nova (`/clear` ou outro terminal), sem as suposições de quem escreveu o código. Se esta conversa já escreveu código da etapa, avise e peça para eu abrir uma sessão nova antes de continuar.

## Antes de começar, leia

1. `CLAUDE.md` inteiro (regras do negócio, decisões tomadas e regras do repositório)
2. "Onde paramos", "Pendências" e "Atenção" no `ROADMAP.md`, e o "Pronto quando" da Etapa $ARGUMENTS
3. Em `docs/prompts.md`, os passos da Etapa $ARGUMENTS: o passo de abertura diz quais RFs e RNFs a etapa cobre e quais telas do protótipo ela segue
4. Esses RFs e RNFs na `docs/visao-geral.md`
5. O que mudou na etapa: `git log main..HEAD` e `git diff main...HEAD`

## Verifique

1. **Pronto quando.** A etapa cumpre o "Pronto quando" do `ROADMAP.md`? Para cada item, rode o teste ou me diga exatamente como testar. Não aceite "deve funcionar": quero evidência (saída de comando, teste que passou, tela).
2. **Requisitos.** Cada RF e RNF da etapa está feito por inteiro? O que ficou de fora está em "Pendências" no `ROADMAP.md`?
3. **Regras do negócio do PAUTA** que a etapa toca (do `CLAUDE.md` e da Visão geral). Em especial:
   - o contato do proprietário só chega a um corretor se ele escolheu mostrar, nem pela API nem na resposta de rede
   - só imóveis aprovados aparecem no catálogo, e só assinantes ativos veem o catálogo
   - o corretor vê só "disponível" ou "em negociação"; pendente, reprovado e contrato em análise são só do proprietário e do admin
   - contrato só a partir de proposta já aceita; aprovar o contrato faz tudo numa operação só (vendido, sai do catálogo, outras propostas recusadas)
   - contrato visto só pelo corretor que enviou, pelo proprietário do imóvel e pelo admin
   - ninguém vira admin pelo app, nem mudando a requisição
   - nenhum valor que ainda é decisão em aberto foi inventado no código
4. **Segurança.**
   - toda página de área e toda Server Action chama `exigirTipo()` no início (exceções: as listadas no `CLAUDE.md`); webhooks conferem a assinatura ou o token antes de qualquer coisa
   - toda tabela nova tem RLS ligado e políticas que barram quem não deve ler ou escrever; RLS não esconde coluna, então confira como os campos sensíveis ficam de fora
   - a chave secreta do Supabase (e as do Asaas e do WhatsApp) não tem `NEXT_PUBLIC_`, não aparece em `src/` e não vai para o navegador
   - todo dado que vem de formulário, URL ou cabeçalho é validado no servidor
   - Server Actions devolvem só o que a tela precisa, não a linha inteira do banco
   - Next.js 16: código que lê a sessão importa `server-only` ou fica num arquivo que importa; nada de `"use cache"` em dado de um usuário específico sem a chave do usuário; leitura de cookies dentro de `<Suspense>`, nunca no topo de um layout
   - fotos e PDFs vão direto do navegador para o Supabase Storage (não passam por Server Action), com tipo e tamanho conferidos
5. **Banco de dados.**
   - toda mudança no banco está num arquivo em `supabase/migrations/`; nenhuma migration que já foi aplicada foi editada (correção é migration nova)
   - `npx supabase migration list`: toda migration local aparece como aplicada no banco (coluna Remote)
   - o `supabase/testes/testar_rls.sql` cobre as tabelas novas, testa também o que deve ser BARRADO, e cada teste cria e apaga os próprios dados
6. **Testes.** `npm run lint`, `npm run build` e `npm run test:e2e` passam? Os testes Playwright conferem também o que deve ser barrado (outro tipo de usuário, usuário sem permissão, endereço digitado direto)?
7. **Casos de erro.** Dados inválidos, upload que falha, usuário sem permissão, sessão vencida, conexão caindo, clique duplo em botão que grava.
8. **Telas.** Seguem o layout da tela correspondente em `docs/prototipo/`? Funcionam no celular (390 px de largura) e no computador? Todo texto em português?
9. **Organização.** Código duplicado, arquivo no lugar errado, nome confuso, algo que vai atrapalhar as próximas etapas.

## Entregue

1. Uma tabela com: problema, gravidade (**crítico**, **importante** ou **melhoria**), arquivo e linha, e como corrigir. Crítico é o que vaza dado, deixa alguém fazer o que não pode ou quebra o "Pronto quando".
2. O "Pronto quando" item por item, com a evidência de cada um.
3. O que você não conseguiu verificar e por quê.

**NÃO corrija nada.** Espere eu escolher o que corrigir e o que vai para "Pendências".
