-- Etapa 4, passo 4.7: status "captado" do imóvel (decisão de 27/10/2026).
--
-- Imóvel cadastrado pelo admin para um dono que já tem conta, aguardando o dono
-- aceitar o termo de exclusividade. Fica fora do catálogo até o aceite.
--
-- Só o valor do enum: o Postgres não deixa usar um valor novo de enum na mesma
-- transação em que ele foi criado, por isso as regras ficam na migration seguinte
-- (captacao).

alter type public.status_imovel add value if not exists 'captado' after 'reprovado';
