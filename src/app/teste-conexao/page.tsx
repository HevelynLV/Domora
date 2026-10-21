import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { criarClienteServidor } from "@/lib/supabase/server";

// Página só para conferir a conexão com o Supabase na Etapa 1.
// Não depende de nenhuma tabela. Sai do app antes do deploy (Etapa 13).
export default function TesteConexao() {
  // Só existe em desenvolvimento: num deploy (inclusive de pré-visualização na Vercel)
  // a página responde 404, porque mostra detalhes da conexão e mensagens de erro do Supabase.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Teste de conexão com o Supabase</h1>
      {/* Com Cache Components, o que lê cookies ou busca dados na hora fica dentro de um Suspense */}
      <Suspense fallback={<p>Testando a conexão…</p>}>
        <Resultado />
      </Suspense>
    </main>
  );
}

type Checagem = { nome: string; ok: boolean; detalhe: string };

async function Resultado() {
  // O teste roda a cada visita, nunca no build. Sem isto, com o .env.local
  // vazio, o Next guardaria o resultado do build como página estática.
  await connection();

  const checagens: Checagem[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  checagens.push({
    nome: "Variáveis no .env.local",
    ok: Boolean(url && chavePublica),
    detalhe:
      url && chavePublica
        ? "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY encontradas"
        : "Falta uma das duas. Preencha o .env.local e reinicie o npm run dev",
  });

  if (url && chavePublica) {
    // 1. O endereço e a chave pública são aceitos pelo Supabase?
    try {
      const resposta = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: chavePublica },
        cache: "no-store",
      });
      checagens.push({
        nome: "Endereço e chave pública",
        ok: resposta.ok,
        detalhe: resposta.ok
          ? `O Supabase respondeu (${resposta.status})`
          : resposta.status === 401
            ? "O Supabase recusou a chave (401). Confira a publishable key"
            : `O Supabase respondeu com erro ${resposta.status}`,
      });
    } catch {
      checagens.push({
        nome: "Endereço e chave pública",
        ok: false,
        detalhe: "Não foi possível chegar ao Supabase. Confira o NEXT_PUBLIC_SUPABASE_URL",
      });
    }

    // 2. O cliente do servidor monta e lê a sessão pelos cookies?
    try {
      const supabase = await criarClienteServidor();
      const { data, error } = await supabase.auth.getClaims();
      checagens.push({
        nome: "Cliente do servidor (src/lib/supabase/server.ts)",
        ok: !error,
        detalhe: error
          ? `Erro ao ler a sessão: ${error.message}`
          : data?.claims
            ? "Funcionando, com um usuário logado"
            : "Funcionando (ninguém logado, como esperado agora)",
      });
    } catch (erro) {
      checagens.push({
        nome: "Cliente do servidor (src/lib/supabase/server.ts)",
        ok: false,
        detalhe: erro instanceof Error ? erro.message : "Erro desconhecido",
      });
    }
  }

  const tudoOk = checagens.every((c) => c.ok);

  return (
    <div className="flex flex-col gap-3">
      <p className={tudoOk ? "font-bold text-green-700" : "font-bold text-red-700"}>
        {tudoOk ? "✅ Conectado ao Supabase" : "❌ A conexão ainda não funciona"}
      </p>
      <ul className="flex flex-col gap-2">
        {checagens.map((c) => (
          <li key={c.nome} className="rounded-lg border p-3">
            <b>
              {c.ok ? "✅" : "❌"} {c.nome}
            </b>
            <p className="text-sm">{c.detalhe}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
