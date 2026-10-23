import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { criarClienteServidor } from "@/lib/supabase/server";

// Recebe os links dos e-mails do Supabase Auth (hoje: recuperação de senha).
//
// Dois formatos:
// - token_hash + type: o modelo de e-mail do PAUTA. Funciona em qualquer
//   navegador, inclusive abrindo o e-mail no celular (decisão do passo 3.1).
// - code: o modelo padrão do Supabase (PKCE). Só funciona no mesmo navegador em
//   que o link foi pedido.
//
// Abre a sessão e leva para "proximo", que só pode ser um caminho dentro do
// PAUTA: um link forjado não consegue mandar a pessoa para outro site.

const TIPOS_ACEITOS: EmailOtpType[] = ["recovery", "signup", "email", "email_change", "invite"];

function caminhoInterno(proximo: string | null) {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//") || proximo.includes("\\")) {
    return null;
  }
  return proximo;
}

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const codigo = parametros.get("code");
  const proximo = caminhoInterno(parametros.get("proximo")) ?? (tipo === "recovery" ? "/redefinir-senha" : "/entrar");

  const supabase = await criarClienteServidor();
  let erro = true;
  if (tokenHash && tipo && TIPOS_ACEITOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    erro = !!error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    erro = !!error;
  }

  // Link vencido ou já usado: /redefinir-senha mostra "link vencido" quando não
  // há sessão de recuperação; os outros casos voltam para o login.
  const destino = erro && proximo !== "/redefinir-senha" ? "/entrar" : proximo;
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin));
}
