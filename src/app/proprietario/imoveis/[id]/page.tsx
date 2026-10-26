import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { SeloStatus, type Status } from "@/components/ui/SeloStatus";
import { exigirTipo } from "@/lib/auth";
import { formatarData, formatarPreco } from "@/lib/imovel";
import { capaDoImovel, imovelDoDono, type StatusImovel } from "@/lib/imoveis";

import { ContatoDoImovel } from "./ContatoDoImovel";

export const metadata: Metadata = { title: "Imóvel" };

// Página do imóvel do proprietário (ProImovel e SiteProImovel), por enquanto sem as
// abas de visitas e propostas (Etapas 7 e 8) e sem o "Editar" (passo 4.6): a foto
// de capa, os dados, a exclusividade e a escolha de mostrar o contato (RF13).
export default function PaginaDoImovel({ params }: PageProps<"/proprietario/imoveis/[id]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

const seloDo: Record<StatusImovel, Status> = {
  rascunho: "rascunho",
  pendente: "pendente",
  reprovado: "reprovado",
  disponivel: "disponivel",
  vendido: "vendido",
  expirado: "expirado",
};

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirTipo("proprietario");
  const { id } = await params;
  const [imovel, capa] = await Promise.all([imovelDoDono(id, usuario.id), capaDoImovel(id)]);
  if (!imovel) notFound();
  // O rascunho ainda está no cadastro: segue de onde parou.
  if (imovel.status === "rascunho") redirect(`/proprietario/imoveis/${id}/fotos`);

  // Depois de vendido, o contato não muda mais nada (o imóvel saiu do catálogo).
  const podeMudarContato = ["pendente", "reprovado", "disponivel"].includes(imovel.status);

  return (
    <div className="flex flex-col pb-7 md:px-10 md:pt-8">
      <nav aria-label="Caminho" className="hidden items-center gap-1.5 text-small text-ink2 md:flex">
        <Link href="/proprietario" className="text-ink2 no-underline hover:text-mar">
          Meus imóveis
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate">{imovel.titulo}</span>
      </nav>

      <div className="flex w-full max-w-[760px] flex-col md:mt-4 md:gap-5">
        <div
          className="flex h-[200px] items-start bg-[#BFD3CD] bg-cover bg-center px-5 py-4 md:h-[320px] md:rounded-pcard"
          style={capa ? { backgroundImage: `url("${capa}")` } : undefined}
        >
          <Link
            href="/proprietario"
            aria-label="Voltar"
            className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink md:hidden"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-5 pt-[18px] md:px-0 md:pt-0">
          <div className="flex flex-col gap-1.5">
            <SeloStatus status={seloDo[imovel.status]} />
            <h1 className="font-display text-[24px] font-bold leading-[1.15] tracking-[-0.01em] md:text-t1">{imovel.titulo}</h1>
            <span className="text-small text-ink2">
              {imovel.endereco} · {imovel.bairro} · {formatarPreco(imovel.preco)}
            </span>
            {imovel.status === "disponivel" && imovel.exclusividade_fim && (
              <span className="text-tiny text-ink2">
                Exclusividade PAUTA até {formatarData(imovel.exclusividade_fim)}
              </span>
            )}
            {imovel.status === "pendente" && (
              <span className="text-tiny text-ink2">
                A equipe PAUTA está conferindo. A exclusividade de 6 meses começa quando ele for aprovado.
              </span>
            )}
          </div>

          {imovel.status === "reprovado" && imovel.motivo_reprovacao && (
            <p className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
              <b>Motivo da equipe PAUTA:</b> {imovel.motivo_reprovacao}
            </p>
          )}

          {podeMudarContato && <ContatoDoImovel id={imovel.id} mostrar={imovel.mostrar_contato} />}
        </div>
      </div>
    </div>
  );
}
