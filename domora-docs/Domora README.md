# Domora

Marketplace de imóveis exclusivos em Florianópolis. O proprietário dá 6 meses de exclusividade ao Domora; imobiliárias e corretores autônomos assinantes acessam o catálogo, pedem visitas, enviam propostas e fecham a venda, com o contrato assinado fora do app e conferido pelo admin.

Stack: Next.js (App Router, TypeScript), Supabase (Postgres, Auth, Storage), Tailwind CSS, Vercel, Asaas (cobrança) e WhatsApp (avisos).

Documentos do projeto:
- **Domora - Visão geral da plataforma:** ideia, regras do negócio, usuários, requisitos e decisões. É a fonte da verdade: em caso de dúvida, vale o que está lá
- **Domora Roadmap:** onde o projeto parou, o próximo passo e as etapas do MVP. Leia "Onde paramos" e "Atenção" antes de qualquer tarefa
- **CLAUDE.md:** as instruções que o Claude Code segue no repositório. Será escrito na Etapa 1, a partir da Visão geral

No repositório `domora`, este arquivo vira `README.md` e o Roadmap vira `ROADMAP.md`, na raiz do projeto.

> **Situação atual:** o projeto está na Etapa 0 (protótipo do design). O repositório `domora` e o projeto Supabase novo ainda não existem; eles são criados na Etapa 1. Os passos marcados com *(a partir da Etapa 1)* só valem depois disso.

## Como começar a trabalhar no Domora

Checklist para quem chega no projeto. Faça na ordem, uma vez por computador.

### 1. Acessos

- [ ] Convite como colaborador no GitHub, no repositório `HevelynLV/domora` *(a partir da Etapa 1)*. Quem já está no projeto envia em Settings → Collaborators. Aceite pelo e-mail ou em github.com/notifications
- [ ] Convite no Supabase *(a partir da Etapa 1)*: quem já está no projeto envia em **Organization → Members → Invite**. Aceite pelo e-mail e confira que o projeto do Domora aparece no seu painel. O ID do projeto entra aqui quando ele for criado

> **O banco é compartilhado.** Todos usam o mesmo projeto do Supabase. O que uma pessoa aplica no banco vale para a outra na hora. Combine antes de mexer no banco.

### 2. Instalar as ferramentas

Comandos para Windows (PowerShell). Em Mac, use os links.

- [ ] **Node.js** (versão LTS, 20 ou mais nova): `winget install OpenJS.NodeJS.LTS` · [nodejs.org](https://nodejs.org)
- [ ] **Git**: `winget install Git.Git` · [git-scm.com](https://git-scm.com). Depois configure seu nome e e-mail (os mesmos do GitHub):
  ```bash
  git config --global user.name "Seu Nome"
  git config --global user.email "seu-email@exemplo.com"
  ```
- [ ] **VS Code**: `winget install Microsoft.VisualStudioCode` · [code.visualstudio.com](https://code.visualstudio.com)
- [ ] **Claude Code**: `irm https://claude.ai/install.ps1 | iex` (Mac: `curl -fsSL https://claude.ai/install.sh | bash`). Feche e abra o terminal e rode `claude` para fazer login
- [ ] **Plugin Superpowers** (usado pelo `/auditar-etapa`). Dentro do Claude Code, rode:
  ```
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace
  ```
  Feche e abra o Claude Code depois de instalar

Confira: `node -v`, `git --version` e `claude --version` respondem sem erro.

### 3. Baixar o projeto *(a partir da Etapa 1)*

- [ ] Clonar o repositório e instalar as dependências:
  ```bash
  git clone https://github.com/HevelynLV/domora.git
  cd domora
  npm install
  ```
- [ ] Baixar o navegador dos testes automáticos (uma vez por computador):
  ```bash
  npx playwright install chromium
  ```

### 4. Criar o `.env.local` *(a partir da Etapa 1)*

- [ ] Crie o arquivo `.env.local` na raiz do projeto (mesma pasta do `package.json`):

  ```
  NEXT_PUBLIC_SUPABASE_URL=https://<id-do-projeto>.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
  SITE_URL=http://localhost:3000
  SUPABASE_SECRET_KEY=sb_secret_...
  ```

  | Variável | O que é | Onde pegar no painel do Supabase |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Endereço do projeto | **Project Settings → Data API → Project URL** (ou botão **Connect** no topo do painel) |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do app; pode ir para o navegador porque o RLS protege os dados | **Project Settings → API Keys → Publishable key** |
  | `SITE_URL` | Endereço do site, usado nos links dos e-mails de cadastro e de recuperação de senha. Sem barra no fim | Não vem do painel: em desenvolvimento é sempre `http://localhost:3000` |
  | `SUPABASE_SECRET_KEY` | Chave secreta, **só para os testes automáticos** | **Project Settings → API Keys → Secret keys → Add new secret key**, com o nome `testes-e2e-<seu nome>`. Copie o valor (`sb_secret_...`) |

  > ⚠️ **A secret key é pessoal.** Cada pessoa cria a sua; não compartilhe. Ela ignora todo o RLS: quem tem a chave lê e apaga qualquer dado do banco. Por isso ela **nunca** tem o prefixo `NEXT_PUBLIC_`, nunca é usada no código do app (`src/`), nunca vai para a Vercel e **nunca vai para o GitHub** (o `.gitignore` ignora `.env*`). Se vazar, revogue-a no mesmo lugar onde criou.

- [ ] As variáveis do Asaas e do WhatsApp entram aqui nas Etapas 10 e 11
- [ ] Sempre que criar ou mudar o `.env.local`, pare e rode de novo o `npm run dev`. O Next.js só lê esse arquivo quando o servidor inicia

### 5. Banco de dados *(a partir da Etapa 2)*

- [ ] Abra a seção **"Migrations aplicadas no banco"** do Roadmap e compare com a pasta `supabase/migrations/`: todo arquivo da pasta tem que estar na lista. Se faltar algum, **não aplique sozinho**: avise a outra pessoa antes (o banco é de todos)

Regras do banco:
- Toda mudança no banco vira um arquivo novo em `supabase/migrations/`, nunca só no painel. Correção é sempre uma migration NOVA, nunca edição de uma que já rodou
- O jeito de aplicar as migrations (à mão pelo SQL Editor ou pelo `supabase db push`) será decidido na Etapa 1 e registrado aqui
- Depois de aplicar, rode o `supabase/testes/testar_rls.sql` inteiro: toda linha tem que mostrar "✅ passou". Só então siga para o próximo passo
- Migration nova entra no "Atenção" e na lista "Migrations aplicadas no banco" do Roadmap

### 6. Configuração do Supabase (só conferir) *(a partir da Etapa 3)*

Configurado uma vez no projeto compartilhado. Confira, sem mudar nada sem combinar:

- [ ] **Authentication → Sign In / Providers → Email → Confirm email**: **desligado** durante o desenvolvimento. Os testes automáticos usam e-mails `@exemplo.com`, que não existem. A confirmação é religada na Etapa 13, com SMTP próprio
- [ ] **Authentication → URL Configuration**:
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback/**` e `http://localhost:3000/auth/confirm`

Todo mundo roda o app na porta 3000, porque o Site URL é um só para o projeto.

### 7. Criar uma conta de admin para testar *(a partir da Etapa 3)*

O admin nunca é criado pelo cadastro do app.

- [ ] Rode `npm run dev` e crie uma conta como **Proprietário** com o seu e-mail
- [ ] Rode o script `supabase/scripts/criar_admin.sql` com o e-mail dessa conta. Tem que aparecer 1 linha com `tipo = admin`
- [ ] **Não salve** o script com o seu e-mail (desfaça a troca antes de qualquer commit)
- [ ] Saia e entre de novo no app: você cai na área do admin

### 8. Conferir que está tudo certo *(a partir da Etapa 3)*

- [ ] `npm run dev` e abra http://localhost:3000: a tela de login aparece
- [ ] Em outro terminal, `npm run test:e2e`: todos os testes passam. Para ver o relatório: `npx playwright show-report`

Se algo falhar, confira primeiro o `.env.local` (passo 4) e reinicie o `npm run dev`.

## Fluxo de cada etapa

Uma etapa por vez, sempre numa branch própria. Nunca trabalhe direto na `main`.

1. **Atualizar:** `git checkout main` e `git pull`. Se o `package.json` mudou, rode `npm install`
2. **Ler:** "Onde paramos" e "Atenção" no Roadmap. Faça o que o "Atenção" pedir (variável nova no `.env.local`, migration nova, ferramenta nova)
3. **Criar a branch:** `git checkout -b etapa-<número>-<nome>` (ex.: `etapa-4-imovel`)
4. **Construir** com o Claude Code, em passos pequenos, testando cada passo. Toda migration nova: aplicar e rodar o `testar_rls.sql` antes de seguir
5. **Auditar numa sessão nova** do Claude Code (`/clear` ou abra outro terminal): `/auditar-etapa <número>`. A sessão nova revisa o código sem as suposições de quem escreveu
6. **Corrigir** o que vocês escolherem da auditoria e rodar `npm run test:e2e`
7. **Atualizar o Roadmap:** `/atualizar-roadmap` (sempre antes do push)
8. **Enviar:** `git push -u origin <nome-da-branch>` e abra um **Pull Request** para a `main` no GitHub. A outra pessoa revisa e aceita

Os comandos `/auditar-etapa` e `/atualizar-roadmap` vêm do projeto antigo e serão recriados na Etapa 1, com as regras de negócio do Domora.
