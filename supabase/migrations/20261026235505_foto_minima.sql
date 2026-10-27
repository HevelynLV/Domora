-- Etapa 4, passo 4.6: imóvel pendente ou disponível não fica sem foto.
--
-- Enviar e reenviar para a aprovação já exigem pelo menos uma foto. Mas depois,
-- editando, o dono podia tirar todas: o admin aprovaria um imóvel sem foto, ou o
-- catálogo mostraria um imóvel disponível sem foto. A última foto de imóvel
-- pendente ou disponível não pode ser tirada (nem pelo admin). Rascunho e
-- reprovado podem ficar sem foto: para sair deles, o banco exige foto de novo.
-- Apagar o imóvel inteiro continua possível: as fotos saem em cascata, e o imóvel
-- já não existe quando elas saem.

create function public.conferir_ultima_foto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.status_imovel;
begin
  -- Trava o imóvel: duas fotos tiradas ao mesmo tempo não passam juntas.
  select status into v_status from public.imoveis where id = old.imovel_id for update;
  if v_status in ('pendente', 'disponivel')
     and (select count(*) from public.fotos_imovel where imovel_id = old.imovel_id) <= 1
  then
    raise exception 'O imóvel precisa de pelo menos uma foto' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger conferir_ultima_foto
  before delete on public.fotos_imovel
  for each row execute function public.conferir_ultima_foto();

revoke execute on function public.conferir_ultima_foto() from public, anon, authenticated;
