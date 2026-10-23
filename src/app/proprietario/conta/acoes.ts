"use server";

import { exigirTipo } from "@/lib/auth";
import { salvarDadosDaConta, type EstadoConta } from "@/lib/conta";

// Minha conta do proprietário. exigirTipo() primeiro: a action pode ser chamada
// direto, sem passar pela página (CLAUDE.md, RNF02).
export async function salvarContaProprietario(_anterior: EstadoConta, formData: FormData) {
  const usuario = await exigirTipo("proprietario");
  return salvarDadosDaConta(usuario.id, formData);
}
