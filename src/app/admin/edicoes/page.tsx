import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Botao } from "@/components/ui/Botao";
import { exigirTipo } from "@/lib/auth";
import { formatarDataHora } from "@/lib/imovel";
import { edicoesParaRevisar, type EdicaoParaRevisar } from "@/lib/imoveisAdmin";

import { marcarEdicaoRevisada } from "./acoes";

export const metadata: Metadata = { title: "Edições para revisar" };

// Edições para revisar (AdmEdicoes no celular, SiteAdmEdicoes no computador): o
// que os proprietários mudaram em imóveis disponíveis. As mudanças já valem no
// catálogo; o admin confere e marca como revisada (RF17).
export default function EdicoesParaRevisar() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirTipo("admin");
  const edicoes = await edicoesParaRevisar();
  const pendentes = edicoes.filter((edicao) => !edicao.revisada).length;
  const resumo = `${pendentes} ${pendentes === 1 ? "pendente" : "pendentes"} · edições de imóvel disponível valem na hora, sem nova aprovação`;

  return (
    <div className="flex flex-col pb-7 md:px-10 md:pt-8">
      {/* Celular */}
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px] md:hidden">
        <Link
          href="/admin"
          aria-label="Voltar ao painel"
          className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-corpo font-bold">Edições para revisar</h1>
          <span className="text-tiny text-ink2">{resumo}</span>
        </div>
      </div>

      {/* Computador */}
      <div className="hidden flex-col gap-1 md:flex">
        <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">Edições para revisar</h1>
        <span className="text-small text-ink2">{resumo}</span>
      </div>

      {edicoes.length === 0 ? (
        <p className="mx-5 mt-2 rounded-cartao border border-line bg-card p-4 text-ink2 md:mx-0 md:mt-6 md:max-w-[640px]">
          Nenhuma edição para revisar.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 px-5 md:hidden">
            {edicoes.map((edicao) => (
              <li key={edicao.id} className="flex flex-col gap-2.5 rounded-cartao border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <b className="text-small">{edicao.imovel}</b>
                  <Selo revisada={edicao.revisada} />
                </div>
                <span className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">{edicao.campo}</span>
                <Valores edicao={edicao} />
                <span className="text-tiny text-ink2">
                  {edicao.quem} · {formatarDataHora(edicao.editadoEm)}
                </span>
                {!edicao.revisada && <BotaoRevisar id={edicao.id} />}
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-hidden rounded-cartao border border-line bg-card md:block">
            <table className="w-full border-collapse text-left text-small">
              <thead className="bg-bg text-tiny uppercase tracking-[0.08em] text-ink2">
                <tr>
                  {["Imóvel", "Campo", "Antes", "Depois", "Quem e quando", "Revisão"].map((titulo) => (
                    <th key={titulo} scope="col" className="px-4 py-3 font-bold">
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {edicoes.map((edicao) => (
                  <tr key={edicao.id} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-bold">{edicao.imovel}</td>
                    <td className="px-4 py-3">{edicao.campo}</td>
                    <td className="max-w-[260px] whitespace-pre-line px-4 py-3 text-erro line-through">{edicao.antes}</td>
                    <td className="max-w-[260px] whitespace-pre-line px-4 py-3 font-bold text-mar-dark">{edicao.depois}</td>
                    <td className="px-4 py-3 text-ink2">
                      {edicao.quem}
                      <br />
                      {formatarDataHora(edicao.editadoEm)}
                    </td>
                    <td className="px-4 py-3">{edicao.revisada ? <Selo revisada /> : <BotaoRevisar id={edicao.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Selo({ revisada }: { revisada: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-tiny font-bold ${
        revisada ? "bg-mar-soft text-mar-dark" : "bg-areia-soft text-areia"
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {revisada ? "Revisada" : "Nova"}
    </span>
  );
}

function Valores({ edicao }: { edicao: EdicaoParaRevisar }) {
  return (
    <div className="flex flex-col gap-0.5 text-small">
      <span className="whitespace-pre-line text-erro line-through">{edicao.antes}</span>
      <span className="whitespace-pre-line font-bold text-mar-dark">{edicao.depois}</span>
    </div>
  );
}

// Formulário de um botão só: funciona até sem JavaScript.
function BotaoRevisar({ id }: { id: number }) {
  return (
    <form action={marcarEdicaoRevisada.bind(null, id)}>
      <Botao type="submit" variante="secundario" tamanho="pequeno">
        Marcar como revisada
      </Botao>
    </form>
  );
}
