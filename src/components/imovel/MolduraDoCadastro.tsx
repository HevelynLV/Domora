import Link from "next/link";
import type { ReactNode } from "react";

import { SeloStatus } from "@/components/ui/SeloStatus";
import { formatarPreco } from "@/lib/imovel";

// Moldura dos 3 passos do cadastro do imóvel.
//   Celular (ProNovo, ProFotos, ProTermo): botão de voltar, "Passo n de 3", o
//   nome do passo e a barra de progresso (.top e .steps do pauta.css).
//   Computador (SiteProNovo): caminho "Meus imóveis / Novo imóvel", título, os 3
//   passos lado a lado (.stepper) e, ao lado do formulário, a prévia do card no
//   catálogo (.col-side).

const PASSOS = ["Dados do imóvel", "Fotos", "Exclusividade e contato"] as const;

export type Previa = { titulo: string; preco: number; quartos: number; vagas: number; area: number };

export function MolduraDoCadastro({
  passo,
  voltar,
  previa,
  children,
}: {
  passo: 1 | 2 | 3;
  voltar: string;
  previa?: Previa;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      {/* Celular */}
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px] md:hidden">
        <Link
          href={voltar}
          aria-label="Voltar"
          className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-1 flex-col">
          <span className="text-tiny text-ink2">Passo {passo} de 3</span>
          {/* Só um dos dois títulos aparece em cada tela (o outro fica escondido). */}
          <h1 className="text-corpo font-bold">{PASSOS[passo - 1]}</h1>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-3 gap-1.5 px-5 pb-3.5 md:hidden">
        {PASSOS.map((nome, i) => (
          <span key={nome} className={`h-1 rounded ${i < passo ? "bg-mar" : "bg-line"}`} />
        ))}
      </div>

      {/* Computador */}
      <div className="hidden w-full max-w-[1140px] flex-col gap-6 md:flex">
        <div className="flex flex-col gap-1">
          <nav aria-label="Caminho" className="flex items-center gap-1.5 text-small text-ink2">
            <Link href="/proprietario" className="text-ink2 no-underline hover:text-mar">
              Meus imóveis
            </Link>
            <span aria-hidden="true">/</span>
            <span>Novo imóvel</span>
          </nav>
          <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">Cadastrar imóvel</h1>
        </div>
        <ol className="grid grid-cols-3 gap-2.5">
          {PASSOS.map((nome, i) => {
            const atual = i + 1 === passo;
            const feito = i + 1 < passo;
            return (
              <li
                key={nome}
                aria-current={atual ? "step" : undefined}
                className={`flex min-h-14 items-center gap-2.5 rounded-[14px] bg-card px-3.5 py-3 text-sm font-bold ${
                  atual ? "border-2 border-mar text-ink" : "border border-line text-ink2"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-small ${
                    atual || feito ? "bg-mar text-white" : "bg-cinza-soft"
                  }`}
                >
                  {i + 1}
                </span>
                {nome}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex w-full max-w-[1140px] flex-1 flex-wrap items-start gap-6 md:mt-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col self-stretch md:self-auto">{children}</div>
        <aside className="hidden min-w-0 flex-[1_1_320px] flex-col gap-4 md:flex min-[900px]:flex-[0_0_360px]">
          <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Como vai aparecer no catálogo</p>
          {previa && (
            <div className="flex flex-col overflow-hidden rounded-pcard border border-line bg-card">
              <div className="flex h-[180px] items-start bg-[#BFD3CD] p-3">
                <SeloStatus status="disponivel" />
              </div>
              <div className="flex flex-col gap-1 px-4 pb-4 pt-3.5">
                <span className="font-display text-t2 font-bold tracking-[-0.01em]">{formatarPreco(previa.preco)}</span>
                <b>{previa.titulo}</b>
                <div className="flex flex-wrap gap-3.5 text-small text-ink2">
                  <span>{previa.quartos} {previa.quartos === 1 ? "quarto" : "quartos"}</span>
                  <span>{previa.vagas} {previa.vagas === 1 ? "vaga" : "vagas"}</span>
                  <span>{previa.area.toLocaleString("pt-BR")} m²</span>
                </div>
              </div>
            </div>
          )}
          <p className="flex gap-2.5 rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
            A equipe PAUTA confere o imóvel antes de ele entrar no catálogo. Os corretores veem o endereço para marcar a visita.
          </p>
        </aside>
      </div>
    </div>
  );
}

// Barra de ação dos passos (.foot do protótipo): presa embaixo no celular; no
// computador, dentro do cartão, alinhada à direita.
export function BarraDoPasso({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 border-t border-line bg-card px-5 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] md:static md:mt-0 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0">
      {children}
    </div>
  );
}
