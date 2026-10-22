# PAUTA — Roadmap

## Onde paramos

Última atualização: 22/10/2026 · por Hevelyn
Etapa atual: 2. Banco de dados, na branch `etapa-2-banco` (passos 2.1 a 2.5 feitos; próximo: 2.6, auditoria numa sessão nova). A Etapa 1 foi aceita na `main` (Pull Request #1)

Etapa 2 (em andamento):
- 2.1 feito (22/10/2026): modelo do MVP aprovado. Tabelas desta etapa: `perfis`, `assinantes` (imobiliária **ou** corretor autônomo: quem paga, com o CRECI único e o status da assinatura; o corretor convidado aponta para o assinante da imobiliária), `convites`, `tipos_imovel`, `bairros`, `imoveis`, `fotos_imovel` e `edicoes_imovel`. Visitas, propostas, contratos, avisos e cobranças entram nas etapas delas. Pontos do modelo: o contato do proprietário (telefone e e-mail) não fica no imóvel, só sai pela função `contato_do_proprietario()`; o `tipo` do perfil é definido só pelo banco no cadastro e não pode ser alterado pelo app; "em negociação" e "contrato em análise" são calculados, não guardados; a exclusividade guarda início e fim; a aprovação usa um contador de versão do imóvel (RF14). Divisão das migrations: 2.2 tipos e perfis; 2.3 assinantes e convites; 2.4 imóveis, fotos, edições e listas
- 2.2 feito (22/10/2026): migration `20261022171241_perfis` aplicada com `npx supabase db push`. Cria os tipos `tipo_usuario` e `status_assinatura`, a tabela `perfis` (o banco cria o perfil sozinho no cadastro, limpa o telefone e confere o DDD; por enquanto só aceita `proprietario`), as funções `meu_tipo()` e `eh_admin()` e o RLS: cada um lê só o próprio perfil, o admin lê todos, e pelo app só dá para mudar nome e telefone. Criado o `supabase/testes/testar_rls.sql`: 21 testes, todos passando, sem deixar dado nem schema no banco. Ele roda pelo terminal com `npx supabase db query --linked -f supabase/testes/testar_rls.sql` (ou colando no SQL Editor)
- 2.3 feito (22/10/2026): migration `20261022171933_assinantes_e_convites` aplicada. Tabela `assinantes` (imobiliária ou autônomo, CRECI guardado em maiúsculas e sem espaços, sem repetir, status só muda pelo admin: ele não marca `vencido` nem libera um vencido), coluna `perfis.assinante_id` (o corretor aponta para a imobiliária e segue o status dela), tabela `convites` (só o hash do código, uso único, validade padrão de 7 dias, só o responsável de imobiliária ativa cria), funções `meu_assinante_id()` e `eh_assinante_ativo()`. O cadastro agora aceita `imobiliaria` (nome_imobiliaria e creci), `autonomo` (creci) e `corretor` (convite). Excluir a conta do responsável de uma imobiliária pendente apaga o assinante e libera o CRECI; ativa não é excluída. `testar_rls.sql`: 58 de 58 passando
- 2.4 feito (22/10/2026): migration `20261022221614_imoveis` aplicada. Listas `tipos_imovel` e `bairros` (vazias: o conteúdo está em Pendências da Etapa 4), `imoveis`, `fotos_imovel` e `edicoes_imovel`. O imóvel do proprietário nasce pendente e só existe com o termo aceito; status e exclusividade só mudam pelas funções `aprovar_imovel(id, versao)` (admin; falha se a versão mudou; marca 6 meses de exclusividade), `reprovar_imovel(id, motivo)` (admin) e `reenviar_imovel(id)` (dono). Assinante ativo vê só imóvel disponível; o contato só sai por `contato_do_proprietario(id)`. Edição do dono em imóvel disponível (inclusive fotos) fica registrada; a do admin, não. O dono apaga só pendente ou reprovado. `testar_rls.sql`: 103 de 103 passando
- 2.5 feito (22/10/2026): conferido que o roteiro cobre os 4 casos pedidos (assinante pendente, bloqueado ou vencido não vê imóvel; assinante ativo vê só o disponível e não vê contato escondido; proprietário não vê nem edita imóvel de outro; ninguém muda o próprio tipo nem o próprio status)
- O verificador do Supabase (`npx supabase db advisors --linked`) mostra avisos "Signed-In Users Can Execute SECURITY DEFINER Function" para `meu_tipo()`, `eh_admin()`, `meu_assinante_id()`, `eh_assinante_ativo()`, `contato_do_proprietario()`, `aprovar_imovel()`, `reprovar_imovel()` e `reenviar_imovel()`. São intencionais: cada uma confere por dentro quem chama, e o roteiro testa isso. Mostra também 2 avisos de desempenho "multiple permissive policies" em `imoveis` (3 regras de leitura e 2 de edição separadas): no volume do piloto não pesa; dá para juntar numa migration nova se o catálogo ficar lento (Etapa 6)
- Para a Etapa 4: o banco exige o termo aceito no momento do cadastro do imóvel (o `termo_versao` vai junto no insert). No protótipo, o termo vem depois das fotos (ProNovo → ProFotos → ProTermo): o plano da Etapa 4 precisa decidir a ordem (ex.: guardar o formulário e as fotos no navegador e criar o imóvel no aceite). Editar imóvel pendente está bloqueado no banco até a decisão em Pendências. A captação pelo admin (função que cria o imóvel já disponível) fica para o passo 4.7
- Para a Etapa 3 (cadastro): o app envia em `options.data` do signUp `tipo`, `nome` e `telefone`, e mais `nome_imobiliaria` e `creci` (imobiliária), `creci` (autônomo) ou `convite` (corretor). CRECI repetido volta como erro `23505`; convite inválido, tipo não permitido ou falta de CRECI, como `P0001`
- Para a Etapa 5: a validade de 7 dias do convite foi escolhida no 2.3 por falta de definição; dá para mudar só o padrão da coluna `convites.expira_em`. Se o admin bloquear um assinante vencido e depois desbloquear, ele volta como `ativo` (o banco não guarda que estava vencido): rever na Etapa 11, junto com a decisão do pagamento
- Risco anotado para a Etapa 6: o `proprietario_id` do imóvel fica visível para o corretor (não é contato, mas mostra quais imóveis são do mesmo dono). Decidir na Etapa 6 se o catálogo passa por uma função

Preparação da Etapa 2 (22/10/2026):
- `supabase login` e `supabase link` feitos no computador da Hevelyn: `npx supabase migration list` responde sem erro, com a lista vazia
- 13 decisões **(banco)** tomadas e registradas em "Decisões tomadas em 22/10/2026" na Visão geral e no CLAUDE.md. Ficaram em aberto 3, que não travam o passo 2.1: campos da proposta (Etapa 8), pagamento antes ou depois da ativação (Etapa 11) e propostas aceitas quando a exclusividade vence (Etapa 12)

O que aconteceu (replanejamento de 13 e 14/10/2026 e troca de nome em 16/10/2026):
- O projeto antigo se chamava **Captador** (repositório `HevelynLV/imobilink`, pasta local `capimoveis`). Ele chegou até a Etapa 3 (login e perfis), mas o modelo de negócio mudou tanto que vamos recomeçar do zero
- No replanejamento, o app passou a se chamar Domora e, em 16/10/2026, **PAUTA**. O produto inteiro foi redefinido: ideia, diferencial, usuários, 32 requisitos funcionais, 16 não funcionais e 14 etapas. Tudo está em `docs/visao-geral.md`, que é a fonte da verdade do projeto
- As mudanças que mais pesam em relação ao Captador: não existe mais reserva (vários corretores trabalham o mesmo imóvel ao mesmo tempo); a exclusividade é de 6 meses, com aviso e renovação; o proprietário confirma as visitas, aceita várias propostas e vê os dados do corretor; o contrato é assinado fora do app e o admin confere o PDF; a receita é mensalidade (Asaas) mais uma % da comissão; os avisos saem por WhatsApp; corretores entram por convite da imobiliária; corretor autônomo pode assinar; o piloto é em Florianópolis

Etapa 0 (concluída em 20/10/2026):
- O protótipo **"PAUTA — Protótipo"** (https://claude.ai/artifact/GBqYuzenozHgGygiGrSS12) tem 63 telas (celular e site) e o roteiro clicável do fluxo inteiro, do cadastro do imóvel até o vendido
- Passos 0.1 a 0.3 feitos: revisão contra a Visão geral, 15 telas novas (pagamento da mensalidade, acesso suspenso, renovar exclusividade, recuperar senha, editar imóvel disponível, editar e reenviar reprovado, minha conta), confirmação de apagar, status "contrato em análise" e "vendido", "Equipe" só para o responsável da imobiliária, Domora trocado por PAUTA (o `domora.css` virou `pauta.css`) e o roteiro com as datas em ordem
- O que o protótipo revelou e ainda não está decidido ficou em "Pendências e decisões em aberto", abaixo. As telas mostram esses pontos como [A DEFINIR]

Etapa 1 (concluída em 21/10/2026):
- 1.1 feito: app Next.js 16.4.2 com TypeScript, Tailwind 4, ESLint, App Router e código em `src/` (pacote `pauta`). Cache Components ficou ligado, como o Next 16.4 cria (decisão no CLAUDE.md). `npm run lint` e `npm run build` passam
- 1.2 feito: os documentos saíram de `PAUTA-docs/` e foram para `README.md`, `ROADMAP.md`, `CLAUDE.md`, `docs/visao-geral.md` e `docs/prompts.md`. As 63 telas do protótipo, o `pauta.css` e o `site.css` estão em `docs/prototipo/`. O CLAUDE.md carrega o `AGENTS.md` do Next e tem a regra de atualizar este "Onde paramos" a cada passo. O `.gitattributes` fixa a quebra de linha (LF) para Windows e Mac

- 1.3 feito: `@supabase/supabase-js`, `@supabase/ssr` e `server-only` instalados; `src/lib/supabase/client.ts` (navegador) e `src/lib/supabase/server.ts` (servidor, lê a sessão pelos cookies e não pode ser importado no navegador); `.env.example` no repositório como modelo. A página http://localhost:3000/teste-conexao mostra as três checagens com ✅ (variáveis, endereço e chave, cliente do servidor). `.claude/launch.json` sobe o `npm run dev` pelo painel do Claude Code

- 1.4 feito: decidido usar `npx supabase db push` (Supabase CLI como dependência do projeto, pasta `supabase/` criada com `supabase init`). Registrado no README (passo 5), no CLAUDE.md e na Visão geral. Falta a preparação de cada computador (`supabase login` e `supabase link`), que cada pessoa faz no próprio terminal porque pede a senha do banco

- 1.5 feito: `.claude/commands/auditar-etapa.md` e `atualizar-roadmap.md`, a partir dos do `imobilink`. Aproveitados: skill de code review do Superpowers, pedir evidência, tabela por gravidade, não corrigir, conferir variável, pacote e migration novos. Mudou: regras de negócio do PAUTA no lugar da reserva, checagens de `exigirTipo()`, RLS, testes do que deve ser barrado e cuidados do Next 16; migration conferida pelo `npx supabase migration list`

- 1.6 feito: Playwright 1.64 com `npm run test:e2e` (testes em `e2e/`, rodam em tela de celular e de computador, um de cada vez porque o banco é compartilhado, e carregam o `.env.local`). 4 testes passando: a página inicial abre e o app conecta ao Supabase. Cores, fontes (Figtree e Bricolage Grotesque), tamanhos de texto e raios do `pauta.css` estão no `src/app/globals.css` com os mesmos nomes do protótipo; componentes `Botao`, `Cartao`, `SeloStatus` e `MenuInferior` em `src/components/ui/`. Amostra em http://localhost:3000/amostra, conferida no navegador em tamanho de celular

- 1.7 feito: auditoria numa sessão nova. Nada crítico. Lint, build e os 4 testes passaram, e a chave secreta não aparece no código do app
- 1.8 feito: todos os achados da auditoria corrigidos ou levados para "Pendências":
  - as páginas `/teste-conexao` e `/amostra` respondem "página não encontrada" (404) fora do computador de quem programa, ou seja, também num endereço de teste da Vercel
  - os clientes do Supabase têm nomes diferentes, para ninguém usar o do navegador no servidor por engano: `criarClienteNavegador` (`client.ts`) e `criarClienteServidor` (`server.ts`)
  - o menu de baixo acende a aba certa também nas páginas de dentro (ex.: `/imoveis/123` acende "Imóveis"), deixa espaço para a barra do iPhone e tem um aviso: nos layouts da Etapa 3, ele precisa ficar dentro de um `<Suspense>`, senão o `npm run build` falha
  - os testes de celular usam 390 px de largura, como o protótipo
  - o `@next/env` (usado pelo `playwright.config.ts`) entrou no `package.json`
  - o `/atualizar-roadmap` agora começa com `git fetch` em vez de `git pull`
  - o CLAUDE.md ganhou a regra do `server-only`, e foram corrigidos textos desatualizados no ROADMAP, no `docs/prompts.md` e na Visão geral
  - lint, build e testes passaram de novo depois das correções

Próximo passo exato:
- Contar ao Gabriel as decisões de 22/10/2026 (Visão geral, "Decisões tomadas em 22/10/2026")
- **Passo 2.6**: `/auditar-etapa 2` numa sessão nova do Claude Code (`/clear` ou outro terminal), para quem revisa não ser quem escreveu

Antes da Etapa 1 (fazer à mão, cada pessoa pelo próprio painel):
- [ ] Avisar o Gabriel do replanejamento e da troca do nome para PAUTA, e combinar o arquivamento
- [ ] Fechar sem aceitar o Pull Request da Etapa 3 no `imobilink`
- [ ] Arquivar o repositório `HevelynLV/imobilink` (GitHub → Settings → General → Danger Zone → Archive this repository). Ele fica só leitura e serve de consulta
- [x] Criar o repositório no GitHub: existe como `HevelynLV/PAUTA`, já com os documentos do planejamento
- [x] Criar um projeto novo no Supabase (região São Paulo), com o nome PAUTA
- [ ] Convidar o Gabriel para o projeto Supabase do PAUTA
- [ ] Depois que o projeto novo estiver funcionando: pausar o projeto antigo do Supabase (`gaxvhygqwcvfgpudywmi`)

Pendências e decisões em aberto (cada uma precisa estar resolvida antes da etapa indicada). Os itens marcados com **(banco)** mudam tabelas ou status: como a Etapa 2 modela o banco do MVP inteiro, vale decidi-los antes do passo 2.1, mesmo que a etapa deles venha depois. Ao decidir, registrar em "Decisões tomadas" na Visão geral (com a data) e no CLAUDE.md, e tirar daqui.

- Etapa 3:
  - Quanto tempo a sessão dura e se existe "manter conectado" (aparece no login do site)
- Etapa 4:
  - Texto do termo de exclusividade que o proprietário aceita no cadastro
  - O proprietário pode editar imóvel pendente de aprovação? Se puder, a edição é registrada?
  - O proprietário pode editar imóvel em negociação (ex.: mudar o preço com propostas aceitas)? Vale a mesma regra de "edição de imóvel disponível"?
  - Conteúdo das listas de tipos de imóvel (hoje: casa, apartamento, cobertura, terreno, sala comercial) e de bairros de Florianópolis (hoje só 6 no protótipo). Que são listas fixas no banco já foi decidido em 22/10/2026
  - Limite das fotos: o protótipo usa JPG ou PNG de até 10 MB cada
- Etapa 6:
  - Quais filtros o catálogo terá (o protótipo sugere tipo, status, bairro, faixa de preço, quartos e busca por título ou bairro)
- Etapa 7:
  - Visita recusada: o proprietário escreve um motivo ou sugere outro horário? (no protótipo, só recusa)
  - Horários da visita: livres ou em horários fixos (o protótipo usa horários das 09:00 às 17:00), e se o recado do corretor ao proprietário entra
  - O proprietário também vê o CRECI do corretor nas visitas e propostas? (o protótipo mostra; a Visão geral fala só em nome, imobiliária e contato)
- Etapa 8:
  - **(banco)** Campos da proposta: o protótipo pede valor, forma de pagamento (à vista, financiamento, permuta), condições e o nome do comprador. O RF23 fala só em "valor e condições". O nome do comprador é dado pessoal de outra pessoa (LGPD): entra ou não?
- Etapa 9:
  - Qual a % de comissão do PAUTA (sobre a comissão do corretor ou sobre o valor do imóvel)
  - A cláusula da comissão do PAUTA no contrato é condição para o admin aprovar? (o protótipo trata como item da conferência)
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
  - Tirar do app as páginas de teste da Etapa 1: `src/app/teste-conexao/` e `src/app/amostra/` (desde a auditoria da Etapa 1 elas já respondem 404 em produção, mas o código continua no app)
  - PWA no iPhone: colocar `viewportFit: "cover"` no `viewport` do `src/app/layout.tsx`. O menu de baixo já reserva o espaço da barra do iPhone (`env(safe-area-inset-bottom)`), mas isso só vale com essa opção ligada; ligar junto com o resto do PWA para conferir também o topo da tela
  - O teste "o app conecta ao Supabase" (`e2e/inicio.spec.ts`) usa o Supabase de verdade e o `.env.local`: num CI sem as chaves, ele falha
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
- Etapa 1 (PAUTA): o `npm run dev` guarda um cache em disco (`.next/dev`). Depois de mudar o `globals.css`, ele continuou servindo o CSS antigo mesmo reiniciado. Se uma mudança não aparecer no navegador: pare o `npm run dev`, apague a pasta `.next/dev` e rode de novo

Atenção (algo que a próxima pessoa precisa saber):
- Primeira vez no projeto? Veja o `README.md` e a `docs/visao-geral.md`
- O nome do app agora é **PAUTA** (antes, Domora)
- Os documentos saíram de `PAUTA-docs/` e agora ficam na raiz (`README.md`, `ROADMAP.md`, `CLAUDE.md`) e em `docs/`. O protótipo está em `docs/prototipo/`
- O app Next.js existe a partir da branch `etapa-1-setup`: depois de baixar, rode `npm install` (se já tinha rodado antes, rode de novo: entrou o pacote `@next/env`)
- Migrations agora são aplicadas com `npx supabase db push`: antes da Etapa 2, cada pessoa faz a preparação do README (passo 5: `supabase login` e `supabase link`). Nunca rode `npx supabase config push`
- **Migrations novas no banco** (`20261022171241_perfis`, `20261022171933_assinantes_e_convites` e `20261022221614_imoveis`): já estão aplicadas no Supabase compartilhado, não precisa rodar `db push` para elas. Depois do `git pull`, confira com `npx supabase migration list` (Local e Remote iguais). Não use o `imobilink` nem o projeto Supabase antigo para trabalho novo
- O protótipo mudou na Etapa 0 (63 telas). O arquivo de estilo agora se chama `pauta.css` (antes, `domora.css`); o Roadmap de prompts já usa o nome novo nos passos 1.2 e 1.6
- Decisões novas de 22/10/2026 (status vencido separado do bloqueado, corretor autônomo pela tela pública, chave de admin só no servidor e outras): veja "Decisões tomadas em 22/10/2026" na Visão geral. As 3 marcadas com **(banco)** que sobraram em "Pendências" não travam o passo 2.1

## Migrations aplicadas no banco

Toda migration nova entra aqui assim que for aplicada e o `testar_rls.sql` passar. Para conferir: `npx supabase migration list` (coluna Remote).

- `20261022171241_perfis` · 22/10/2026 · Hevelyn · tipos, perfis, `meu_tipo()`, `eh_admin()` e o gatilho de cadastro. `testar_rls.sql`: 21 de 21 passando
- `20261022171933_assinantes_e_convites` · 22/10/2026 · Hevelyn · assinantes, convites, `meu_assinante_id()`, `eh_assinante_ativo()` e o cadastro de imobiliária, autônomo e corretor. `testar_rls.sql`: 58 de 58 passando
- `20261022221614_imoveis` · 22/10/2026 · Hevelyn · listas de tipos e bairros, imóveis, fotos, registro de edições, aprovar/reprovar/reenviar e `contato_do_proprietario()`. `testar_rls.sql`: 103 de 103 passando

## Etapas do MVP

- [x] 0. Protótipo do design — Pronto quando: o fluxo inteiro pode ser clicado, do cadastro do imóvel até o vendido
- [x] 1. Setup — Pronto quando: a página abre em localhost, conecta ao Supabase novo e o código está no repositório `PAUTA`
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
- 21/10/2026 · Hevelyn · Etapa 1 concluída: app Next.js 16 conectado ao Supabase do PAUTA, migrations com `supabase db push`, comandos `/auditar-etapa` e `/atualizar-roadmap`, Playwright (4 testes) e visual do protótipo no Tailwind. Auditoria sem itens críticos; achados corrigidos ou levados para "Pendências"
