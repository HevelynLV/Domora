import type { Metadata } from "next";
import { Suspense } from "react";

import { Cartao } from "@/components/ui/Cartao";
import { exigirTipo } from "@/lib/auth";

export const metadata: Metadata = { title: "Meus imóveis" };

// "Meus imóveis" (docs/prototipo/ProImoveis.dc.html). A lista chega na Etapa 4.
export default function MeusImoveis() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirTipo("proprietario");

  return (
    <div className="flex flex-col gap-4 px-5 pb-7 pt-[22px] md:px-10 md:pt-8">
      <div className="flex flex-col">
        <span className="text-small text-ink2">Olá, {usuario.nome}</span>
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Meus imóveis</h1>
      </div>
      <Cartao>
        <p className="text-ink2">A lista dos seus imóveis chega na Etapa 4.</p>
      </Cartao>
    </div>
  );
}
