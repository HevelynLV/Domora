# PAUTA — Roadmap

## Onde paramos

Última atualização: 20/10/2026 · por Hevelyn
Etapa atual: 1. Setup, na branch `etapa-1-setup` (passos 1.1 a 1.5 feitos; próximo: 1.6)

O que aconteceu (replanejamento de 13 e 14/10/2026 e troca de nome em 16/10/2026):
- O projeto antigo se chamava **Captador** (repositório `HevelynLV/imobilink`, pasta local `capimoveis`). Ele chegou até a Etapa 3 (login e perfis), mas o modelo de negócio mudou tanto que vamos recomeçar do zero
- No replanejamento, o app passou a se chamar Domora e, em 16/10/2026, **PAUTA**. O produto inteiro foi redefinido: ideia, diferencial, usuários, 32 requisitos funcionais, 16 não funcionais e 14 etapas. Tudo está em `docs/visao-geral.md`, que é a fonte da verdade do projeto
- As mudanças que mais pesam em relação ao Captador: não existe mais reserva (vários corretores trabalham o mesmo imóvel ao mesmo tempo); a exclusividade é de 6 meses, com aviso e renovação; o proprietário confirma as visitas, aceita várias propostas e vê os dados do corretor; o contrato é assinado fora do app e o admin confere o PDF; a receita é mensalidade (Asaas) mais uma % da comissão; os avisos saem por WhatsApp; corretores entram por convite da imobiliária; corretor autônomo pode assinar; o piloto é em Florianópolis

Etapa 0 (concluída em 20/10/2026):
- O protótipo **"PAUTA — Protótipo"** (https://claude.ai/artifact/GBqYuzenozHgGygiGrSS12) tem 63 telas (celular e site) e o roteiro clicável do fluxo inteiro, do cadastro do imóvel até o vendido
- Passos 0.1 a 0.3 feitos: revisão contra a Visão geral, 15 telas novas (pagamento da mensalidade, acesso suspenso, renovar exclusividade, recuperar senha, editar imóvel disponível, editar e reenviar reprovado, minha conta), confirmação de apagar, status "contrato em análise" e "vendido", "Equipe" só para o responsável da imobiliária, Domora trocado por PAUTA (o `domora.css` virou `pauta.css`) e o roteiro com as datas em ordem
- O que o protótipo revelou e ainda não está decidido ficou em "Pendências e decisões em aberto", abaixo. As telas mostram esses pontos como [A DEFINIR]

Etapa 1 (em andamento):
- 1.1 feito: app Next.js 16.4.2 com TypeScript, Tailwind 4, ESLint, App Router e código em `src/` (pacote `pauta`). Cache Components ficou ligado, como o Next 16.4 cria (decisão no CLAUDE.md). `npm run lint` e `npm run build` passam
- 1.2 feito: os documentos saíram de `PAUTA-docs/` e foram para `README.md`, `ROADMAP.md`, `CLAUDE.md`, `docs/visao-geral.md` e `docs/prompts.md`. As 63 telas do protótipo, o `pauta.css` e o `site.css` estão em `docs/prototipo/`. O CLAUDE.md carrega o `AGENTS.md` do Next e tem a regra de atualizar este "Onde paramos" a cada passo. O `.gitattributes` fixa a quebra de linha (LF) para Windows e Mac

- 1.3 feito: `@supabase/supabase-js`, `@supabase/ssr` e `server-only` instalados; `src/lib/supabase/client.ts` (navegador) e `src/lib/supabase/server.ts` (servidor, lê a sessão pelos cookies e não pode ser importado no navegador); `.env.example` no repositório como modelo. A página http://localhost:3000/teste-conexao mostra as três checagens com ✅ (variáveis, endereço e chave, cliente do servidor). `.claude/launch.json` sobe o `npm run dev` pelo painel do Claude Code

- 1.4 feito: decidido usar `npx supabase db push` (Supabase CLI como dependência do projeto, pasta `supabase/` criada com `supabase init`). Registrado no README (passo 5), no CLAUDE.md e na Visão geral. Falta a preparação de cada computador (`supabase login` e `supabase link`), que cada pessoa faz no próprio terminal porque pede a senha do banco

- 1.5 feito: `.claude/commands/auditar-etapa.md` e `atualizar-roadmap.md`, a partir dos do `imobilink`. Aproveitados: skill de code review do Superpowers, pedir evidência, tabela por gravidade, não corrigir, conferir variável, pacote e migration novos. Mudou: regras de negócio do PAUTA no lugar da reserva, checagens de `exigirTipo()`, RLS, testes do que deve ser barrado e cuidados do Next 16; migration conferida pelo `npx supabase migration list`

Próximo passo exato:
- **Passo 1.6** do `docs/prompts.md`: Playwright com o primeiro teste e o `npm run test:e2e`; cores, fontes e componentes do protótipo no Tailwind, com uma página de amostra

Antes da Etapa 1 (fazer à mão, cada pessoa pelo próprio painel):
- [ ] Avisar o Gabriel do replanejamento e da troca do nome para PAUTA, e combinar o arquivamento
- [ ] Fechar sem aceitar o Pull Request da Etapa 3 no `imobilink`
- [ ] Arquivar o repositório `HevelynLV/imobilink` (GitHub → Settings → General → Danger Zone → Archive this repository). Ele fica só leitura e serve de consulta
- [x] Criar o repositório no GitHub: existe como `HevelynLV/PAUTA`, já com os documentos do planejamento
- [x] Criar um projeto novo no Supabase (região São Paulo), com o nome PAUTA
- [ ] Convidar o Gabriel para o projeto Supabase do PAUTA
- [ ] Depois que o projeto novo estiver funcionando: pausar o projeto antigo do Supabase (`gaxvhygqwcvfgpudywmi`)

Pendências e decisões em aberto (cada uma precisa estar resolvida antes da etapa indicada). Os itens marcados com **(banco)** mudam tabelas ou status: como a Etapa 2 modela o banco do MVP inteiro, vale decidi-los antes do passo 2.1, mesmo que a etapa deles venha depois. Ao decidir, registrar em "Decisões tomadas" na Visão geral (com a data) e no CLAUDE.md, e tirar daqui.

- Etapa 2 (banco):
  - **(banco)** Assinante bloqueado pelo admin e assinante com pagamento vencido são o mesmo status ou dois diferentes? Se o admin desbloqueia um vencido, ele volta sem pagar?
  - **(banco)** Bloquear uma imobiliária corta o acesso dos corretores dela na hora? (o protótipo e o prompt 5.2 dizem que sim; a Visão geral não diz)
- Etapa 3:
  - **(banco)** Como o corretor autônomo se cadastra: pela tela pública, como no protótipo, ou de outro jeito? Hoje o CLAUDE.md diz "cadastro pelo app só como proprietário ou imobiliária"
  - Quanto tempo a sessão dura e se existe "manter conectado" (aparece no login do site)
- Etapa 4:
  - Texto do termo de exclusividade que o proprietário aceita no cadastro
  - **(banco)** A exclusividade de 6 meses começa a contar na aprovação (como no protótipo) ou no aceite do termo?
  - **(banco)** Mostrar o contato vale para cada imóvel (como no protótipo) ou para a conta toda?
  - O proprietário pode editar imóvel pendente de aprovação? Se puder, a edição é registrada?
  - O proprietário pode editar imóvel em negociação (ex.: mudar o preço com propostas aceitas)? Vale a mesma regra de "edição de imóvel disponível"?
  - **(banco)** Lista de tipos de imóvel (hoje: casa, apartamento, cobertura, terreno, sala comercial) e de bairros de Florianópolis (hoje só 6 no protótipo)
  - Limite das fotos: o protótipo usa JPG ou PNG de até 10 MB cada
  - **(banco)** Imóvel captado pelo admin: o admin pode criar a conta do dono (o dono recebe um e-mail para criar a senha)? E como esse dono aceita o termo de exclusividade: no app, no primeiro acesso, ou em papel?
- Etapa 6:
  - Quais filtros o catálogo terá (o protótipo sugere tipo, status, bairro, faixa de preço, quartos e busca por título ou bairro)
- Etapa 7:
  - **(banco)** A visita é obrigatória antes da proposta? (no protótipo, não é)
  - Visita recusada: o proprietário escreve um motivo ou sugere outro horário? (no protótipo, só recusa)
  - Horários da visita: livres ou em horários fixos (o protótipo usa horários das 09:00 às 17:00), e se o recado do corretor ao proprietário entra
  - O proprietário também vê o CRECI do corretor nas visitas e propostas? (o protótipo mostra; a Visão geral fala só em nome, imobiliária e contato)
- Etapa 8:
  - **(banco)** Campos da proposta: o protótipo pede valor, forma de pagamento (à vista, financiamento, permuta), condições e o nome do comprador. O RF23 fala só em "valor e condições". O nome do comprador é dado pessoal de outra pessoa (LGPD): entra ou não?
  - **(banco)** O mesmo corretor pode ter mais de uma proposta no mesmo imóvel? Pode mandar uma nova depois de uma recusada?
  - **(banco)** O proprietário pode desfazer o aceite de uma proposta?
- Etapa 9:
  - Qual a % de comissão do PAUTA (sobre a comissão do corretor ou sobre o valor do imóvel)
  - A cláusula da comissão do PAUTA no contrato é condição para o admin aprovar? (o protótipo trata como item da conferência)
  - **(banco)** E se o valor final do contrato for diferente do valor da proposta aceita?
  - **(banco)** Ao aprovar o contrato, o que acontece com as propostas ainda não respondidas e com as visitas marcadas de outros corretores? (a regra fala em "todas as outras propostas em aberto"; o protótipo só cita as aceitas)
  - Limite do PDF do contrato: o protótipo usa até 20 MB
- Etapa 10:
  - Provedor da API oficial do WhatsApp (Meta direto ou um intermediário como Twilio ou Z-API) e o custo por mensagem
  - Os avisos "imóvel novo no catálogo" (para todos os assinantes) e "mensalidade paga", que aparecem no protótipo, entram no RF29? O primeiro pode custar caro no WhatsApp
  - O admin tem lista de avisos? O RF30 diz que ele recebe o aviso de vencimento, mas no protótipo ele só vê isso no painel
- Etapa 11:
  - Preço da mensalidade (igual para imobiliária e corretor autônomo?)
  - **(banco)** O pagamento da mensalidade vem antes ou depois de o admin ativar a assinatura?
  - O que acontece com as visitas e propostas de um assinante com acesso suspenso
  - Contato da equipe PAUTA que aparece para o assinante bloqueado
- Etapa 12:
  - Com quanto tempo de antecedência sai o aviso de vencimento da exclusividade, e se a renovação é por mais 6 meses
  - **(banco)** O que acontece com as propostas aceitas se a exclusividade vencer com o imóvel em negociação
- Etapa 13:
  - Termo de assinatura do corretor e da imobiliária, com a cláusula contra desintermediação e a responsabilidade da imobiliária pelos corretores convidados (o protótipo pede o aceite já no cadastro)
  - Rever o `npm audit`: na Etapa 1 havia 5 avisos "high" no pacote `braces`, que vem só das ferramentas de lint (não vai para o app no ar). A correção sugerida (`npm audit fix --force`) voltaria o `eslint-config-next` para a versão 14 e não foi aplicada

Lições do Captador (problemas já encontrados no projeto antigo; tratar desde o início no PAUTA):
- Etapa 1: o Next.js 16 tem mudanças grandes em relação ao que os tutoriais mostram. Antes de escrever código, ler o guia em `node_modules/next/dist/docs/` (o arquivo `AGENTS.md` gerado pelo Next avisa isso)
- Etapa 1: no Captador, as migrations eram aplicadas à mão pelo SQL Editor, e o histórico de migrations do Supabase ficava vazio. No projeto novo dá para decidir, desde o início, se continua assim ou se passa a usar `supabase db push`. Decidir antes da primeira migration **Resolvido em 20/10/2026: `npx supabase db push`** (README, passo 5)
- Etapa 2: o roteiro de teste do RLS deixava um schema `teste_rls` no banco, e alguns testes dependiam uns dos outros. Fazer cada teste independente e limpar o que criar
- Etapa 2: o CRECI é único e fica com quem cadastra primeiro, então alguém pode registrar o CRECI de uma imobiliária real e travar o cadastro dela. Por isso existe o RF16 (o admin exclui a imobiliária pendente e libera o CRECI). Planejar o `on delete` entre perfis e imobiliárias para isso funcionar
- Etapa 3: aceitar telefone digitado com 0 na frente (`0 11 9...`) e reconhecer erros do cadastro pelo código do Supabase, não pelo texto da mensagem
- Etapa 3: nome, telefone e CRECI do cadastro ficavam copiados em `raw_user_meta_data` do Supabase Auth, uma cópia que o usuário pode editar e que vai dentro do token. Apagar essas chaves depois que o banco copia os dados para o perfil
- Etapa 3: os links dos e-mails no modelo padrão do Supabase (fluxo PKCE) só funcionam no mesmo navegador em que foram pedidos
- Etapa 4: o admin só consegue aprovar o imóvel se ele não mudou desde que a tela foi aberta (RF14). Sem isso, uma edição feita entre revisar e aprovar vai ao ar sem registro
- Etapa 13: SMTP próprio (ex.: Resend), modelos de e-mail em português, religar a confirmação de e-mail, ligar "Secure password change" e conferir que o cadastro não revela se um e-mail já tem conta. Com a confirmação ligada, o perfil nasce antes de o e-mail ser confirmado: planejar a limpeza de contas nunca confirmadas
- Etapa 13: trocar o Site URL do Supabase pelo endereço da Vercel e cadastrar as Redirect URLs de produção
- LGPD: planejar a exclusão e a anonimização de usuários e imóveis antes do piloto

Atenção (algo que a próxima pessoa precisa saber):
- Primeira vez no projeto? Veja o `README.md` e a `docs/visao-geral.md`
- O nome do app agora é **PAUTA** (antes, Domora)
- Os documentos saíram de `PAUTA-docs/` e agora ficam na raiz (`README.md`, `ROADMAP.md`, `CLAUDE.md`) e em `docs/`. O protótipo está em `docs/prototipo/`
- O app Next.js existe a partir da branch `etapa-1-setup`: depois de baixar, rode `npm install`
- Migrations agora são aplicadas com `npx supabase db push`: antes da Etapa 2, cada pessoa faz a preparação do README (passo 5: `supabase login` e `supabase link`). Nunca rode `npx supabase config push`
- O projeto Supabase do PAUTA já existe, mas ainda não tem tabelas. Não use o `imobilink` nem o projeto Supabase antigo para trabalho novo
- O protótipo mudou na Etapa 0 (63 telas). O arquivo de estilo agora se chama `pauta.css` (antes, `domora.css`); o Roadmap de prompts já usa o nome novo nos passos 1.2 e 1.6
- Há várias decisões novas em "Pendências e decisões em aberto". As marcadas com **(banco)** precisam ser decididas antes do passo 2.1

## Migrations aplicadas no banco

Nenhuma ainda. O projeto Supabase do PAUTA será criado na Etapa 1. Toda migration nova entra aqui assim que for aplicada e o `testar_rls.sql` passar.

## Etapas do MVP

- [x] 0. Protótipo do design — Pronto quando: o fluxo inteiro pode ser clicado, do cadastro do imóvel até o vendido
- [ ] 1. Setup — Pronto quando: a página abre em localhost, conecta ao Supabase novo e o código está no repositório `PAUTA`
- [ ] 2. Banco de dados — Pronto quando: o `testar_rls.sql` passa e um assinante bloqueado não vê nenhum imóvel
- [ ] 3. Login e perfis — Pronto quando: cada tipo de usuário só abre a própria área
- [ ] 4. Imóvel — Pronto quando: imóvel do proprietário, com fotos e termo aceito, aparece como pendente; imóvel captado pelo admin entra disponível e vinculado ao dono
- [ ] 5. Assinantes — Pronto quando: o admin ativa imobiliária e autônomo, e o corretor convidado entra já vinculado e ativo
- [ ] 6. Catálogo — Pronto quando: assinante ativo filtra pelo celular e vê "disponível" ou "em negociação"; bloqueado não vê nada; vendido não aparece
- [ ] 7. Visita — Pronto quando: o corretor pede visita, o proprietário confirma ou recusa e o corretor vê a resposta
- [ ] 8. Proposta — Pronto quando: duas propostas aceitas no mesmo imóvel deixam ele "em negociação"
- [ ] 9. Contrato e venda — Pronto quando: aprovar o contrato marca o imóvel como vendido e recusa as outras propostas numa operação só; recusar devolve com motivo
- [ ] 10. Avisos — Pronto quando: cada evento do fluxo gera aviso na lista do app e no WhatsApp
- [ ] 11. Cobrança — Pronto quando: assinante com pagamento vencido no Asaas perde o acesso sozinho
- [ ] 12. Exclusividade — Pronto quando: sem renovação, o imóvel sai do catálogo sozinho no vencimento
- [ ] 13. PWA, testes e deploy — Pronto quando: o roteiro de teste passa inteiro e o app abre pelo endereço público no celular de outra pessoa

## Histórico

Projeto antigo (Captador, repositório `imobilink`):
- 30/09/2026 · Hevelyn · Setup inicial do Next.js e conexão com o Supabase
- 30/09/2026 · Gabriel · Etapa 2: banco de dados, RLS, auditoria e correções (71 testes passando)
- 05/10/2026 · Hevelyn · Etapa 3: cadastro, login e perfis, auditoria e correções, testes e2e com Playwright (15 passando), README de início

PAUTA (antes, Domora):
- 13 e 14/10/2026 · Hevelyn · Replanejamento do MVP: o Captador vira Domora, o modelo de negócio é redefinido, o projeto recomeça do zero e o plano passa a ter 14 etapas (0 a 13)
- 16/10/2026 · Hevelyn · Troca do nome do app de Domora para PAUTA; repositório novo passa a se chamar `pauta`
- 20/10/2026 · Hevelyn · Etapa 0 concluída: revisão do protótipo contra a Visão geral, 15 telas novas, correções, troca de Domora por PAUTA e roteiro clicável do cadastro ao vendido (63 telas). Decisões que o protótipo revelou foram para "Pendências"
