# PAUTA — Roadmap

## Onde paramos

Última atualização: 26/10/2026 · por Hevelyn
Etapa atual: 3. Login e perfis, **concluída e aceita na `main`** (Pull Request #3). Próxima: Etapa 4 (imóvel), ainda não começada

26/10/2026:
- O commit do README da Etapa 3, que ficou de fora do Pull Request #3, foi levado para a `main` pela branch `docs-readme-e-termos`
- Decidido: os textos dos termos (exclusividade e assinatura) ficam para depois e **não travam a Etapa 4**. A Etapa 4 usa um termo de exclusividade provisório, com versão marcada como provisória; o texto final entra como versão nova antes do piloto (Etapa 13). Registrado na Visão geral ("Decisões tomadas em 26/10/2026"), no CLAUDE.md e no `docs/prompts.md`

Etapa 3 (concluída em 23/10/2026):
- 3.1 feito (22/10/2026): plano aprovado. Passos: **3.2a** (novo, antes do 3.2: confirmar com um `signUp` real se o código do erro do gatilho chega ao app; migration com CRECI normalizado, `creci_disponivel()`, `convite_valido()`, limpeza do `raw_user_meta_data` e os testes que faltam da auditoria da Etapa 2), 3.2 (`exigirTipo()`, áreas e `src/proxy.ts`), 3.3 (cadastro), 3.4 (login, saída, senha e `criar_admin.sql`), 3.5 (testes das áreas separadas, usando a tela "Minha conta" de cada área como a action de outra área). Decisões: a área do assinante fica em `/assinante` (as outras em `/proprietario` e `/admin`); login sempre conectado; CRECI só o número, UF SC fixa; link de recuperação com `token_hash` (trocar o modelo do e-mail no painel do Supabase); termo de assinatura só no 13.4 (Visão geral, "Decisões tomadas em 22/10/2026 (plano da Etapa 3)"). Ainda não se sabe se a confirmação de e-mail está ligada no Supabase compartilhado: conferir no 3.2a
- 3.2a feito (22/10/2026):
  - Um `signUp` real confirmou: CRECI repetido e convite inválido chegam ao app iguais, `500 "Database error saving new user"`, sem o código do erro. Por isso o app pergunta antes, com `creci_disponivel(creci)` e `convite_valido(codigo, email)`, que respondem só sim ou não e funcionam sem login
  - A confirmação de e-mail estava ligada no Supabase compartilhado; foi **desligada no painel** até a Etapa 13 (o SMTP padrão só entrega para a equipe do projeto). O cadastro já entra logado
  - Migration `20261022231442_cadastro_etapa_3`: `normalizar_creci()`, coluna `assinantes.creci_normalizado` com o `unique` (`12.345-J`, `12345J`, `12345-J SC` e `CRECI/SC 12345-J` são o mesmo CRECI), as duas funções acima e a limpeza do metadata no gatilho de cadastro
  - O teste real mostrou que o Supabase Auth regrava o metadata logo depois do cadastro e desfazia a limpeza. Correção na migration `20261022232122_limpar_metadata_do_cadastro`: gatilho `before update` em `auth.users` que tira `tipo`, `nome`, `telefone`, `creci`, `nome_imobiliaria` e `convite` em toda gravação. Conferido com `signUp` real: o banco e o token renovado ficam limpos; só o primeiro token, devolvido pelo `signUp`, ainda leva esses dados (o app nunca lê o tipo no token)
  - `testar_rls.sql`: 120 de 120 passando (13 testes novos, inclusive os que faltavam da auditoria da Etapa 2: metadata forjado, visitante chamando as funções do imóvel, proprietário e assinante chamando `reprovar_imovel`)
- 3.2 feito (22/10/2026):
  - `src/lib/auth.ts`: `exigirTipo(tipos, { assinaturaAtiva })` lê o usuário com `getClaims()` e o tipo em `perfis` (nunca no token). Sem login vai para `/entrar`; outro tipo vai para a própria área (`areaDoTipo()`); assinante sem acesso vai para `/aguardando-ativacao` (pendente) ou `/acesso-suspenso` (vencido ou bloqueado), pela `eh_assinante_ativo()` do banco. Também `usuarioAtual()` (sem redirecionar) e `TIPOS_ASSINANTE`. Nada fica em cache entre visitas: conferido que bloquear um assinante tira o acesso na hora, com o mesmo token
  - `src/proxy.ts`: renova a sessão do Supabase e manda para `/entrar` quem abre `/proprietario`, `/assinante` ou `/admin` sem sessão. Não é a proteção (não lê tipo nem assinatura)
  - Áreas `/proprietario`, `/assinante` e `/admin`: `layout.tsx` com o `AreaLogada` (menu de baixo no celular, menu lateral do `site.css` a partir de 768 px, quadro "quem está logado" num `<Suspense>`) e uma página inicial provisória que chama `exigirTipo()` dentro de um `<Suspense>`. Itens dos menus em `src/lib/menus.ts`; ícones em `src/components/ui/icones.tsx`; `MenuLateral` e `Logo` novos
  - `criarClienteServidor()` agora chama `connection()` antes do `cookies()`: sem isso, o Next acusa o `Date.now()` do cliente do Supabase ao adiantar a parte da sessão (Cache Components)
  - Conferido no navegador com contas de teste: proprietário, autônomo ativo e admin abrem só a própria área e voltam para ela ao digitar outra; imobiliária pendente vai para `/aguardando-ativacao`. `/entrar`, `/aguardando-ativacao` e `/acesso-suspenso` ainda dão 404 (3.3 e 3.4). Lint, tipos e build passam
  - Para o 3.5: assinante ativo não pode ser excluído (RF16). Para apagar a conta de teste, os testes voltam o status para `pendente` com a chave secreta antes de excluir
- 3.3 feito (22/10/2026):
  - Cadastro em três endereços, sem estado no navegador: `/cadastro` (proprietário), `/cadastro/imobiliaria` e `/cadastro/autonomo`. No celular seguem Cadastro e CadastroImobiliaria; a partir de 768 px, o SiteCadastro (painel escuro e os 3 perfis). Sem a caixa do termo de assinatura (13.4) e sem o preço (Etapa 11)
  - Server Action `cadastrar` (`src/app/cadastro/acoes.ts`): valida tudo no servidor com as regras do banco (`src/lib/validacao.ts`: telefone com 0 na frente e máscara, CRECI só o número com a UF SC fixa), pergunta `creci_disponivel()` antes do `signUp` e de novo se o banco recusar, e reconhece os erros do Supabase pelo `error.code` (`user_already_exists`, `email_exists`, `weak_password`, limites de tentativas). Mantém o que foi digitado (menos a senha) quando mostra erro. Proprietário vai para `/proprietario`; imobiliária e autônomo, para `/aguardando-ativacao`
  - `/aguardando-ativacao` (AguardandoAtivacao): "Cadastro recebido", o CRECI e os passos até a ativação. Quem não está pendente é mandado para a tela certa. O "Sair" entra no 3.4
  - Componente `Campo` (`.field` do protótipo), com dica e erro ligados à caixa para leitor de tela
  - `e2e/cadastro.spec.ts`: proprietário (telefone guardado limpo), imobiliária (pendente e barrada no catálogo), CRECI repetido escrito de outro jeito (mensagem clara, nada criado) e campos errados. `e2e/apoio/supabase.ts` cria e apaga as contas de teste com a chave secreta. `npm run test:e2e`: 12 de 12 passando, sem deixar conta no banco. Lint e build passam
  - Risco anotado (já em Pendências, Etapa 13): com a confirmação de e-mail desligada, o cadastro diz "Já existe uma conta com este e-mail", ou seja, revela quem tem conta
  - Lição: o `.next/dev` guardou também uma página estática antiga (a ordem dos campos não mudava, e o navegador acusava "Hydration failed"). Apagar `.next/dev` e reiniciar o `npm run dev` resolveu
- 3.4 feito (22/10/2026):
  - `/entrar` (Entrar e SiteEntrar, sem "manter conectado"): action `entrar` com `signInWithPassword`, lê o tipo em `perfis` e manda para `areaDoTipo()`. Erros pelo código (`invalid_credentials` dá "E-mail ou senha incorretos." para senha errada e para e-mail sem conta; `email_not_confirmed`; limite de tentativas)
  - Sair: action `sair` (`src/lib/sessao.ts`, confere só que há sessão) e `BotaoSair` no menu lateral, em `/aguardando-ativacao` e em `/acesso-suspenso`. No celular, o "Sair" das áreas entra na tela Minha conta (3.5)
  - Recuperação de senha (RF03): `/recuperar-senha` responde sempre "Confira seu e-mail", tenha o e-mail conta ou não; `/auth/confirmar` aceita o link com `token_hash` (qualquer navegador) e o `code` do modelo padrão, e o `proximo` só aceita caminho dentro do PAUTA; `/redefinir-senha` só troca a senha numa sessão aberta pelo link (`veioDeLinkDeRecuperacao()` lê o `amr` do token: quem só está logado não troca a senha sem saber a atual) e encerra a sessão depois de salvar
  - `/acesso-suspenso` (AcessoSuspenso): mensagem de pagamento vencido ou de bloqueio do admin, e o aviso para o corretor convidado. Pagar pelo app e o contato da equipe ficam para a Etapa 11
  - Página inicial (Main no celular, SiteInicio no computador), sem os links das páginas de teste da Etapa 1
  - `supabase/scripts/criar_admin.sql`: promove a admin uma conta de proprietário pelo e-mail digitado no SQL Editor (nada salvo no arquivo)
  - `supabase/modelos-email/recuperar-senha.html`: modelo do e-mail em português com o link `token_hash`
  - `e2e/login.spec.ts`: cada tipo entra e cai na tela certa (proprietário, admin, assinante ativo, pendente, vencido e bloqueado), senha errada, sair, pedido de senha sem revelar conta, link de recuperação de ponta a ponta (gerado pela chave secreta, sem e-mail), sessão comum não troca a senha e link forjado não sai do PAUTA. `npm run test:e2e`: 24 passando e 2 pulados de propósito (o teste de todos os tipos e o da senha nova rodam só no celular, pelo limite de logins do Supabase, de cerca de 30 a cada 5 minutos por endereço). Lint e build passam
  - **Falta fazer à mão no painel do Supabase** (ver "Atenção")
- 3.5 feito (22/10/2026):
  - Tela Minha conta (ProConta, CorConta, SiteConta) em `/proprietario/conta` e `/assinante/conta`: nome e telefone editáveis, e-mail só para leitura, "Trocar senha" (pelo link no e-mail) e, no celular, "Sair". Cada área tem a própria action (`salvarContaProprietario`, `salvarContaAssinante`), que chama `exigirTipo()` antes de `salvarDadosDaConta()` (`src/lib/conta.ts`). O corretor convidado vê que a assinatura fica com o responsável
  - `e2e/areas.spec.ts`: 16 casos de endereço digitado (visitante, proprietário, imobiliária ativa, admin e autônomo pendente, cada um tentando as outras áreas), Minha conta salvando, e a action de cada área chamada direto com a sessão de outro tipo. O teste grava a requisição real que a tela manda, confere que ela funciona para o dono e depois a reenvia como assinante, admin, pendente e visitante: nenhum nome muda. Cada conta entra uma vez só (`cookiesDeSessao`), por causa do limite de logins
  - `npm run test:e2e`: 60 passando e 2 pulados de propósito, sem deixar conta no banco. Lint e build passam
- 3.6 feito (23/10/2026): auditoria numa sessão nova (`/auditar-etapa 3`, com revisor separado). Nada crítico; 3 itens importantes e 8 melhorias. Lint, build, `testar_rls.sql` (120 de 120) e e2e passavam antes das correções
- 3.7 feito (23/10/2026): correções da auditoria, sem migration:
  - `/auth/confirmar`: o `proximo=/%09/outro.com` passava na checagem (o navegador apaga o TAB e vira `//outro.com`) e, com um link verdadeiro, levava para outro site já logado na conta de quem montou o link. Agora o endereço é conferido depois de montado (mesma origem). Teste novo no "link forjado"
  - Admin sem "Sair" no celular: o "Sair" fica no topo do painel, como no AdmPainel. Teste novo (só no celular)
  - `veioDeLinkDeRecuperacao()`: a sessão do link só troca a senha sem a atual até 15 minutos depois de aberta. Conferido com um link real que o `token_hash` grava `amr` `otp` (não `recovery`) e que o horário não muda quando o token é renovado
  - `/entrar` e `/cadastro` mandam quem já está logado para a própria área (`RedirecionarLogado`); antes, um cadastro trocava a sessão de quem estava logado. 3 casos novos em `areas.spec.ts`
  - `pedirLinkDeSenha` dá erro claro se faltar o `SITE_URL`; `exigirTipo()` trata assinante sem `assinante_id` como sem acesso (o banco já impede, mas o código não confiava nisso)
  - Itens 4, 8, 9, 10 e 11 da auditoria foram para "Pendências" (Etapas 5 e 13), marcados "auditoria da Etapa 3"
  - `npm run lint` e `npm run build` passam; `npm run test:e2e`: 67 passando e 3 pulados de propósito; `testar_rls.sql`: 120 de 120 (o banco não mudou)
  - "Pronto quando" conferido: cada tipo (visitante, proprietário, imobiliária ativa, admin, autônomo pendente) cai na própria área e é barrado nas outras digitando o endereço (`areas.spec.ts`, 19 casos), a action de outra área chamada direto não muda nada (`areas.spec.ts`), pendente, vencido e bloqueado caem na tela certa (`login.spec.ts`) e ninguém muda o próprio tipo nem o status pelo banco (`testar_rls.sql`)
- Próximo: `git push -u origin etapa-3-login` e o Pull Request da Etapa 3; depois, a Etapa 4 (decidir antes o texto do termo de exclusividade)

Etapa 2 (concluída em 22/10/2026):
- 2.1 feito (22/10/2026): modelo do MVP aprovado. Tabelas desta etapa: `perfis`, `assinantes` (imobiliária **ou** corretor autônomo: quem paga, com o CRECI único e o status da assinatura; o corretor convidado aponta para o assinante da imobiliária), `convites`, `tipos_imovel`, `bairros`, `imoveis`, `fotos_imovel` e `edicoes_imovel`. Visitas, propostas, contratos, avisos e cobranças entram nas etapas delas. Pontos do modelo: o contato do proprietário (telefone e e-mail) não fica no imóvel, só sai pela função `contato_do_proprietario()`; o `tipo` do perfil é definido só pelo banco no cadastro e não pode ser alterado pelo app; "em negociação" e "contrato em análise" são calculados, não guardados; a exclusividade guarda início e fim; a aprovação usa um contador de versão do imóvel (RF14). Divisão das migrations: 2.2 tipos e perfis; 2.3 assinantes e convites; 2.4 imóveis, fotos, edições e listas
- 2.2 feito (22/10/2026): migration `20261022171241_perfis` aplicada com `npx supabase db push`. Cria os tipos `tipo_usuario` e `status_assinatura`, a tabela `perfis` (o banco cria o perfil sozinho no cadastro, limpa o telefone e confere o DDD; por enquanto só aceita `proprietario`), as funções `meu_tipo()` e `eh_admin()` e o RLS: cada um lê só o próprio perfil, o admin lê todos, e pelo app só dá para mudar nome e telefone. Criado o `supabase/testes/testar_rls.sql`: 21 testes, todos passando, sem deixar dado nem schema no banco. Ele roda pelo terminal com `npx supabase db query --linked -f supabase/testes/testar_rls.sql` (ou colando no SQL Editor)
- 2.3 feito (22/10/2026): migration `20261022171933_assinantes_e_convites` aplicada. Tabela `assinantes` (imobiliária ou autônomo, CRECI guardado em maiúsculas e sem espaços, sem repetir, status só muda pelo admin: ele não marca `vencido` nem libera um vencido), coluna `perfis.assinante_id` (o corretor aponta para a imobiliária e segue o status dela), tabela `convites` (só o hash do código, uso único, validade padrão de 7 dias, só o responsável de imobiliária ativa cria), funções `meu_assinante_id()` e `eh_assinante_ativo()`. O cadastro agora aceita `imobiliaria` (nome_imobiliaria e creci), `autonomo` (creci) e `corretor` (convite). Excluir a conta do responsável de uma imobiliária pendente apaga o assinante e libera o CRECI; ativa não é excluída. `testar_rls.sql`: 58 de 58 passando
- 2.4 feito (22/10/2026): migration `20261022221614_imoveis` aplicada. Listas `tipos_imovel` e `bairros` (vazias: o conteúdo está em Pendências da Etapa 4), `imoveis`, `fotos_imovel` e `edicoes_imovel`. O imóvel do proprietário nasce pendente e só existe com o termo aceito; status e exclusividade só mudam pelas funções `aprovar_imovel(id, versao)` (admin; falha se a versão mudou; marca 6 meses de exclusividade), `reprovar_imovel(id, motivo)` (admin) e `reenviar_imovel(id)` (dono). Assinante ativo vê só imóvel disponível; o contato só sai por `contato_do_proprietario(id)`. Edição do dono em imóvel disponível (inclusive fotos) fica registrada; a do admin, não. O dono apaga só pendente ou reprovado. `testar_rls.sql`: 103 de 103 passando
- 2.5 feito (22/10/2026): conferido que o roteiro cobre os 4 casos pedidos (assinante pendente, bloqueado ou vencido não vê imóvel; assinante ativo vê só o disponível e não vê contato escondido; proprietário não vê nem edita imóvel de outro; ninguém muda o próprio tipo nem o próprio status)
- 2.6 feito (22/10/2026): auditoria numa sessão nova. Nada crítico; 7 itens importantes e 10 melhorias. Os itens 1 e 7 foram corrigidos no 2.7; o resto foi para "Pendências" (marcados "auditoria da Etapa 2")
- 2.7 feito (22/10/2026): correções da auditoria:
  - Item 1: um vencido voltava a ativo sem pagar (vencido → bloqueado → ativo). Migration `20261022224630_bloqueio_separado_do_pagamento`: o bloqueio do admin virou a coluna `assinantes.bloqueado_pelo_admin`, separada do status, que agora é só `pendente`, `ativo` ou `vencido`. Pelo app, o status só muda de pendente para ativo; o acesso exige status ativo **e** não bloqueado. 4 testes novos (bloquear e desbloquear, vencido desbloqueado continua sem acesso, não volta a pendente, imobiliária não se desbloqueia)
  - Item 7: o teste "aprovação falha se o imóvel mudou" agora muda o imóvel pelo caminho real (foto nova do proprietário num pendente) e confere a mensagem do erro, não só o código
  - `testar_rls.sql`: 107 de 107 passando, sem deixar dado no banco
  - "Pronto quando" conferido: o `testar_rls.sql` passa inteiro (107 de 107) e o teste "Assinante bloqueado não vê nenhum imóvel" dá 0 de 5 imóveis, enquanto o assinante ativo vê 1 (o disponível). Também não veem nada o pendente, o vencido e o corretor de imobiliária bloqueada. `npm run lint` e `npm run build` passam (a etapa não mexeu no app)
- O verificador do Supabase (`npx supabase db advisors --linked`) mostra avisos "Signed-In Users Can Execute SECURITY DEFINER Function" para `meu_tipo()`, `eh_admin()`, `meu_assinante_id()`, `eh_assinante_ativo()`, `contato_do_proprietario()`, `aprovar_imovel()`, `reprovar_imovel()` e `reenviar_imovel()`. São intencionais: cada uma confere por dentro quem chama, e o roteiro testa isso. Mostra também 2 avisos de desempenho "multiple permissive policies" em `imoveis` (3 regras de leitura e 2 de edição separadas): no volume do piloto não pesa; dá para juntar numa migration nova se o catálogo ficar lento (Etapa 6)
- Para a Etapa 4: o banco exige o termo aceito no momento do cadastro do imóvel (o `termo_versao` vai junto no insert). No protótipo, o termo vem depois das fotos (ProNovo → ProFotos → ProTermo): o plano da Etapa 4 precisa decidir a ordem (ex.: guardar o formulário e as fotos no navegador e criar o imóvel no aceite). Editar imóvel pendente está bloqueado no banco até a decisão em Pendências. A captação pelo admin (função que cria o imóvel já disponível) fica para o passo 4.7
- Para a Etapa 3 (cadastro): o app envia em `options.data` do signUp `tipo`, `nome` e `telefone`, e mais `nome_imobiliaria` e `creci` (imobiliária), `creci` (autônomo) ou `convite` (corretor). No banco, CRECI repetido dá erro `23505` e convite inválido, tipo não permitido ou falta de CRECI dão `P0001`, mas talvez esse código não chegue ao app (ver "Pendências", Etapa 3)
- Para a Etapa 5: a validade de 7 dias do convite foi escolhida no 2.3 por falta de definição; dá para mudar só o padrão da coluna `convites.expira_em`. Bloquear e desbloquear é a coluna `assinantes.bloqueado_pelo_admin` (passo 2.7), não o status
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
- Contar ao Gabriel as decisões de 22/10/2026 (Visão geral, as duas seções "Decisões tomadas em 22/10/2026") e a mudança do bloqueio (o "Atenção" abaixo)
- Feito em 23/10/2026 no painel do Supabase: "Site URL" `http://localhost:3000` e "Redirect URLs" `http://localhost:3000/**`. **Não deu para trocar o modelo do e-mail**: o plano gratuito do Supabase só deixa editar os modelos com SMTP próprio. Até a Etapa 13, o e-mail de recuperação usa o modelo padrão (em inglês, link com `code`), que a rota `/auth/confirmar` já aceita, mas que só funciona no mesmo navegador em que a senha nova foi pedida. Testar à mão: pedir uma senha nova em `/recuperar-senha` com o próprio e-mail e abrir o link **no mesmo navegador**
- Criar a branch `etapa-4-imovel` a partir da `main` atualizada (depois que o Pull Request da branch `docs-readme-e-termos` for aceito)
- **Antes da Etapa 4**: decidir com o Gabriel as pendências da Etapa 4 abaixo (editar imóvel pendente ou em negociação, listas de tipos e bairros, limite das fotos). O texto do termo não trava mais: a etapa usa um provisório. Depois, o passo 4.1 numa sessão nova (`/clear` e modo de planejamento)

Antes da Etapa 1 (fazer à mão, cada pessoa pelo próprio painel):
- [ ] Avisar o Gabriel do replanejamento e da troca do nome para PAUTA, e combinar o arquivamento
- [ ] Fechar sem aceitar o Pull Request da Etapa 3 no `imobilink`
- [ ] Arquivar o repositório `HevelynLV/imobilink` (GitHub → Settings → General → Danger Zone → Archive this repository). Ele fica só leitura e serve de consulta
- [x] Criar o repositório no GitHub: existe como `HevelynLV/PAUTA`, já com os documentos do planejamento
- [x] Criar um projeto novo no Supabase (região São Paulo), com o nome PAUTA
- [ ] Convidar o Gabriel para o projeto Supabase do PAUTA
- [ ] Depois que o projeto novo estiver funcionando: pausar o projeto antigo do Supabase (`gaxvhygqwcvfgpudywmi`)

Pendências e decisões em aberto (cada uma precisa estar resolvida antes da etapa indicada). Os itens marcados com **(banco)** mudam tabelas ou status: como a Etapa 2 modela o banco do MVP inteiro, vale decidi-los antes do passo 2.1, mesmo que a etapa deles venha depois. Ao decidir, registrar em "Decisões tomadas" na Visão geral (com a data) e no CLAUDE.md, e tirar daqui.

- Etapa 4:
  - (auditoria da Etapa 2) Os gatilhos confiam em `current_user = 'authenticated'` ou em `auth.uid()`: quem usar a chave secreta (`admin.ts`, criado no 4.7 ou no 5.2) pula a regra de status do assinante, a data do aceite do termo e o registro de edições. Escrever isso no `admin.ts` e nunca usá-lo para editar imóvel ou status
  - (auditoria da Etapa 2) **(banco)** `fotos_imovel.caminho` aceita qualquer texto, inclusive o arquivo de outro imóvel: exigir que comece com o id do imóvel (`check (caminho like imovel_id::text || '/%')`), alinhado com as políticas do bucket
  - (auditoria da Etapa 2) Captação (4.7): o gatilho de cadastro exige tipo, nome e telefone no momento em que a conta é criada; o `admin.createUser` do dono precisa mandar esses dados no metadata
  - (auditoria da Etapa 2) **(banco)** `termo_versao` aceita qualquer texto (conferir contra uma tabela de versões do termo); tipo e bairro com `ativo = false` continuam aceitos no imóvel; `revisado_por` e `revisado_em` são livres para o admin (preencher por gatilho com `auth.uid()` e `now()`); a versão e o registro de edições usam listas de campos diferentes, que podem divergir (`20261022221614_imoveis.sql:218-224` e `:253-255`)
  - (auditoria da Etapa 2) O proprietário não liga nem desliga `mostrar_contato` num imóvel pendente (o RF13 em "Meus imóveis"): decidir junto com "editar imóvel pendente", abaixo
  - (auditoria da Etapa 2) Testes que faltam: apagar imóvel reprovado com fotos; não apagar vendido nem expirado; editar reprovado deixa o status `reprovado`; proprietário não envia `termo_aceito_em`, `captado_pelo_admin` nem `status` no insert e não muda `termo_versao` depois; assinante bloqueado não vê fotos; assinante não grava em `tipos_imovel` nem em `bairros` e não lê `edicoes_imovel`. As regras do banco usam todas o código `P0001`: nos testes novos, conferir também a mensagem
  - Termo de exclusividade provisório (decidido em 26/10/2026): o plano do 4.1 define onde o texto fica e como a versão provisória é marcada, de um jeito que a versão final entre depois sem mudar o fluxo (ligar com a pendência do `termo_versao` acima)
  - O proprietário pode editar imóvel pendente de aprovação? Se puder, a edição é registrada?
  - O proprietário pode editar imóvel em negociação (ex.: mudar o preço com propostas aceitas)? Vale a mesma regra de "edição de imóvel disponível"?
  - Conteúdo das listas de tipos de imóvel (hoje: casa, apartamento, cobertura, terreno, sala comercial) e de bairros de Florianópolis (hoje só 6 no protótipo). Que são listas fixas no banco já foi decidido em 22/10/2026
  - Limite das fotos: o protótipo usa JPG ou PNG de até 10 MB cada
- Etapa 5:
  - (auditoria da Etapa 2) Convite por e-mail: o `inviteUserByEmail` do Supabase cria a conta antes de o corretor informar nome e telefone, e o gatilho de cadastro recusa. Decidir no plano da etapa (ex.: o e-mail só leva o link do app, e o cadastro normal usa o código)
  - (auditoria da Etapa 2) O `token_hash` do convite é sha256 sem sal, escolhido por quem cria o convite: gerar o código no servidor com pelo menos 128 bits aleatórios, ou criar o convite por uma função do banco que gera o código
  - (auditoria da Etapa 2) Testes que faltam: responsável não escolhe `expira_em` nem `usado_em` ao criar convite; corretor convidado de imobiliária ativa **vê** o imóvel disponível
  - (auditoria da Etapa 3) **(banco)** Decidir antes da ativação de assinantes (5.2): `normalizar_creci()` trata `12345` e `12345J` como CRECIs diferentes, então o mesmo número entra duas vezes, com e sem a letra. A letra conta na comparação? Até lá, o admin confere à mão
  - (auditoria da Etapa 3) Teste Playwright no 5.4: corretor convidado perde o acesso na hora quando a imobiliária é bloqueada ou vence (hoje só o `testar_rls.sql` e o `eh_assinante_ativo()` cobrem)
- Etapa 6:
  - Quais filtros o catálogo terá (o protótipo sugere tipo, status, bairro, faixa de preço, quartos e busca por título ou bairro)
  - (auditoria da Etapa 2) O assinante lê todas as colunas do imóvel, inclusive `proprietario_id`, `exclusividade_fim` (diz quando o PAUTA perde a exclusividade, o que ajuda a desintermediação), `termo_versao`, `captado_pelo_admin` e `versao`. Servir o catálogo por uma view ou função só com as colunas do corretor
- Etapa 7:
  - Visita recusada: o proprietário escreve um motivo ou sugere outro horário? (no protótipo, só recusa)
  - Horários da visita: livres ou em horários fixos (o protótipo usa horários das 09:00 às 17:00), e se o recado do corretor ao proprietário entra
  - O proprietário também vê o CRECI do corretor nas visitas e propostas? (o protótipo mostra; a Visão geral fala só em nome, imobiliária e contato)
- Etapa 8:
  - **(banco)** Campos da proposta: o protótipo pede valor, forma de pagamento (à vista, financiamento, permuta), condições e o nome do comprador. O RF23 fala só em "valor e condições". O nome do comprador é dado pessoal de outra pessoa (LGPD): entra ou não?
  - (auditoria da Etapa 2) `imoveis.tem_proposta_aceita` é uma coluna guardada, embora o texto diga que "em negociação" é calculado. Calcular na consulta, ou manter a coluna por gatilho em `propostas` (aceitar, desfazer aceite, recusa em massa da Etapa 9) com teste
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
  - (auditoria da Etapa 2) LGPD: `imoveis.proprietario_id` não tem `on delete` e só assinante pendente pode ser excluído, então proprietário com imóvel e assinante ativo não podem ser apagados. Planejar a anonimização no 13.4
  - (auditoria da Etapa 2) Dois cadastros com o mesmo convite e duas aprovações do mesmo imóvel ao mesmo tempo estão protegidos pela leitura do código (`for update` no convite, `where versao = ...` na aprovação), mas não há teste com duas conexões. Incluir no roteiro completo (13.5)
  - Trocar o e-mail da conta: na tela Minha conta (passo 3.5) o e-mail fica só para leitura, porque a troca precisa de confirmação pelo próprio e-mail (SMTP). Decidir se o usuário troca sozinho (com "Secure email change" ligado) ou só pela equipe PAUTA
  - Com o SMTP próprio, colar no painel (Authentication → Emails → Reset password) o modelo em português de `supabase/modelos-email/recuperar-senha.html`, com o link `token_hash` decidido no 3.1 (o plano gratuito não deixa editar os modelos sem SMTP próprio). Conferir que o link funciona abrindo o e-mail em outro navegador, e que `/redefinir-senha` aceita a sessão (o `amr` do token tem "recovery" ou "otp")
  - (auditoria da Etapa 3) Depois da senha nova, `redefinirSenha` encerra só a sessão deste aparelho (`scope: "local"`). Conferir se o Supabase encerra as outras sozinho; se não, chamar `signOut({ scope: "others" })` antes
  - (auditoria da Etapa 3) Risco aceito, registrar no 13.4: `creci_disponivel()` responde a visitantes, então dá para descobrir se um CRECI já está no PAUTA (o CRECI é público)
  - (auditoria da Etapa 3) No roteiro completo (13.5), rodar também no computador os testes "cada tipo entra e cai na tela certa" e "link de recuperação cria a senha nova" (hoje só no celular, pelo limite de logins): a tela SiteEntrar não tem login testado
  - (auditoria da Etapa 3) Com a confirmação de e-mail religada, o link de confirmação do cadastro também abre uma sessão `otp`, que troca a senha sem a atual por 15 minutos (`veioDeLinkDeRecuperacao()`). É aceitável (a pessoa acabou de provar que é dona do e-mail), mas conferir junto com o modelo de e-mail
  - Religar a confirmação de e-mail no Supabase (Authentication → Sign In / Providers → Email → "Confirm email"): desligada em 22/10/2026 (passo 3.2a) porque o SMTP padrão só entrega para a equipe do projeto. Com ela ligada, o cadastro passa a mostrar "confira seu e-mail" em vez de entrar logado
  - Texto final do termo de exclusividade, que substitui o provisório da Etapa 4 como versão nova. Conferir que nenhum imóvel real ficou com o aceite da versão provisória
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
- **Migrations novas da Etapa 3** (`20261022231442_cadastro_etapa_3` e `20261022232122_limpar_metadata_do_cadastro`): já aplicadas no Supabase compartilhado. Depois do `git pull`, confira com `npx supabase migration list` (Local e Remote iguais). O CRECI repetido agora é conferido pelo `creci_normalizado`
- **A confirmação de e-mail foi desligada** no painel do Supabase em 22/10/2026, até a Etapa 13: o cadastro entra logado direto
- **E-mail de recuperação de senha** (passo 3.4): o modelo do PAUTA fica em `supabase/modelos-email/recuperar-senha.html`, mas só pode ser colado no painel com SMTP próprio (Etapa 13). Até lá vale o modelo padrão do Supabase: o link só funciona no mesmo navegador em que a senha nova foi pedida, e o SMTP padrão só entrega e-mail para quem é da equipe do projeto
- **Admin**: para ter um admin de teste, cadastre-se como proprietário pelo app e rode `supabase/scripts/criar_admin.sql` no SQL Editor com o seu e-mail
- **Testes e2e** (`npm run test:e2e`): usam a `SUPABASE_SECRET_KEY` do `.env.local` para criar e apagar contas `e2e-…@exemplo.com`. Rodar a bateria várias vezes seguidas pode esbarrar no limite de logins do Supabase (cerca de 30 a cada 5 minutos): espere alguns minutos
- **Migrations novas no banco** (`20261022171241_perfis`, `20261022171933_assinantes_e_convites`, `20261022221614_imoveis` e `20261022224630_bloqueio_separado_do_pagamento`): já estão aplicadas no Supabase compartilhado, não precisa rodar `db push` para elas. Depois do `git pull`, confira com `npx supabase migration list` (Local e Remote iguais). Não use o `imobilink` nem o projeto Supabase antigo para trabalho novo
- O protótipo mudou na Etapa 0 (63 telas). O arquivo de estilo agora se chama `pauta.css` (antes, `domora.css`); o Roadmap de prompts já usa o nome novo nos passos 1.2 e 1.6
- Mudou no 2.7: "bloqueado" não é mais um status da assinatura. O status é só `pendente`, `ativo` ou `vencido`, e o bloqueio do admin é a coluna `assinantes.bloqueado_pelo_admin`. Tem acesso quem está `ativo` e não bloqueado
- Decisões novas de 22/10/2026 (status vencido separado do bloqueado, corretor autônomo pela tela pública, chave de admin só no servidor e outras): veja "Decisões tomadas em 22/10/2026" na Visão geral. As 3 marcadas com **(banco)** que sobraram em "Pendências" não travam o passo 2.1

## Migrations aplicadas no banco

Toda migration nova entra aqui assim que for aplicada e o `testar_rls.sql` passar. Para conferir: `npx supabase migration list` (coluna Remote).

- `20261022171241_perfis` · 22/10/2026 · Hevelyn · tipos, perfis, `meu_tipo()`, `eh_admin()` e o gatilho de cadastro. `testar_rls.sql`: 21 de 21 passando
- `20261022171933_assinantes_e_convites` · 22/10/2026 · Hevelyn · assinantes, convites, `meu_assinante_id()`, `eh_assinante_ativo()` e o cadastro de imobiliária, autônomo e corretor. `testar_rls.sql`: 58 de 58 passando
- `20261022221614_imoveis` · 22/10/2026 · Hevelyn · listas de tipos e bairros, imóveis, fotos, registro de edições, aprovar/reprovar/reenviar e `contato_do_proprietario()`. `testar_rls.sql`: 103 de 103 passando
- `20261022224630_bloqueio_separado_do_pagamento` · 22/10/2026 · Hevelyn · correção da auditoria (item 1): bloqueio do admin numa coluna própria (`bloqueado_pelo_admin`), status só `pendente`/`ativo`/`vencido`, e o acesso exige ativo e não bloqueado. `testar_rls.sql`: 107 de 107 passando
- `20261022231442_cadastro_etapa_3` · 22/10/2026 · Hevelyn · CRECI normalizado (`normalizar_creci()`, `creci_normalizado` com `unique`), `creci_disponivel()` e `convite_valido()` sem login, e limpeza do metadata no gatilho de cadastro. `testar_rls.sql`: 119 de 119 passando
- `20261022232122_limpar_metadata_do_cadastro` · 22/10/2026 · Hevelyn · correção: gatilho `before update` em `auth.users` que tira os dados copiados do metadata, porque o Supabase Auth regravava o metadata depois do cadastro. `testar_rls.sql`: 120 de 120 passando

## Etapas do MVP

- [x] 0. Protótipo do design — Pronto quando: o fluxo inteiro pode ser clicado, do cadastro do imóvel até o vendido
- [x] 1. Setup — Pronto quando: a página abre em localhost, conecta ao Supabase novo e o código está no repositório `PAUTA`
- [x] 2. Banco de dados — Pronto quando: o `testar_rls.sql` passa e um assinante bloqueado não vê nenhum imóvel
- [x] 3. Login e perfis — Pronto quando: cada tipo de usuário só abre a própria área
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
- 22/10/2026 · Hevelyn · Etapa 2 concluída: banco do MVP para contas e imóveis (perfis, assinantes, convites, listas, imóveis, fotos e registro de edições), com RLS, permissões por coluna e `contato_do_proprietario()`. 4 migrations e `testar_rls.sql` com 107 testes passando. Auditoria sem itens críticos; o bloqueio do admin foi separado do status do pagamento e o teste de aprovação foi corrigido; o resto foi para "Pendências"
- 23/10/2026 · Hevelyn · Etapa 3 concluída: cadastro de proprietário, imobiliária e autônomo, login, saída, recuperação de senha, `exigirTipo()`, áreas separadas com menus e Minha conta. 2 migrations, `testar_rls.sql` com 120 testes e e2e com 67 passando. Auditoria sem itens críticos; corrigidos o redirecionamento para fora do site em `/auth/confirmar`, o "Sair" do admin no celular, o prazo da sessão do link de senha e o redirecionamento de quem já está logado; o resto foi para "Pendências"
- 26/10/2026 · Hevelyn · README da Etapa 3 levado para a `main`. Decidido que os textos dos termos ficam para depois: a Etapa 4 usa um termo de exclusividade provisório e o texto final entra antes do piloto
