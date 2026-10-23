"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { emailValido } from "@/lib/validacao";

// Pedido de senha nova (RF03). Exceção do exigirTipo() no CLAUDE.md: quem
// esqueceu a senha não está logado.
//
// A resposta é sempre a mesma, tenha o e-mail conta ou não, para a tela não
// revelar quem é cadastrado.

export type EstadoRecuperar = { erro?: string; enviadoPara?: string };

export async function pedirLinkDeSenha(_anterior: EstadoRecuperar, formData: FormData): Promise<EstadoRecuperar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailValido(email)) return { erro: "Confira o e-mail." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Usado pelo modelo padrão do e-mail (link com "code", que só funciona no
    // mesmo navegador). O modelo do PAUTA usa o token_hash e leva direto para
    // /auth/confirmar, em qualquer navegador (ver ROADMAP, passo 3.4).
    redirectTo: `${process.env.SITE_URL}/auth/confirmar?proximo=/redefinir-senha`,
  });

  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { erro: "Muitos pedidos seguidos. Espere alguns minutos e peça de novo." };
  }
  return { enviadoPara: email };
}
