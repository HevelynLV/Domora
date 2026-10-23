"use server";

import { redirect } from "next/navigation";

import { areaDoTipo, type TipoUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { emailValido } from "@/lib/validacao";

// Login (RF03). Exceção do exigirTipo() no CLAUDE.md: quem entra ainda não está
// logado. Depois do login, a área de cada tipo chama exigirTipo() normalmente.

export type EstadoEntrar = { erro?: string; email?: string };

export async function entrar(_anterior: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!emailValido(email) || !senha) {
    return { email, erro: "Escreva o e-mail e a senha do seu cadastro." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    switch (error.code) {
      // Uma mensagem só para e-mail e senha: não revela se o e-mail tem conta.
      case "invalid_credentials":
        return { email, erro: "E-mail ou senha incorretos." };
      case "email_not_confirmed":
        return { email, erro: "Confirme o seu e-mail antes de entrar: procure o link na sua caixa de entrada." };
      case "over_request_rate_limit":
        return { email, erro: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
      default:
        return { email, erro: "Não foi possível entrar agora. Tente de novo em instantes." };
    }
  }

  // O tipo vem de perfis (RLS: cada um lê o próprio), nunca do token.
  const { data: perfil } = await supabase.from("perfis").select("tipo").eq("id", data.user.id).maybeSingle();
  if (!perfil) {
    await supabase.auth.signOut();
    return { email, erro: "Não encontramos o seu cadastro. Fale com a equipe PAUTA." };
  }

  // A área confere a assinatura e manda o assinante pendente ou suspenso para a tela certa.
  redirect(areaDoTipo(perfil.tipo as TipoUsuario));
}
