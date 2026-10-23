import type { Metadata } from "next";
import { Suspense } from "react";

import { BotaoSair } from "@/components/BotaoSair";
import { Cartao } from "@/components/ui/Cartao";
import { exigirTipo } from "@/lib/auth";

export const metadata: Metadata = { title: "Painel" };

// Painel do admin (docs/prototipo/AdmPainel.dc.html). Os números chegam com as
// etapas de cada assunto (imóveis na 4, assinantes na 5, contratos na 9).
export default function Painel() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirTipo("admin");

  return (
    <div className="flex flex-col gap-4 px-5 pb-7 pt-[22px] md:px-10 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-small text-ink2">Olá, {usuario.nome}</span>
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Painel</h1>
        </div>
        {/* No celular o admin não tem Minha conta: o "Sair" fica no topo do
            painel, como no AdmPainel. No computador ele está no menu lateral. */}
        <BotaoSair className="md:hidden" />
      </div>
      <Cartao>
        <p className="text-ink2">O painel do admin chega com as próximas etapas.</p>
      </Cartao>
    </div>
  );
}
