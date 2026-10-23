"use server";

import { redirect } from "next/navigation";

import { criarClienteServidor } from "@/lib/supabase/server";

// Sair (RF03). Exceção do exigirTipo() no CLAUDE.md: vale para qualquer tipo,
// inclusive assinante pendente ou suspenso; confere só que há alguém logado.
export async function sair() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    // Encerra a sessão deste aparelho e apaga os cookies.
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/");
}
