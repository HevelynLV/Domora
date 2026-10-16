# PAUTA — Roadmap

## Onde paramos

Última atualização: 16/10/2026 · por Hevelyn
Etapa atual: 0. Protótipo do design (nenhum código escrito ainda)

O que aconteceu (replanejamento de 13 e 14/10/2026 e troca de nome em 16/10/2026):
- O projeto antigo se chamava **Captador** (repositório `HevelynLV/imobilink`, pasta local `capimoveis`). Ele chegou até a Etapa 3 (login e perfis), mas o modelo de negócio mudou tanto que vamos recomeçar do zero
- No replanejamento, o app passou a se chamar Domora e, em 16/10/2026, **PAUTA**. O produto inteiro foi redefinido: ideia, diferencial, usuários, 32 requisitos funcionais, 16 não funcionais e 14 etapas. Tudo está em "PAUTA - Visão geral da plataforma", que é a fonte da verdade do projeto
- As mudanças que mais pesam em relação ao Captador: não existe mais reserva (vários corretores trabalham o mesmo imóvel ao mesmo tempo); a exclusividade é de 6 meses, com aviso e renovação; o proprietário confirma as visitas, aceita várias propostas e vê os dados do corretor; o contrato é assinado fora do app e o admin confere o PDF; a receita é mensalidade (Asaas) mais uma % da comissão; os avisos saem por WhatsApp; corretores entram por convite da imobiliária; corretor autônomo pode assinar; o piloto é em Florianópolis

Próximo passo exato:
- **Etapa 0, protótipo do design.** Hevelyn vai mandar as referências visuais (sites ou apps de que gosta, cores, logo, o que não gosta). Com elas, fazer um protótipo clicável, pensado primeiro para celular, com estas telas:
  - Entrada: página inicial, login e cadastro (proprietário ou imobiliária)
  - Proprietário: meus imóveis; cadastro do imóvel com fotos e termo; detalhe do imóvel com pedidos de visita, propostas (aceitar ou recusar) e a opção de mostrar o contato
  - Corretor: catálogo com filtros e status; detalhe do imóvel; pedir visita; enviar proposta; enviar contrato; lista de avisos
  - Admin: imóveis para aprovar; captar imóvel; assinantes para ativar; contratos para conferir
- O protótipo está pronto quando o fluxo inteiro pode ser clicado, do cadastro do imóvel até o "vendido". Ajustes de fluxo que aparecerem nele voltam para a Visão geral antes da Etapa 1

Antes da Etapa 1 (fazer à mão, cada pessoa pelo próprio painel):
- [ ] Avisar o Gabriel do replanejamento e da troca do nome para PAUTA, e combinar o arquivamento
- [ ] Fechar sem aceitar o Pull Request da Etapa 3 no `imobilink`
- [ ] Arquivar o repositório `HevelynLV/imobilink` (GitHub → Settings → General → Danger Zone → Archive this repository). Ele fica só leitura e serve de consulta
- [ ] Criar o repositório `pauta` no GitHub, vazio
- [ ] Criar um projeto novo no Supabase (região São Paulo), com o nome PAUTA, e convidar o Gabriel
- [ ] Depois que o projeto novo estiver funcionando: pausar o projeto antigo do Supabase (`gaxvhygqwcvfgpudywmi`)

Pendências e decisões em aberto (cada uma precisa estar resolvida antes da etapa indicada):
- Etapa 4: texto do termo de exclusividade que o proprietário aceita no cadastro
- Etapa 6: quais filtros o catálogo terá
- Etapa 9: qual a % de comissão do PAUTA (sobre a comissão do corretor ou sobre o valor do imóvel)
- Etapa 10: provedor da API oficial do WhatsApp (Meta direto ou um intermediário como Twilio ou Z-API) e o custo por mensagem
- Etapa 11: preço da mensalidade (igual para imobiliária e corretor autônomo?)
- Etapa 12: com quanto tempo de antecedência sai o aviso de vencimento da exclusividade, e se a renovação é por mais 6 meses
- Etapa 13: termo de assinatura do corretor e da imobiliária, com a cláusula contra desintermediação e a responsabilidade da imobiliária pelos corretores convidados

Lições do Captador (problemas já encontrados no projeto antigo; tratar desde o início no PAUTA):
- Etapa 1: o Next.js 16 tem mudanças grandes em relação ao que os tutoriais mostram. Antes de escrever código, ler o guia em `node_modules/next/dist/docs/` (o arquivo `AGENTS.md` gerado pelo Next avisa isso)
- Etapa 1: no Captador, as migrations eram aplicadas à mão pelo SQL Editor, e o histórico de migrations do Supabase ficava vazio. No projeto novo dá para decidir, desde o início, se continua assim ou se passa a usar `supabase db push`. Decidir antes da primeira migration
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
- Primeira vez no projeto? Veja o "PAUTA README" e a "PAUTA - Visão geral da plataforma"
- O nome do app agora é **PAUTA** (antes, Domora). Repositório e projeto Supabase devem ser criados já com o nome novo
- Ainda não existe repositório nem banco do PAUTA. Não use o `imobilink` nem o projeto Supabase antigo para trabalho novo

## Migrations aplicadas no banco

Nenhuma ainda. O projeto Supabase do PAUTA será criado na Etapa 1. Toda migration nova entra aqui assim que for aplicada e o `testar_rls.sql` passar.

## Etapas do MVP

- [ ] 0. Protótipo do design — Pronto quando: o fluxo inteiro pode ser clicado, do cadastro do imóvel até o vendido
- [ ] 1. Setup — Pronto quando: a página abre em localhost, conecta ao Supabase novo e o código está no repositório `pauta`
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
