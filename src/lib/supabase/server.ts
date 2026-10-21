import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para o servidor: Server Components, Server Actions e
// Route Handlers. A sessão do usuário vem dos cookies da requisição.
//
// Crie um cliente novo a cada requisição (chame criarCliente() dentro da
// função que precisa dele). Reaproveitar um cliente entre requisições pode
// misturar a sessão de um usuário com a de outro.
//
// O "server-only" acima faz o build falhar se este arquivo for importado
// num componente do navegador.
export async function criarCliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !chavePublica) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local",
    );
  }

  // No Next.js 16, cookies() é sempre assíncrono.
  const cookieStore = await cookies();

  return createServerClient(url, chavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Um Server Component não pode gravar cookies. Isso não é erro:
          // quem renova a sessão é o proxy (src/proxy.ts, criado na Etapa 3)
          // ou a Server Action que fez o login.
        }
      },
    },
  });
}
