"use server";

import { exigirTipo, TIPOS_ASSINANTE } from "@/lib/auth";
import { salvarDadosDaConta, type EstadoConta } from "@/lib/conta";

// Minha conta do assinante (imobiliária, autônomo ou corretor convidado).
// exigirTipo() primeiro: a action pode ser chamada direto (CLAUDE.md, RNF02).
export async function salvarContaAssinante(_anterior: EstadoConta, formData: FormData) {
  const usuario = await exigirTipo(TIPOS_ASSINANTE);
  return salvarDadosDaConta(usuario.id, formData);
}
