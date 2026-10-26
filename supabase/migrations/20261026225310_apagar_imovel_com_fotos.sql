-- Etapa 4, passo 4.4: apagar o imóvel junto com os arquivos das fotos (RF12).
--
-- O app apaga primeiro o imóvel (o banco só deixa em rascunho, pendente ou
-- reprovado, numa operação só: não há como o admin aprovar no meio) e depois os
-- arquivos. Só que as regras do bucket dependem de o imóvel existir: sem ele,
-- ninguém mais lê nem apaga os arquivos da pasta.
--
-- Esta migration acrescenta a saída: quem enviou o arquivo (owner_id, que o
-- Storage grava com o id de quem pediu o link de envio) lê e apaga o arquivo
-- depois que o imóvel da pasta foi apagado. Arquivo que outra pessoa enviou (ex.:
-- o admin, num imóvel pendente) fica para a limpeza dos arquivos soltos (Etapa 13).

-- A pasta {imovel_id}/ não tem mais imóvel? security definer: confere na tabela
-- inteira, não só no que quem pergunta enxerga (senão o imóvel de outra pessoa
-- pareceria apagado).
create function public.pasta_sem_imovel(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.imoveis i where i.id::text = (storage.foldername(p_nome))[1]
  );
$$;

revoke execute on function public.pasta_sem_imovel(text) from public, anon;
grant execute on function public.pasta_sem_imovel(text) to authenticated;

-- O Storage lê o arquivo antes de apagar (o delete usa returning), por isso as duas regras.
create policy "fotos-imoveis: quem enviou le o arquivo de imovel apagado"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and owner_id = (select auth.uid())::text
    and public.pasta_sem_imovel(name)
  );

create policy "fotos-imoveis: quem enviou apaga o arquivo de imovel apagado"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and owner_id = (select auth.uid())::text
    and public.pasta_sem_imovel(name)
  );
