-- Etapa 4, passo 4.3: fotos do imóvel no Supabase Storage (RF09).
--
-- Bucket privado "fotos-imoveis". Cada imóvel tem a sua pasta: {imovel_id}/{nome}.jpg.
-- O navegador reduz a foto antes de enviar e manda duas versões em JPEG: a grande
-- ({nome}.jpg, a que fica em fotos_imovel.caminho) e a miniatura ({nome}-mini.jpg,
-- para listas e para os cards do catálogo).
--
-- Quem faz o quê (as regras de imoveis valem dentro das regras abaixo):
-- - Ler um arquivo: quem vê o imóvel. O dono vê os próprios (até rascunho); o admin
--   vê todos menos rascunho; o assinante ativo vê só os de imóvel disponível.
--   Assinante pendente, vencido ou bloqueado e visitante não veem nada.
-- - Enviar e apagar: o dono (rascunho, pendente, reprovado e disponível) e o admin
--   (todos menos rascunho). Só na pasta do imóvel e com nome no formato acima.
-- - Sobrescrever ou mover: ninguém (não há regra de update).
-- O bucket recusa sozinho o que não é JPEG ou passa de 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-imoveis', 'fotos-imoveis', false, 10485760, array['image/jpeg']);

create policy "fotos-imoveis: le quem ve o imovel"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos-imoveis'
    and exists (select 1 from public.imoveis i where i.id::text = (storage.foldername(name))[1])
  );

create policy "fotos-imoveis: dono ou admin envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-imoveis'
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'
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
    and exists (
      select 1 from public.imoveis i
      where i.id::text = (storage.foldername(name))[1]
        and ((i.proprietario_id = (select auth.uid())
              and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
             or ((select public.eh_admin()) and i.status <> 'rascunho'))
    )
  );

-- Muda a ordem das fotos de uma vez: p_fotos é a lista de TODAS as fotos do imóvel
-- na ordem nova (a primeira é a capa). Um update só, para a troca de duas posições
-- não esbarrar na regra de posição única (ela é conferida no fim do comando).
-- security invoker: as regras de fotos_imovel valem para quem chama.
create function public.reordenar_fotos(p_imovel uuid, p_fotos uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.imoveis i
    where i.id = p_imovel
      and ((i.proprietario_id = (select auth.uid())
            and i.status in ('rascunho', 'pendente', 'reprovado', 'disponivel'))
           or (public.eh_admin() and i.status <> 'rascunho'))
  ) then
    raise exception 'Só o dono ou o admin muda a ordem das fotos' using errcode = 'P0001';
  end if;

  -- A lista tem que ser exatamente as fotos do imóvel, cada uma uma vez.
  if coalesce(array_length(p_fotos, 1), 0) <> (select count(distinct f) from unnest(p_fotos) f)
     or (select array_agg(id order by id) from public.fotos_imovel where imovel_id = p_imovel)
        is distinct from (select array_agg(f order by f) from unnest(p_fotos) f)
  then
    raise exception 'A lista de fotos não confere com as fotos do imóvel. Abra de novo e confira.'
      using errcode = 'P0001';
  end if;

  -- Só as fotos que mudaram de lugar (cada mudança em imóvel disponível vai para o
  -- registro de edições, pelo gatilho registrar_edicao_de_foto).
  update public.fotos_imovel f
  set ordem = x.posicao
  from unnest(p_fotos) with ordinality as x(id, posicao)
  where f.id = x.id and f.imovel_id = p_imovel and f.ordem is distinct from x.posicao;
end;
$$;

revoke execute on function public.reordenar_fotos(uuid, uuid[]) from public, anon;
grant execute on function public.reordenar_fotos(uuid, uuid[]) to authenticated;
