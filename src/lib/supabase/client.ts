import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase para componentes que rodam no navegador ("use client").
// Usa só a chave pública (publishable): o que cada usuário pode ler ou gravar
// é decidido pelo RLS no banco, nunca por este arquivo.
export function criarClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !chavePublica) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local",
    );
  }

  return createBrowserClient(url, chavePublica);
}
