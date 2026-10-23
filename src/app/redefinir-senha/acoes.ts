"use server";

import { veioDeLinkDeRecuperacao } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { senhaValida } from "@/lib/validacao";

// Senha nova pelo link de recuperação (RF03). Exceção do exigirTipo() no
// CLAUDE.md: vale para qualquer tipo. Em vez do tipo, confere que a sessão veio
// de um link de recuperação.

export type EstadoRedefinir = {
  erro?: string;
  erros?: { senha?: string; confirmacao?: string };
  feito?: boolean;
};

const LINK_VENCIDO = "O link vale por tempo limitado e só uma vez. Peça um link novo.";

export async function redefinirSenha(_anterior: EstadoRedefinir, formData: FormData): Promise<EstadoRedefinir> {
  if (!(await veioDeLinkDeRecuperacao())) return { erro: LINK_VENCIDO };

  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  if (!senhaValida(senha)) return { erros: { senha: "A senha precisa ter pelo menos 8 caracteres." } };
  if (senha !== confirmacao) return { erros: { confirmacao: "As duas senhas estão diferentes." } };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    switch (error.code) {
      case "same_password":
        return { erros: { senha: "Escolha uma senha diferente da anterior." } };
      case "weak_password":
        return { erros: { senha: "Senha fraca. Use letras e números, com pelo menos 8 caracteres." } };
      case "session_not_found":
      case "reauthentication_needed":
        return { erro: LINK_VENCIDO };
      default:
        return { erro: "Não foi possível salvar a senha nova. Tente de novo." };
    }
  }

  // Encerra a sessão aberta pelo link: a pessoa entra de novo com a senha nova.
  await supabase.auth.signOut({ scope: "local" });
  return { feito: true };
}
