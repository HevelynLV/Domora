import Link from "next/link";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { BotaoSair } from "@/components/BotaoSair";
import { exigirTipo } from "@/lib/auth";
import { numerosDoPainel } from "@/lib/imoveisAdmin";

export const metadata: Metadata = { title: "Painel" };

// Painel do admin (AdmPainel e SiteAdmPainel): o que está esperando por ele. Os
// outros cartões chegam com as etapas de cada assunto (assinantes na 5,
// exclusividade vencendo na 12, contratos e comissões na 9).
export default function Painel() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirTipo("admin");
  const numeros = await numerosDoPainel();

  return (
    <div className="flex w-full max-w-[1140px] flex-col gap-4 px-5 pb-7 pt-[22px] md:gap-6 md:px-10 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-small text-ink2">Equipe PAUTA</span>
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em] md:text-[34px]">Painel</h1>
        </div>
        {/* No celular o admin não tem Minha conta: o "Sair" fica no topo do
            painel, como no AdmPainel. No computador ele está no menu lateral. */}
        <BotaoSair className="md:hidden" />
      </div>

      <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Para fazer</p>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        <Tile href="/admin/imoveis" numero={numeros.imoveisParaAprovar} rotulo="Imóveis para aprovar" icone={<path d="M3 10.5 12 3l9 7.5V21H3z" />} />
        <Tile
          href="/admin/edicoes"
          numero={numeros.edicoesParaRevisar}
          rotulo="Edições para revisar"
          icone={<path d="M4 20h4L19 9l-4-4L4 16z" />}
          cinza
        />
      </div>
    </div>
  );
}

// Cartão de número do protótipo (.tile do AdmPainel).
function Tile({
  href,
  numero,
  rotulo,
  icone,
  cinza = false,
}: {
  href: string;
  numero: number;
  rotulo: string;
  icone: ReactNode;
  cinza?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[116px] flex-col gap-1.5 rounded-cartao border border-line bg-card p-3.5 text-ink no-underline hover:border-mar"
    >
      <span className={`flex size-9 items-center justify-center rounded-[10px] ${cinza ? "bg-cinza-soft text-ink2" : "bg-mar-soft text-mar"}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
          {icone}
        </svg>
      </span>
      <b className="font-display text-[32px] leading-none">{numero}</b>
      <span className="text-small">{rotulo}</span>
    </Link>
  );
}
