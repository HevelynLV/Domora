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

-- IDs fixos usados nos testes (cada teste desfaz o que cria, então podem repetir)
--   ...0001 usuário principal do teste · ...0002 outro usuário · ...0009 admin

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
