import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

// Moldura das telas de entrar e de senha. No celular segue Entrar.dc.html
// (voltar, logo e o conteúdo); no computador (a partir de 768 px), SiteEntrar.dc.html
// (painel verde com a foto à esquerda e o formulário à direita).

export function TelaPublica({ voltarPara, children }: { voltarPara: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-bg md:flex-row">
      <aside className="hidden flex-1 flex-col justify-between gap-8 bg-mar p-12 text-white md:flex">
        <Logo claro />
        <div className="flex min-h-[280px] flex-1 items-end rounded-foto bg-[#2C7570] px-3 py-2.5 text-tiny font-bold text-[#DCEEEA]">
          Foto: Lagoa da Conceição
        </div>
        <p className="max-w-[480px] font-display text-[30px] font-bold leading-[1.15]">
          Imóveis exclusivos, conferidos e acompanhados do primeiro contato até a venda.
        </p>
      </aside>

      <div className="flex flex-1 flex-col md:items-center md:justify-center md:px-6 md:py-12">
        <div className="flex w-full flex-col gap-[22px] px-5 pb-7 md:max-w-[440px] md:px-0 md:pb-0">
          <div className="flex flex-col gap-[26px] pt-[18px] md:hidden">
            <Link
              href={voltarPara}
              aria-label="Voltar"
              className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
