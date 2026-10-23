import type { Metadata } from "next";
import { Suspense } from "react";

import { TelaConta } from "@/components/conta/TelaConta";
import { exigirTipo, TIPOS_ASSINANTE } from "@/lib/auth";
import { formatarTelefone } from "@/lib/conta";
import { criarClienteServidor } from "@/lib/supabase/server";

import { salvarContaAssinante } from "./acoes";

export const metadata: Metadata = { title: "Minha conta" };

// Minha conta do assinante (docs/prototipo/CorConta.dc.html e SiteConta.dc.html).
// "Equipe e convites" entra na Etapa 5; "Assinatura e pagamentos", na Etapa 11.
export default function ContaAssinante() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirTipo(TIPOS_ASSINANTE);
  const supabase = await criarClienteServidor();
  const [{ data: perfil }, { data: assinante }] = await Promise.all([
    supabase.from("perfis").select("telefone").eq("id", usuario.id).maybeSingle(),
    // RLS: o corretor convidado lê a assinatura da imobiliária dele.
    supabase.from("assinantes").select("nome").eq("id", usuario.assinanteId!).maybeSingle(),
  ]);

  const papel =
    usuario.tipo === "autonomo"
      ? "Corretor autônomo"
      : usuario.tipo === "imobiliaria"
        ? `Responsável · ${assinante?.nome ?? ""}`
        : `Corretor · ${assinante?.nome ?? ""}`;

  return (
    <TelaConta
      nome={usuario.nome}
      papel={papel}
      email={usuario.email}
      telefone={formatarTelefone(perfil?.telefone ?? "")}
      acao={salvarContaAssinante}
    >
      {usuario.tipo === "corretor" && (
        <p className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
          A assinatura e os convites da {assinante?.nome} ficam com o responsável pela imobiliária. Você não paga
          mensalidade.
        </p>
      )}
    </TelaConta>
  );
}
