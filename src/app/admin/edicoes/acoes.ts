"use server";

import { revalidatePath } from "next/cache";

import { exigirTipo } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

// Marca a edição como revisada (RF17). O banco grava a data de agora e quem
// revisou (gatilho preencher_revisao_da_edicao): o app só manda "revisada".
export async function marcarEdicaoRevisada(id: number) {
  await exigirTipo("admin");
  if (!Number.isSafeInteger(id) || id < 1) return;

  const supabase = await criarClienteServidor();
  await supabase.from("edicoes_imovel").update({ revisado_em: new Date().toISOString() }).eq("id", id).is("revisado_em", null);
  // Atualiza a lista e o número do painel na hora.
  revalidatePath("/admin/edicoes");
  revalidatePath("/admin");
}
