-- Etapa 4, passo 4.2: status "rascunho" do imóvel (decisão de 26/10/2026, plano da Etapa 4).
--
-- O cadastro segue a ordem do protótipo (dados, fotos, termo): o passo 1 cria o
-- imóvel em rascunho e o aceite do termo no passo 3 o passa para pendente.
--
-- Esta migration só acrescenta o valor ao enum. O Postgres não deixa usar um valor
-- novo de enum na mesma transação em que ele foi criado, por isso as regras que
-- usam 'rascunho' ficam na migration seguinte (imoveis_etapa_4).

alter type public.status_imovel add value if not exists 'rascunho' before 'pendente';
