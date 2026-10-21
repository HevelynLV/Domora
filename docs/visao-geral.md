# PAUTA — Visão geral da plataforma

Última revisão: 16/10/2026 · Hevelyn

## Ideia

O PAUTA é um marketplace de imóveis exclusivos: um catálogo de imóveis captados por nós ou cadastrados pelo próprio proprietário, que imobiliárias e corretores autônomos acessam pagando uma mensalidade, para vender.

Como funciona, em seis passos:

1. O **proprietário/admin** cadastra o imóvel com fotos e informações na plataforma, e o proprietário aceita o termo de exclusividade: durante o prazo, o imóvel só é vendido pelo PAUTA. O imóvel captado pelo admin fica vinculado à conta do dono real, que passa a usar o app como qualquer proprietário.
2. O imóvel cadastrado direto pelo proprietário precisa ser validado pelo admin antes de entrar no catálogo.
3. A **imobiliária/corretor** assinante navega no catálogo pelo celular ou pelo site. Qualquer corretor pode trabalhar qualquer imóvel, ao mesmo tempo que outros corretores.
4. O **corretor** pede uma visita pelo app, sugerindo um horário, e o proprietário confirma ou recusa no app.
5. O corretor envia propostas pelo app. O proprietário aceita ou recusa cada uma e pode negociar com vários corretores ao mesmo tempo.
6. O contrato é assinado fora do app (Clicksign ou outro meio), por todas as partes. O corretor envia o contrato assinado, o admin confere e, ao aprovar, o imóvel vira **vendido** e todas as outras propostas em aberto são recusadas automaticamente. O pagamento da venda também acontece fora da plataforma.

O proprietário acompanha tudo pelo app (status, visitas, propostas), com opção de escolher se quer ter seu contato/perfil exposto durante as negociações de seus imóveis.

## Diferencial

O PAUTA reúne num só catálogo imóveis conferidos, captados por nós ou pelos proprietários, e dá ao proprietário controle sobre visitas, propostas e o próprio contato. O peso de cada ponto abaixo ainda precisa ser validado com proprietários e imobiliárias reais.

- **Imóveis exclusivos:** durante o prazo da exclusividade, o imóvel só é vendido pelo PAUTA, e não está anunciado por várias imobiliárias ao mesmo tempo.
- **Curadoria:** todo imóvel passa pela aprovação do admin antes de aparecer, e toda imobiliária tem o CRECI conferido antes de entrar.
- **Privacidade do proprietário:** ele escolhe se mostra o próprio contato; se não mostrar, visitas e propostas passam só pelo app.
- **Transparência para o proprietário:** ele vê em tempo real as visitas e propostas do próprio imóvel.
- **Para a imobiliária e o corretor:** acesso a um estoque que não precisou captar, por uma mensalidade fixa e uma % da comissão só quando a venda fecha.

## Nome do app

O nome usado em toda a documentação é **PAUTA** (antes, Domora e, antes disso, Captador). O repositório novo no GitHub vai se chamar `pauta`; o antigo, `imobilink`, fica arquivado para consulta.

## Usuários e perfis

O app tem três tipos de usuário, cada um com a própria área, que os outros não conseguem abrir.

| Perfil | O que faz | Como entra |
| --- | --- | --- |
| Proprietário | Cadastra o imóvel, confirma visitas, aceita ou recusa propostas, escolhe se mostra o contato | Cadastro pelo app, com telefone obrigatório, ou conta vinculada pelo admin ao imóvel captado |
| Imobiliária / corretor / corretor autônomo | Assinante: vê o catálogo, pede visitas, envia propostas e envia o contrato assinado | Cadastro pelo app com nome da imobiliária e CRECI; entra como pendente até o admin ativar |
| Admin | Cadastra imóveis captados, aprova ou reprova imóveis, ativa ou bloqueia assinantes, revisa edições, confere contratos | Criado à mão no banco, nunca pelo app |

Uma imobiliária pode ter vários corretores, cada um com login próprio, que entra por convite do responsável e fica vinculado à imobiliária em que trabalha.

## Tecnologias

O PAUTA é um web app responsivo (PWA), feito primeiro para celular e site, sem app nas lojas no MVP.

| Camada | Tecnologia | Para quê | Quando entra |
| --- | --- | --- | --- |
| Interface e servidor | Next.js 16 (App Router), React 19, TypeScript | Telas, Server Actions e rotas | Etapa 1 |
| Estilo | Tailwind CSS 4 | Layout responsivo | Etapa 1 |
| Banco de dados | Supabase (Postgres) com RLS | Dados e regras de acesso direto no banco | Etapas 1 e 2 |
| Login | Supabase Auth | Cadastro, login, recuperação de senha | Etapa 3 |
| Arquivos | Supabase Storage | Fotos dos imóveis e contratos assinados (PDF) | Etapas 4 e 9 |
| Testes | Playwright (ponta a ponta) e roteiro SQL `testar_rls.sql` | Garantir que as regras de acesso não quebram | Desde a Etapa 2 |
| Código e hospedagem | GitHub e Vercel | Versionamento e publicação | GitHub na Etapa 1; Vercel na Etapa 13 |
| E-mail | SMTP próprio (ex.: Resend) | E-mails de confirmação e recuperação em português | Etapa 13, antes do piloto |
| Cobrança | Asaas | Mensalidade dos assinantes | Etapa 11 |
| Avisos | API oficial do WhatsApp Business | Avisos de visita, proposta, contrato e vencimento da exclusividade | Etapa 10 (provedor em aberto) |

Uma regra vale para toda a stack: chaves e senhas ficam no `.env.local`, e a chave secreta do Supabase nunca vai para o navegador.

## Requisitos funcionais

O que o app faz. Todos os 32 estão a construir no repositório novo (RF01 a RF04 já existem no `imobilink` arquivado e servem de referência).

| ID | Módulo | Requisito | Situação |
| --- | --- | --- | --- |
| RF01 | Contas | Cadastro como proprietário ou imobiliária, com e-mail, senha, nome e telefone com DDD | A construir |
| RF02 | Contas | Imobiliária informa nome e CRECI; o CRECI não pode repetir; entra com assinatura pendente | A construir |
| RF03 | Contas | Login, logout e recuperação de senha por e-mail | A construir |
| RF04 | Contas | Cada tipo de usuário só abre a própria área, nem digitando o endereço | A construir |
| RF05 | Contas | O responsável pela imobiliária convida corretores por e-mail ou link; o corretor cria a conta pelo convite e já entra vinculado e ativo, sem nova conferência do admin | A construir |
| RF06 | Contas | Corretor autônomo se cadastra com o próprio CRECI e assina sem imobiliária | A construir |
| RF07 | Imóvel | Proprietário cadastra imóvel (título, descrição, tipo, endereço, bairro, preço, quartos, banheiros, vagas, área) e aceita o termo de exclusividade | A construir |
| RF08 | Imóvel | Admin cadastra imóvel captado e o vincula à conta de proprietário do dono real; esse imóvel não passa por validação | A construir |
| RF09 | Imóvel | Enviar fotos do imóvel e definir a ordem | A construir |
| RF10 | Imóvel | Editar imóvel disponível sem nova aprovação, registrando cada campo alterado para o admin | A construir |
| RF11 | Imóvel | Editar e reenviar imóvel reprovado para aprovação | A construir |
| RF12 | Imóvel | Apagar imóvel pendente de aprovação ou reprovado | A construir |
| RF13 | Imóvel | Proprietário escolhe se mostra o próprio contato aos corretores | A construir |
| RF14 | Admin | Aprovar ou reprovar imóvel cadastrado pelo proprietário; a aprovação falha se o imóvel mudou depois que o admin abriu a tela | A construir |
| RF15 | Admin | Ativar ou bloquear assinante depois de conferir o CRECI à mão | A construir |
| RF16 | Admin | Excluir imobiliária pendente com o usuário dela, liberando o CRECI | A construir |
| RF17 | Admin | Revisar as edições de imóveis disponíveis e marcar como revisadas | A construir |
| RF18 | Catálogo | Só assinantes ativos veem o catálogo, e só imóveis aprovados aparecem | A construir |
| RF19 | Catálogo | Filtrar o catálogo no celular e no site (quais filtros: a definir) | A construir |
| RF20 | Catálogo | O corretor vê no catálogo só dois status: disponível ou em negociação (há proposta aceita). O imóvel continua recebendo visitas e propostas e sai do catálogo assim que o admin aprova o contrato | A construir |
| RF21 | Visita | Corretor pede visita pelo app, sugerindo um horário | A construir |
| RF22 | Visita | Proprietário confirma ou recusa a visita no app, e o corretor vê a resposta | A construir |
| RF23 | Proposta | Corretor envia proposta com valor e condições | A construir |
| RF24 | Proposta | Proprietário aceita ou recusa cada proposta; pode ter várias aceitas ao mesmo tempo | A construir |
| RF25 | Venda | Corretor envia o contrato assinado por todas as partes (PDF), só a partir de uma proposta dele já aceita pelo proprietário | A construir |
| RF26 | Venda | Admin confere o contrato; ao aprovar, o imóvel vira vendido e todas as outras propostas em aberto são recusadas automaticamente. Ao recusar, escreve o motivo, o corretor é avisado e pode reenviar, e o imóvel segue em negociação com as outras propostas valendo | A construir |
| RF27 | Cobrança | Cobrar a mensalidade do assinante pelo Asaas (boleto, Pix ou cartão), com aviso de pagamento por webhook (preço em aberto) | A construir |
| RF28 | Cobrança | Assinante com pagamento vencido perde o acesso sozinho | A construir |
| RF29 | Avisos | Avisar usuários de eventos (imóvel aprovado, pedido de visita, proposta, contrato, venda, vencimento da exclusividade) por WhatsApp e por uma lista de avisos dentro do app | A construir |
| RF30 | Exclusividade | Proprietário e admin recebem um aviso antes de os 6 meses de exclusividade vencerem (antecedência: a definir) | A construir |
| RF31 | Exclusividade | Proprietário renova a exclusividade e o imóvel continua no catálogo; sem renovação, o imóvel sai do catálogo no vencimento | A construir |
| RF32 | Venda | Ao aprovar o contrato, o admin registra o valor da comissão do PAUTA que consta no contrato e, depois, se ela foi paga | A construir |

## Requisitos não funcionais

Como o app precisa se comportar. Os itens de segurança e privacidade vêm das regras de negócio e valem desde já; os de desempenho e disponibilidade ainda não têm meta numérica.

| ID | Categoria | Requisito |
| --- | --- | --- |
| RNF01 | Segurança | As regras de acesso ficam no banco (RLS), e não só nas telas: quem chama o banco direto também é barrado |
| RNF02 | Segurança | Toda página de área e toda Server Action confere o tipo do usuário no início (`exigirTipo()`) |
| RNF03 | Segurança | Ninguém vira admin pelo app, nem alterando a requisição |
| RNF04 | Segurança | Chaves e senhas só no `.env.local`; a chave secreta do Supabase nunca vai para o navegador |
| RNF05 | Segurança | Aprovar o contrato é uma operação atômica: o imóvel vira vendido e todas as outras propostas em aberto são recusadas juntas, ou nada muda |
| RNF06 | Privacidade | O contato do proprietário só chega a corretores se ele escolher mostrar, nem pela API |
| RNF07 | Privacidade | O proprietário vê os dados do corretor (nome, imobiliária e contato) nas visitas e propostas do próprio imóvel; outros proprietários não veem |
| RNF08 | Privacidade | O contrato enviado só é visto pelo corretor que enviou, pelo proprietário do imóvel e pelo admin. LGPD: o usuário consegue pedir exclusão ou anonimização dos dados (a planejar) |
| RNF09 | Usabilidade | Feito primeiro para celular, e também funciona no site pelo computador; funciona como PWA (instalável na tela inicial) |
| RNF10 | Usabilidade | Todo o app em português, inclusive os e-mails |
| RNF11 | Rastreabilidade | Toda edição de imóvel aprovado fica registrada (campo, valor antigo e novo) para o admin |
| RNF12 | Qualidade | Toda mudança no banco vira migration no repositório, e o roteiro `testar_rls.sql` precisa passar |
| RNF13 | Qualidade | Os testes ponta a ponta (Playwright) passam antes de cada Pull Request ser aceito |
| RNF14 | Desempenho | O catálogo abre rápido no celular em rede móvel (meta em segundos: a definir) |
| RNF15 | Disponibilidade | Hospedagem na Vercel e no Supabase gerenciado, sem servidor próprio (meta de disponibilidade: a definir) |
| RNF16 | Escala | MVP só em Florianópolis (SC); volume esperado de imóveis e imobiliárias no piloto: a definir |

## Fora do escopo do MVP

Ficam para depois do MVP: chat interno, mapa, app nativo nas lojas e outras cidades além de Florianópolis. A assinatura do contrato e o pagamento da venda acontecem fora do app; o app só recebe o contrato já assinado.

## Etapas do MVP

O projeto recomeça do zero num repositório `PAUTA` e num projeto Supabase novos; o `imobilink` fica arquivado para consulta. Antes de programar, um protótipo do design das telas. Cada etapa entrega uma fatia do fluxo funcionando, com banco, tela e teste. O acompanhamento fica no Roadmap.

| Etapa | O que entrega | Pronto quando | Decidir antes |
| --- | --- | --- | --- |
| 0. Protótipo | Telas principais dos três perfis, sem código de verdade | O fluxo inteiro pode ser clicado do cadastro do imóvel até o vendido | — |
| 1. Setup | Repositório `pauta`, Next.js, Supabase novo, Vercel | A página abre em localhost e conecta ao Supabase | — |
| 2. Banco | Tabelas e RLS do modelo novo | `testar_rls.sql` passa: assinante bloqueado não vê nada | — |
| 3. Login e perfis | Cadastro, login, áreas separadas | Cada tipo de usuário só abre a própria área | — |
| 4. Imóvel | Cadastro com fotos e termo; captação pelo admin; aprovar ou reprovar | Imóvel do proprietário fica pendente; o do admin entra disponível | Texto do termo de exclusividade |
| 5. Assinantes | Ativação pelo admin, convite de corretores, autônomo | Corretor convidado entra vinculado e ativo | — |
| 6. Catálogo | Filtros, status disponível ou em negociação | Assinante ativo filtra no celular; bloqueado não vê nada | Quais filtros |
| 7. Visita | Pedido e confirmação | O corretor vê a resposta do proprietário | — |
| 8. Proposta | Envio e aceite, várias ao mesmo tempo | Duas propostas aceitas deixam o imóvel em negociação | — |
| 9. Contrato e venda | Envio, conferência, comissão | Aprovar marca vendido e recusa as outras numa operação só | % do PAUTA |
| 10. Avisos | Lista no app e WhatsApp | Cada evento gera aviso nos dois canais | Provedor do WhatsApp |
| 11. Cobrança | Asaas em ambiente de testes | Assinante vencido perde o acesso sozinho | Preço da mensalidade |
| 12. Exclusividade | Aviso de vencimento e renovação | Sem renovação, o imóvel sai do catálogo sozinho | Antecedência do aviso |
| 13. PWA, testes e deploy | SMTP, PWA, roteiro completo, Vercel | O app abre no celular de outra pessoa pelo endereço público | Termo de assinatura |

## Decisões tomadas em 16/10/2026

- O nome do app passa a ser **PAUTA** (antes, Domora). O repositório novo no GitHub vai se chamar `pauta`.

## Decisões tomadas na revisão de 13/10/2026

- O nome do app é Domora (substituído por **PAUTA** em 16/10/2026).
- Todo imóvel é exclusivo do PAUTA por 6 meses, e o proprietário não tira o imóvel de venda nesse período. Antes do vencimento, proprietário e admin recebem um aviso: se o proprietário renovar, o imóvel continua no catálogo; se não, sai. Não há reserva: qualquer corretor assinante trabalha qualquer imóvel, ao mesmo tempo que outros.
- Corretor autônomo pode assinar, além das imobiliárias.
- O PAUTA também capta imóveis: o admin cadastra e vincula o imóvel à conta do dono real, que usa o app como qualquer proprietário.
- O proprietário escolhe se mostra o próprio contato aos corretores. Ele sempre vê nome, imobiliária e contato dos corretores que pedem visita ou mandam proposta no imóvel dele.
- A visita é sempre marcada pelo app: o corretor sugere o horário e o proprietário confirma ou recusa.
- O proprietário aceita ou recusa cada proposta e pode negociar com vários corretores ao mesmo tempo.
- O contrato é assinado fora do app (Clicksign ou outro meio), por todas as partes. O corretor envia o PDF a partir de uma proposta aceita, o admin confere e, ao aprovar, o imóvel vira vendido e as outras propostas em aberto são recusadas. Se o admin recusar o contrato, escreve o motivo e o corretor pode reenviar; o imóvel segue em negociação.
- O pagamento da venda acontece fora da plataforma.
- No catálogo, o corretor vê o imóvel só como disponível ou em negociação. Depois que o admin aprova o contrato, o imóvel sai do catálogo.
- Os avisos saem por WhatsApp e numa lista de avisos dentro do app.
- O corretor entra na imobiliária por convite do responsável (e-mail ou link) e já fica vinculado e ativo. Basta o CRECI da imobiliária: ela responde pelos seus corretores, o que fica no termo de assinatura.
- Receita: mensalidade dos assinantes mais uma % da comissão de cada venda fechada. A % vem escrita no contrato de compra e venda e é paga fora do app; o app só registra. A mensalidade é cobrada pelo Asaas.
- O piloto acontece em Florianópolis (SC) e precisa provar três coisas ao mesmo tempo, em pequena escala: proprietários dão exclusividade, assinantes pagam e uma venda fecha de ponta a ponta. Poucos imóveis captados pelo admin e poucas imobiliárias convidadas, com tudo funcionando de forma simples.

## Decisões em aberto

Estes pontos travam requisitos acima e precisam de resposta antes de virar código.

**Negócio**

- [ ] Comissão do PAUTA: qual % (da comissão do corretor ou do valor do imóvel)
- [ ] Preço da mensalidade (igual para imobiliária e corretor autônomo?)

**Fluxo da venda**

- [ ] Exclusividade: com quanto tempo de antecedência sai o aviso de vencimento, e a renovação é por mais 6 meses?
- [ ] WhatsApp: qual provedor da API oficial (Meta direto ou um intermediário como Twilio ou Z-API) e o custo por mensagem

**Termos**

- [ ] Texto do termo de exclusividade que o proprietário aceita no cadastro
- [ ] Termo de assinatura do corretor e da imobiliária, com a cláusula contra desintermediação e a responsabilidade da imobiliária pelos corretores que ela convida. O risco aumenta quando o proprietário mostra o contato
