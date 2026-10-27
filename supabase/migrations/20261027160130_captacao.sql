-- Etapa 4, passo 4.7: captação pelo admin (RF08), com as decisões de 27/10/2026.
--
-- - O dono já tem conta (criada por ele pelo app). O admin procura essa conta
--   (buscar_proprietarios), cadastra o imóvel para ela (captar_imovel) e envia as
--   fotos. O imóvel fica "captado": fora do catálogo, aguardando o aceite do dono.
-- - O dono lê e aceita o termo daquele imóvel (aceitar_termo_captado). Só então o
--   imóvel fica disponível, e os 6 meses de exclusividade contam a partir do aceite.
-- - Enquanto está captado, o admin muda as fotos e pode apagar o imóvel; o dono não
--   edita, não muda fotos e não apaga: só aceita.

-- ---------------------------------------------------------------
-- 1. Regras de formato com o status novo
-- ---------------------------------------------------------------

-- O captado ainda não tem exclusividade (ela começa no aceite).
alter table public.imoveis drop constraint imoveis_exclusividade_marcada;
alter table public.imoveis add constraint imoveis_exclusividade_marcada check (
  status in ('rascunho', 'pendente', 'reprovado', 'captado')
  or (exclusividade_inicio is not null and exclusividade_fim is not null)
);

-- Status captado só existe em imóvel captado pelo admin.
alter table public.imoveis add constraint imoveis_captado_pelo_admin check (
  status <> 'captado' or captado_pelo_admin
);

-- ---------------------------------------------------------------
-- 2. Busca do dono, captação e aceite
-- ---------------------------------------------------------------

-- O admin procura a conta do dono por nome, e-mail ou telefone. security definer
-- porque o e-mail fica em auth.users. Só proprietários (nunca assinante ou admin).
create function public.buscar_proprietarios(p_texto text)
returns table (id uuid, nome text, telefone text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
  v_digitos text := regexp_replace(v_texto, '\D', '', 'g');
begin
  if not public.eh_admin() then
    raise exception 'Só o admin procura proprietários' using errcode = 'P0001';
  end if;
  if char_length(v_texto) < 3 then
    return;
  end if;

  return query
    select p.id, p.nome, p.telefone, u.email::text
    from public.perfis p
    join auth.users u on u.id = p.id
    where p.tipo = 'proprietario'
      and (p.nome ilike '%' || v_texto || '%'
           or u.email ilike '%' || v_texto || '%'
           or (char_length(v_digitos) >= 4 and p.telefone like '%' || v_digitos || '%'))
    order by p.nome
    limit 10;
end;
$$;

revoke execute on function public.buscar_proprietarios(text) from public, anon;
grant execute on function public.buscar_proprietarios(text) to authenticated;

-- O admin cadastra o imóvel captado para o dono. Nasce "captado", fora do
-- catálogo. As regras de formato e de listas em uso valem como no cadastro do dono.
create function public.captar_imovel(
  p_dono uuid,
  p_titulo text,
  p_descricao text,
  p_tipo_id bigint,
  p_endereco text,
  p_bairro_id bigint,
  p_preco numeric,
  p_quartos smallint,
  p_banheiros smallint,
  p_vagas smallint,
  p_area numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin capta imóveis' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.perfis where id = p_dono and tipo = 'proprietario') then
    raise exception 'O dono precisa ter conta de proprietário no PAUTA' using errcode = 'P0001';
  end if;

  insert into public.imoveis (proprietario_id, captado_pelo_admin, status, titulo, descricao, tipo_id,
                              endereco, bairro_id, preco, quartos, banheiros, vagas, area)
  values (p_dono, true, 'captado', p_titulo, coalesce(p_descricao, ''), p_tipo_id,
          p_endereco, p_bairro_id, p_preco, p_quartos, p_banheiros, p_vagas, p_area)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.captar_imovel(uuid, text, text, bigint, text, bigint, numeric, smallint, smallint, smallint, numeric)
  from public, anon;
grant execute on function public.captar_imovel(uuid, text, text, bigint, text, bigint, numeric, smallint, smallint, smallint, numeric)
  to authenticated;

-- O dono aceita o termo do imóvel captado: ele entra no catálogo e os 6 meses de
-- exclusividade começam agora. Exige a versão vigente do termo (gatilho
-- conferir_termo_vigente) e pelo menos uma foto.
create function public.aceitar_termo_captado(p_imovel uuid, p_termo_versao text, p_mostrar_contato boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.imoveis
  where id = p_imovel and proprietario_id = (select auth.uid()) and status = 'captado'
  for update;
  if not found then
    raise exception 'Só o dono aceita, e só imóvel captado aguardando o aceite' using errcode = 'P0001';
  end if;

  if char_length(btrim(coalesce(p_termo_versao, ''))) = 0 then
    raise exception 'Aceite o termo de exclusividade para enviar' using errcode = 'P0001';
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
  where id = p_imovel;
end;
$$;

revoke execute on function public.aceitar_termo_captado(uuid, text, boolean) from public, anon;
grant execute on function public.aceitar_termo_captado(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------
-- 3. O admin apaga imóvel captado que ainda espera o dono
-- ---------------------------------------------------------------
-- (o dono não apaga: a política do dono vale só para rascunho, pendente e reprovado)

create policy "imoveis: admin apaga captado"
  on public.imoveis for delete to authenticated
  using ((select public.eh_admin()) and status = 'captado');
