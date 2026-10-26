import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SeloStatus } from "@/components/ui/SeloStatus";
import { exigirTipo } from "@/lib/auth";
import { formatarData, formatarDataHora, formatarPreco } from "@/lib/imovel";
import { filaDeAprovacao, imovelParaAprovar, type ImovelNaFila, type ImovelParaAprovar } from "@/lib/imoveisAdmin";
import { formatarTelefone } from "@/lib/conta";

import { DecisaoDoImovel } from "./DecisaoDoImovel";

export const metadata: Metadata = { title: "Aprovar imóveis" };

// Imóveis para aprovar (AdmAprovar no celular, SiteAdmAprovar no computador): a
// fila dos pendentes e o imóvel escolhido (?id=), com fotos, dados, dono e termo.
export default function AprovarImoveis({ searchParams }: PageProps<"/admin/imoveis">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirTipo("admin");
  const [fila, { id }] = await Promise.all([filaDeAprovacao(), searchParams]);
  const posicao = Math.max(0, fila.findIndex((item) => item.id === id));
  const imovel = fila.length > 0 ? await imovelParaAprovar(fila[posicao].id) : null;

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
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
        <div className="flex flex-1 flex-col">
          <h1 className="text-corpo font-bold">Imóveis para aprovar</h1>
          {fila.length > 0 && (
            <span className="text-tiny text-ink2">
              {posicao + 1} de {fila.length} na fila
            </span>
          )}
        </div>
      </div>

      {/* Computador */}
      <h1 className="hidden font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em] md:block">Aprovar imóveis</h1>

      {fila.length === 0 || !imovel ? (
        <p className="mx-5 mt-2 rounded-cartao border border-line bg-card p-4 text-ink2 md:mx-0 md:mt-6 md:max-w-[640px]">
          Nenhum imóvel esperando aprovação.
        </p>
      ) : (
        <div className="flex flex-1 flex-col md:mt-6 md:flex-row md:items-start md:gap-6">
          <Fila fila={fila} atual={imovel.id} />
          <div className="flex min-w-0 flex-1 flex-col md:max-w-[760px] md:rounded-cartao md:border md:border-line md:bg-card md:p-6">
            <DecisaoDoImovel key={imovel.id} id={imovel.id} versao={imovel.versao} titulo={imovel.titulo}>
              <DadosDoImovel imovel={imovel} />
            </DecisaoDoImovel>
          </div>
        </div>
      )}
    </div>
  );
}

// A fila, só no computador (no celular, um imóvel por vez).
function Fila({ fila, atual }: { fila: ImovelNaFila[]; atual: string }) {
  return (
    <nav aria-label="Fila de imóveis para aprovar" className="hidden w-[300px] shrink-0 flex-col gap-2 md:flex">
      <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Fila ({fila.length})</p>
      {fila.map((item) => (
        <Link
          key={item.id}
          href={`/admin/imoveis?id=${item.id}`}
          aria-current={item.id === atual ? "true" : undefined}
          className={`flex flex-col rounded-[14px] bg-card p-2.5 text-ink no-underline ${
            item.id === atual ? "border-2 border-mar" : "border border-line hover:border-mar"
          }`}
        >
          <b className="text-small">{item.titulo}</b>
          <span className="text-tiny text-ink2">
            {item.dona}
            {item.enviado_em && ` · ${formatarData(item.enviado_em)}`}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function DadosDoImovel({ imovel }: { imovel: ImovelParaAprovar }) {
  const [capa, ...outras] = imovel.fotos;
  const mais = outras.length - 2;

  return (
    <div className="flex flex-col gap-3.5 px-5 md:px-0">
      {/* Galeria: cada foto abre a versão grande, para conferir a qualidade. */}
      {capa ? (
        <div className="grid grid-cols-[2fr_1fr] grid-rows-[80px_80px] gap-1.5 md:grid-rows-[150px_150px] md:gap-2">
          <FotoDaGaleria foto={capa} rotulo="Capa" className="row-span-2" />
          {outras.slice(0, 2).map((foto, i) => (
            <FotoDaGaleria key={foto.id} foto={foto} rotulo={i === 1 && mais > 0 ? `+${mais}` : `Foto ${i + 2}`} />
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] bg-areia-soft px-3.5 py-3 text-small text-atencao-texto">Este imóvel está sem fotos.</p>
      )}
      {outras.length > 2 && (
        <details className="text-small">
          <summary className="cursor-pointer font-bold text-mar">Ver todas as {imovel.fotos.length} fotos</summary>
          <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-5">
            {imovel.fotos.map((foto, i) => (
              <FotoDaGaleria key={foto.id} foto={foto} rotulo={i === 0 ? "Capa" : `Foto ${i + 1}`} className="h-20" />
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-1">
        <SeloStatus status="pendente" />
        <h2 className="font-display text-t2 font-bold tracking-[-0.01em] md:text-t1">{imovel.titulo}</h2>
        <span className="font-display text-preco font-bold tracking-[-0.01em]">{formatarPreco(imovel.preco)}</span>
        <span className="text-small text-ink2">
          {imovel.endereco} · {imovel.bairro} · {imovel.tipo}
        </span>
      </div>

      <dl className="grid grid-cols-4 gap-2 rounded-cartao border border-line bg-card p-4 text-center">
        {[
          [imovel.quartos, "quartos"],
          [imovel.banheiros, "banheiros"],
          [imovel.vagas, "vagas"],
          [`${imovel.area.toLocaleString("pt-BR")} m²`, "área"],
        ].map(([valor, rotulo]) => (
          <div key={rotulo} className="flex flex-col">
            <dt className="order-last text-tiny text-ink2">{rotulo}</dt>
            <dd className="font-display text-t2 font-bold">{valor}</dd>
          </div>
        ))}
      </dl>

      {imovel.descricao && <p className="whitespace-pre-line text-small">{imovel.descricao}</p>}

      <div className="flex flex-col gap-1 rounded-cartao border border-line bg-card p-4">
        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Proprietário</p>
        <b className="text-small">{imovel.dona}</b>
        {imovel.contato && (
          <span className="text-tiny text-ink2">
            {formatarTelefone(imovel.contato.telefone)} · {imovel.contato.email}
          </span>
        )}
        <span className="text-tiny text-ink2">
          {imovel.termo_aceito_em
            ? `Termo de exclusividade aceito em ${formatarDataHora(imovel.termo_aceito_em)} (versão ${imovel.termo_versao})`
            : "Termo de exclusividade ainda não aceito"}
          {" · "}
          {imovel.mostrar_contato ? "contato visível para corretores" : "contato oculto para corretores"}
        </span>
      </div>

      <p className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
        Se o proprietário editar o imóvel depois que você abriu esta tela, a aprovação não passa e a tela recarrega com os dados novos.
      </p>
    </div>
  );
}

function FotoDaGaleria({
  foto,
  rotulo,
  className = "",
}: {
  foto: ImovelParaAprovar["fotos"][number];
  rotulo: string;
  className?: string;
}) {
  const fundo = foto.miniatura ? { backgroundImage: `url("${foto.miniatura}")` } : undefined;
  const classes = `flex items-end rounded-foto bg-[#BFD3CD] bg-cover bg-center p-2 text-tiny font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)] ${className}`;
  return foto.grande ? (
    <a href={foto.grande} target="_blank" rel="noreferrer" className={`${classes} no-underline`} style={fundo} aria-label={`${rotulo}: abrir a foto grande`}>
      {rotulo}
    </a>
  ) : (
    <div className={classes} style={fundo}>
      {rotulo}
    </div>
  );
}
