-- Etapa 4, passo 4.9 (auditoria): o aceite do imóvel captado confere a versão que o
-- dono viu.
--
-- Enquanto o dono lê o termo, o admin ainda pode mudar dados e fotos do captado
-- (cada mudança sobe imoveis.versao). Sem conferir a versão, o dono aceitaria a
-- exclusividade de um imóvel diferente do que estava na tela. Agora a tela manda a
-- versão (p_versao) e o aceite só vale se ela ainda for a mesma, como na aprovação
-- do admin (aprovar_imovel).

drop function public.aceitar_termo_captado(uuid, text, boolean);

create function public.aceitar_termo_captado(
  p_imovel uuid,
  p_versao integer,
  p_termo_versao text,
  p_mostrar_contato boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao integer;
begin
  select versao into v_versao from public.imoveis
  where id = p_imovel and proprietario_id = (select auth.uid()) and status = 'captado'
  for update;
  if not found then
    raise exception 'Só o dono aceita, e só imóvel captado aguardando o aceite' using errcode = 'P0001';
  end if;

  if p_versao is null or v_versao <> p_versao then
    raise exception 'O imóvel mudou depois que a tela foi aberta' using errcode = 'P0001';
  end if;

  if char_length(btrim(coalesce(p_termo_versao, ''))) = 0 then
    raise exception 'Aceite o termo de exclusividade para continuar' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.fotos_imovel where imovel_id = p_imovel) then
    raise exception 'O imóvel ainda não tem fotos. Fale com a equipe PAUTA.' using errcode = 'P0001';
  end if;

  update public.imoveis
  set status = 'disponivel',
      termo_versao = p_termo_versao,
      termo_aceito_em = now(),
      mostrar_contato = coalesce(p_mostrar_contato, false),
      exclusividade_inicio = now(),
      exclusividade_fim = now() + interval '6 months'
  where id = p_imovel and versao = p_versao;
end;
$$;

revoke execute on function public.aceitar_termo_captado(uuid, integer, text, boolean) from public, anon;
grant execute on function public.aceitar_termo_captado(uuid, integer, text, boolean) to authenticated;
