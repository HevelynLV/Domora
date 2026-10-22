import type { Metadata } from "next";
import { Suspense } from "react";

import { Cartao } from "@/components/ui/Cartao";
import { exigirTipo, TIPOS_ASSINANTE } from "@/lib/auth";

export const metadata: Metadata = { title: "Catálogo" };

// Catálogo (docs/prototipo/CorCatalogo.dc.html). Os imóveis chegam na Etapa 6.
// exigirTipo() já manda para outra tela quem está pendente, vencido ou bloqueado.
export default function Catalogo() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirTipo(TIPOS_ASSINANTE);

  return (
    <div className="flex flex-col gap-4 px-5 pb-7 pt-[22px] md:px-10 md:pt-8">
      <div className="flex flex-col">
        <span className="text-small text-ink2">Olá, {usuario.nome}</span>
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Catálogo</h1>
      </div>
      <Cartao>
        <p className="text-ink2">Os imóveis do catálogo chegam na Etapa 6.</p>
      </Cartao>
    </div>
  );
}
