import Link from "next/link";
import type { ReactNode } from "react";

// Topo das telas de dentro das áreas (fora das abas do menu): no celular, o botão
// de voltar com o título e uma linha embaixo (.top do pauta.css); no computador,
// o título grande (o menu lateral já leva de volta).
export function CabecalhoDaTela({
  titulo,
  subtitulo,
  voltar,
  rotuloVoltar = "Voltar",
}: {
  titulo: string;
  subtitulo?: ReactNode;
  voltar: string;
  rotuloVoltar?: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px] md:hidden">
        <Link
          href={voltar}
          aria-label={rotuloVoltar}
          className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-corpo font-bold">{titulo}</h1>
          {subtitulo && <span className="text-tiny text-ink2">{subtitulo}</span>}
        </div>
      </div>
      <div className="hidden flex-col gap-1 md:flex">
        <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">{titulo}</h1>
        {subtitulo && <span className="text-small text-ink2">{subtitulo}</span>}
      </div>
    </>
  );
}
