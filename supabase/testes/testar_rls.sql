-- Roteiro de teste do RLS do PAUTA
--
-- Como rodar (escolha um):
--   - Terminal: npx supabase db query --linked -f supabase/testes/testar_rls.sql
--   - Painel do Supabase: cole o arquivo inteiro no SQL Editor e clique em Run
-- O resultado é uma tabela: toda linha deve mostrar "✅ passou".
--
-- Regras do roteiro (valem para todas as migrations):
--   - Cada teste é um bloco independente: cria os próprios dados, testa e, no
--     fim, desfaz tudo (o bloco termina com o erro de propósito TR001, que o
--     banco desfaz). Nada fica no banco e um teste não depende do outro.
--   - Os resultados ficam numa tabela temporária, que some quando a conexão
--     fecha. Nenhum schema ou função de teste fica no banco.
--   - Testa também o que deve ser BARRADO, conferindo o código do erro:
--       42501 = RLS ou falta de permissão · P0001 = regra do banco (raise)
--       23514 = regra de formato (check)  · 23505 = valor repetido (unique)
--     Qualquer outro erro aparece como "erro inesperado" e o teste falha.
--   - Usuários de teste usam e-mails @exemplo.com.

-- ---------------------------------------------------------------
-- 0. Preparação (tudo temporário, em pg_temp)
-- ---------------------------------------------------------------
drop table if exists pg_temp.resultado;
create temp table resultado (
  ordem    serial,
  teste    text,
  esperado text,
  obtido   text
);

-- Traduz o código do erro no texto que os testes esperam.
create or replace function pg_temp.bloqueio(p_estado text, p_msg text)
returns text
language sql
as $$
  select case
    when p_estado in ('42501', 'P0001', '23514', '23505') then 'bloqueado (' || p_estado || ')'
    else 'erro inesperado: ' || p_estado || ' ' || p_msg
  end;
$$;

-- Cria uma conta de teste como o Supabase Auth faria. O gatilho do banco
-- cria o perfil a partir de p_dados (tipo, nome, telefone).
create or replace function pg_temp.criar_conta(p_id uuid, p_dados jsonb)
returns void
language sql
as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          'teste-' || p_id || '@exemplo.com', p_dados);
$$;

-- Cria uma conta de proprietário válida.
create or replace function pg_temp.criar_proprietario(p_id uuid)
returns void
language sql
as $$
  select pg_temp.criar_conta(p_id,
    '{"tipo":"proprietario","nome":"Proprietário de Teste","telefone":"48999990000"}');
$$;

-- Passa a agir como o usuário p_id, logado (como o app faria).
create or replace function pg_temp.entrar_como(p_id uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- Passa a agir como um visitante sem login.
create or replace function pg_temp.entrar_como_visitante()
returns void
language sql
as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'anon', true);
$$;

-- Cria uma imobiliária (conta do responsável + assinante pendente).
create or replace function pg_temp.criar_imobiliaria(p_id uuid, p_creci text)
returns void
language sql
as $$
  select pg_temp.criar_conta(p_id, json_build_object(
    'tipo', 'imobiliaria', 'nome', 'Responsável de Teste', 'telefone', '48999990000',
    'nome_imobiliaria', 'Imobiliária de Teste', 'creci', p_creci)::jsonb);
$$;

-- Cria um corretor autônomo (conta + assinante pendente).
create or replace function pg_temp.criar_autonomo(p_id uuid, p_creci text)
returns void
language sql
as $$
  select pg_temp.criar_conta(p_id, json_build_object(
    'tipo', 'autonomo', 'nome', 'Autônomo de Teste', 'telefone', '48999990000',
    'creci', p_creci)::jsonb);
$$;

-- Muda o status do assinante de um usuário, como o admin ou o webhook fariam.
create or replace function pg_temp.mudar_status_do_assinante_de(p_perfil uuid, p_status text)
returns void
language sql
as $$
  update public.assinantes set status = p_status::public.status_assinatura
  where id = (select assinante_id from public.perfis where id = p_perfil);
$$;

-- Cria um convite da imobiliária do responsável p_responsavel, com o código p_codigo.
create or replace function pg_temp.criar_convite(p_responsavel uuid, p_codigo text,
                                                 p_email text, p_expira_em timestamptz)
returns void
language sql
as $$
  insert into public.convites (assinante_id, email, token_hash, criado_por, expira_em)
  select assinante_id, p_email, encode(sha256(convert_to(p_codigo, 'UTF8')), 'hex'),
         p_responsavel, p_expira_em
  from public.perfis where id = p_responsavel;
$$;

-- Cria um corretor pelo convite p_codigo.
create or replace function pg_temp.criar_corretor(p_id uuid, p_codigo text)
returns void
language sql
as $$
  select pg_temp.criar_conta(p_id, json_build_object(
    'tipo', 'corretor', 'nome', 'Corretor de Teste', 'telefone', '48999990000',
    'convite', p_codigo)::jsonb);
$$;

-- IDs fixos usados nos testes (cada teste desfaz o que cria, então podem repetir)
--   ...0001 usuário principal do teste · ...0002 outro usuário · ...0009 admin
--   ...0011 responsável da imobiliária A · ...0012 responsável da imobiliária B
--   ...0021 corretor da imobiliária A · ...0031 corretor autônomo

-- ---------------------------------------------------------------
-- 1. Perfis (migration 20261022171241_perfis)
-- ---------------------------------------------------------------

-- Cadastro ---------------------------------------------------------

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    select tipo::text into v from public.perfis where id = '00000000-0000-4000-a000-000000000001';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro de proprietário cria o perfil', 'proprietario', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
      '{"tipo":"proprietario","nome":"Proprietário de Teste","telefone":"0 (48) 99999-0001"}');
    select telefone into v from public.perfis where id = '00000000-0000-4000-a000-000000000001';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Telefone com 0 na frente e máscara é guardado só com números', '48999990001', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
        '{"tipo":"admin","nome":"Quero Ser Admin","telefone":"48999990001"}');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro pedindo o tipo admin é barrado', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
        '{"tipo":"corretor","nome":"Corretor Sem Convite","telefone":"48999990001"}');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro como corretor sem convite é barrado', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
        '{"nome":"Sem Tipo","telefone":"48999990001"}');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro sem tipo é barrado', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
        '{"tipo":"proprietario","nome":"Sem DDD","telefone":"99999-0001"}');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro com telefone sem DDD é barrado', 'bloqueado (23514)', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.criar_conta('00000000-0000-4000-a000-000000000001',
        '{"tipo":"proprietario","nome":"  ","telefone":"48999990001"}');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro com nome vazio é barrado', 'bloqueado (23514)', v);
end $$;

-- Leitura -----------------------------------------------------------

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    select count(*)::text into v from public.perfis;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário lê o próprio perfil', '1', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000002');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    select count(*)::text into v from public.perfis
    where id = '00000000-0000-4000-a000-000000000002';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não lê o perfil (nem o telefone) de outro', '0', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.entrar_como_visitante();
      select count(*)::text into v from public.perfis;
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Visitante sem login não lê perfis', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000002');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000009');
    -- O admin é criado à mão no banco (como o supabase/scripts/criar_admin.sql fará)
    update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000009';
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000009');
    select count(*)::text into v from public.perfis
    where id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002');
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Admin lê o perfil dos outros', '2', v);
end $$;

-- Alteração --------------------------------------------------------

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    update public.perfis set nome = 'Nome Novo', telefone = '48988887777'
    where id = '00000000-0000-4000-a000-000000000001';
    select nome || ' / ' || telefone into v from public.perfis
    where id = '00000000-0000-4000-a000-000000000001';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário altera o próprio nome e telefone', 'Nome Novo / 48988887777', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    begin
      update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000001';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não muda o próprio tipo para admin', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000002');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    update public.perfis set nome = 'Invadido' where id = '00000000-0000-4000-a000-000000000002';
    get diagnostics n = row_count;
    v := n::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não altera o perfil de outro (0 linhas alteradas)', '0', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    begin
      update public.perfis set telefone = '12345' where id = '00000000-0000-4000-a000-000000000001';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não troca o telefone por um inválido', 'bloqueado (23514)', v);
end $$;

-- Criar e apagar ----------------------------------------------------

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    begin
      insert into public.perfis (id, tipo, nome, telefone)
      values (gen_random_uuid(), 'admin', 'Admin Falso', '48999990001');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não cria perfil direto (nem como admin)', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    begin
      delete from public.perfis where id = '00000000-0000-4000-a000-000000000001';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não apaga o próprio perfil', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    delete from auth.users where id = '00000000-0000-4000-a000-000000000001';
    select count(*)::text into v from public.perfis where id = '00000000-0000-4000-a000-000000000001';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Apagar a conta de login apaga o perfil junto', '0', v);
end $$;

-- Funções auxiliares -----------------------------------------------

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    v := public.meu_tipo()::text || ' / admin: ' || public.eh_admin()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('meu_tipo() e eh_admin() de um proprietário', 'proprietario / admin: false', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000009');
    update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000009';
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000009');
    v := public.eh_admin()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('eh_admin() de um admin', 'true', v);
end $$;

do $$ declare v text; begin
  begin
    begin
      perform pg_temp.entrar_como_visitante();
      v := public.eh_admin()::text;
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Visitante sem login não chama eh_admin()', 'bloqueado (42501)', v);
end $$;

-- ---------------------------------------------------------------
-- 2. Assinantes e convites (migration 20261022171933_assinantes_e_convites)
-- ---------------------------------------------------------------

-- Cadastro ---------------------------------------------------------

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    set constraints all immediate;  -- confere as ligações agora, como no fim do cadastro
    select p.tipo || ' / ' || a.tipo || ' / ' || a.status into v
    from public.perfis p join public.assinantes a on a.id = p.assinante_id
    where p.id = '00000000-0000-4000-a000-000000000011' and a.responsavel_id = '00000000-0000-4000-a000-000000000011';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro de imobiliária cria o perfil e o assinante pendente', 'imobiliaria / imobiliaria / pendente', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', ' creci/sc 12345-j ');
    select a.creci into v from public.assinantes a where a.responsavel_id = '00000000-0000-4000-a000-000000000011';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('CRECI é guardado em maiúsculas e sem espaços', 'CRECI/SC12345-J', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_autonomo('00000000-0000-4000-a000-000000000031', '54321-F');
    set constraints all immediate;
    select p.tipo || ' / ' || a.tipo || ' / ' || a.status into v
    from public.perfis p join public.assinantes a on a.id = p.assinante_id
    where p.id = '00000000-0000-4000-a000-000000000031';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro de corretor autônomo cria o assinante pendente', 'autonomo / autonomo / pendente', v);
end $$;

do $$ declare v text; begin
  begin
    null;
    begin
      perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro de imobiliária sem CRECI é barrado', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    null;
    begin
      perform pg_temp.criar_autonomo('00000000-0000-4000-a000-000000000031', '  ');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Cadastro de autônomo sem CRECI é barrado', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    begin
      perform pg_temp.criar_autonomo('00000000-0000-4000-a000-000000000031', '12345-j');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('CRECI repetido é barrado (imobiliária e autônomo)', 'bloqueado (23505)', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    v := public.eh_assinante_ativo()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Assinante pendente não tem acesso liberado', 'false', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    v := public.eh_assinante_ativo()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Assinante ativado pelo admin tem acesso liberado', 'true', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    v := public.eh_assinante_ativo()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Proprietário não é assinante', 'false', v);
end $$;

-- Convites e corretores ---------------------------------------------

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    -- guarda a imobiliária A antes de entrar como corretor (ele não lê o perfil do responsável)
    perform set_config('teste.imobiliaria', (select assinante_id::text from public.perfis
                                             where id = '00000000-0000-4000-a000-000000000011'), true);
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    select p.tipo || ' / '
           || case when p.assinante_id = current_setting('teste.imobiliaria')::uuid
                   then 'mesma imobiliária' else 'outra' end
           || ' / ativo: ' || public.eh_assinante_ativo()::text
      into v
    from public.perfis p where p.id = '00000000-0000-4000-a000-000000000021';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor com convite válido entra vinculado e ativo', 'corretor / mesma imobiliária / ativo: true', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    select case when usado_em is not null and usado_por = '00000000-0000-4000-a000-000000000021'
                then 'usado por quem se cadastrou' else 'não marcado' end
      into v from public.convites;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite usado fica marcado com quem usou', 'usado por quem se cadastrou', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    begin
      perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000022', 'codigo-de-teste');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite já usado não serve de novo', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() - interval '1 minute');
    begin
      perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite vencido não serve', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    begin
      perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-errado');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite com código errado não serve', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', 'outra.pessoa@exemplo.com', now() + interval '1 day');
    begin
      perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite para outro e-mail não serve', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'bloqueado');
    begin
      perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Convite de imobiliária bloqueada não serve', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'bloqueado');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    v := public.eh_assinante_ativo()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor perde o acesso na hora quando a imobiliária é bloqueada', 'false', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'vencido');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    v := public.eh_assinante_ativo()::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor perde o acesso quando o pagamento da imobiliária vence', 'false', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    insert into public.convites (assinante_id, email, token_hash)
    values (public.meu_assinante_id(), 'novo.corretor@exemplo.com', repeat('a', 64));
    select count(*)::text into v from public.convites;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Responsável de imobiliária ativa cria convite', '1', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      insert into public.convites (assinante_id, token_hash) values (public.meu_assinante_id(), repeat('a', 64));
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Responsável de imobiliária pendente não cria convite', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    begin
      insert into public.convites (assinante_id, token_hash) values (public.meu_assinante_id(), repeat('b', 64));
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor não cria convite', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000012', '67890-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000012', 'ativo');
    -- guarda o id da imobiliária B antes de entrar como A (A não consegue ler B)
    perform set_config('teste.outra', (select assinante_id::text from public.perfis where id = '00000000-0000-4000-a000-000000000012'), true);
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      insert into public.convites (assinante_id, token_hash)
      values (current_setting('teste.outra')::uuid, repeat('e', 64));
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Responsável não cria convite para outra imobiliária', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      update public.convites set usado_em = now();
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Responsável não marca convite como usado', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000012', '67890-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000012');
    select count(*)::text into v from public.convites;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Outra imobiliária não vê os convites', '0', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'outro-codigo', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    select count(*)::text into v from public.convites;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor não vê os convites da imobiliária', '0', v);
end $$;

-- Leitura e status do assinante -------------------------------------

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000012', '67890-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    select count(*)::text into v from public.assinantes;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Imobiliária lê o próprio assinante e não o de outra', '1', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    perform pg_temp.criar_convite('00000000-0000-4000-a000-000000000011', 'codigo-de-teste', null, now() + interval '1 day');
    perform pg_temp.criar_corretor('00000000-0000-4000-a000-000000000021', 'codigo-de-teste');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000021');
    select count(*)::text into v from public.assinantes;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Corretor lê o assinante da própria imobiliária', '1', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000001');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000001');
    select count(*)::text into v from public.assinantes;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Proprietário não lê nenhum assinante', '0', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    update public.assinantes set status = 'ativo';
    get diagnostics n = row_count;
    v := n::text;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Imobiliária não ativa a própria assinatura (0 linhas alteradas)', '0', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      update public.assinantes set creci = '99999-J';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Imobiliária não troca o próprio CRECI', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000012', '67890-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      update public.perfis set assinante_id = (select assinante_id from public.perfis where id = '00000000-0000-4000-a000-000000000012') where id = '00000000-0000-4000-a000-000000000011';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não troca de imobiliária (assinante_id)', 'bloqueado (42501)', v);
end $$;

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000009');
    update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000009';
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000009');
    update public.assinantes set status = 'ativo' where responsavel_id = '00000000-0000-4000-a000-000000000011';
    select status::text into v from public.assinantes where responsavel_id = '00000000-0000-4000-a000-000000000011';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Admin ativa a imobiliária', 'ativo', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000009');
    update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000009';
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000009');
    begin
      update public.assinantes set status = 'vencido' where responsavel_id = '00000000-0000-4000-a000-000000000011';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Admin não marca assinante como vencido pelo app', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'vencido');
    perform pg_temp.criar_proprietario('00000000-0000-4000-a000-000000000009');
    update public.perfis set tipo = 'admin' where id = '00000000-0000-4000-a000-000000000009';
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000009');
    begin
      update public.assinantes set status = 'ativo' where responsavel_id = '00000000-0000-4000-a000-000000000011';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Admin não libera assinante vencido sem pagamento', 'bloqueado (P0001)', v);
end $$;

-- Excluir imobiliária pendente (RF16) --------------------------------

do $$ declare v text; n int; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    delete from auth.users where id = '00000000-0000-4000-a000-000000000011';
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000012', '12345-J');
    select case when count(*) = 1 then 'CRECI livre: novo cadastro aceito' else 'não liberou' end
      into v from public.assinantes where creci = '12345-J' and responsavel_id = '00000000-0000-4000-a000-000000000012';
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Excluir a conta da imobiliária pendente libera o CRECI', 'CRECI livre: novo cadastro aceito', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.mudar_status_do_assinante_de('00000000-0000-4000-a000-000000000011', 'ativo');
    begin
      delete from auth.users where id = '00000000-0000-4000-a000-000000000011';
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Imobiliária ativa não é excluída', 'bloqueado (P0001)', v);
end $$;

do $$ declare v text; begin
  begin
    perform pg_temp.criar_imobiliaria('00000000-0000-4000-a000-000000000011', '12345-J');
    perform pg_temp.entrar_como('00000000-0000-4000-a000-000000000011');
    begin
      delete from public.assinantes;
      v := 'permitido';
    exception when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
    end;
    raise exception using errcode = 'TR001';
  exception when sqlstate 'TR001' then null;
            when others then v := pg_temp.bloqueio(sqlstate, sqlerrm);
  end;
  insert into resultado (teste, esperado, obtido)
  values ('Usuário não apaga assinante direto', 'bloqueado (42501)', v);
end $$;

-- ---------------------------------------------------------------
-- Resultado
-- ---------------------------------------------------------------
select
  ordem,
  case when obtido is not distinct from esperado then '✅ passou' else '❌ FALHOU' end as situacao,
  teste,
  esperado,
  obtido
from resultado
order by ordem;
