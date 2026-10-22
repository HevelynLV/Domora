import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy do Next.js 16 (o antigo middleware): roda antes de cada página.
//
// Faz duas coisas:
// 1. Renova a sessão do Supabase. O token vence em cerca de 1 hora; um Server
//    Component não grava cookie, então quem grava o token renovado é o proxy.
// 2. Redireciona cedo para /entrar quem abre uma área sem sessão nenhuma.
//
// O proxy NÃO é a proteção das áreas: ele não lê o tipo do usuário nem a
// assinatura, e uma Server Action pode escapar do matcher. A proteção é o
// exigirTipo() (src/lib/auth.ts) em toda página e action.

const AREAS = ["/proprietario", "/assinante", "/admin"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar, cabecalhos) {
          // O token novo vai para a requisição (as páginas desta visita já leem
          // o novo) e para a resposta (o navegador guarda).
          cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          cookiesParaGravar.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
          // Impede que um cache guarde a resposta com o token de outra pessoa.
          Object.entries(cabecalhos ?? {}).forEach(([nome, valor]) => resposta.headers.set(nome, valor));
        },
      },
    },
  );

  // Não coloque nada entre criar o cliente e o getClaims(): é ele que renova
  // o token quando precisa.
  const { data } = await supabase.auth.getClaims();

  const caminho = request.nextUrl.pathname;
  const emArea = AREAS.some((area) => caminho === area || caminho.startsWith(`${area}/`));

  if (emArea && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next e as imagens.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
