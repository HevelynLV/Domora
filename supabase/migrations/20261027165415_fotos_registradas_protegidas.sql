-- Etapa 4, passo 4.9 (auditoria): arquivo de foto registrada não é apagado nem
-- reenviado direto pelo Storage.
--
-- As regras do bucket (20261026221116_fotos_storage.sql) deixavam o dono apagar,
-- pela API do Storage, o arquivo de uma foto que ainda está em fotos_imovel, e
-- depois enviar outra imagem com o mesmo nome. A troca não passava pelo banco:
-- nada ia para edicoes_imovel (RNF11), a versão do imóvel não subia (a aprovação
-- do admin, RF14, não percebia) e o imóvel podia ficar com foto que não abre.
--
-- Agora enviar e apagar só valem para arquivo SEM linha em fotos_imovel (contando a
-- miniatura, {nome}-mini.jpg, como parte da foto {nome}.jpg). O app já segue essa
-- ordem: ao tirar uma foto, apaga a linha e depois os arquivos; ao enviar, manda os
-- arquivos e depois grava a linha; ao apagar o imóvel, o imóvel sai antes (as fotos
-- saem em cascata) e os arquivos depois.

-- O arquivo pertence a uma foto registrada? security definer: confere na tabela
-- inteira, não só no que quem pergunta enxerga.
create function public.arquivo_de_foto_registrada(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fotos_imovel f
    where f.caminho in (p_nome, regexp_replace(p_nome, '-mini\.jpg$', '.jpg'))
  );
$$;

revoke execute on function public.arquivo_de_foto_registrada(text) from public, anon;
grant execute on function public.arquivo_de_foto_registrada(text) to authenticated;

drop policy "fotos-imoveis: dono ou admin envia" on storage.objects;
drop policy "fotos-imoveis: dono ou admin apaga" on storage.objects;

create policy "fotos-imoveis: dono ou admin envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-imoveis'
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'
    and not public.arquivo_de_foto_registrada(name)
    and exists (
      select 1 from public.imoveis i
      where i.id::text = (storage.foldername(name))[1]
        and ((i.proprietario_id = (select auth.uid())
              and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
             or ((select public.eh_admin()) and i.status <> 'rascunho'))
    )
  );

create policy "fotos-imoveis: dono ou admin apaga"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and not public.arquivo_de_foto_registrada(name)
    and exists (
      select 1 from public.imoveis i
      where i.id::text = (storage.foldername(name))[1]
        and ((i.proprietario_id = (select auth.uid())
              and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
             or ((select public.eh_admin()) and i.status <> 'rascunho'))
    )
  );
