import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { exigirTipo } from "@/lib/auth";
import { numeroParaCampo } from "@/lib/imovel";
import { imovelDoDono, listasDoImovel } from "@/lib/imoveis";

import { FormEditarImovel } from "./FormEditarImovel";

export const metadata: Metadata = { title: "Editar imóvel" };

// Editar imóvel já enviado (ProEditar, ProReprovado e as versões Site): pendente,
// reprovado ou disponível. Rascunho volta para o cadastro; vendido e expirado não
// se editam.
export default function EditarImovel({ params }: PageProps<"/proprietario/imoveis/[id]/editar">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirTipo("proprietario");
  const { id } = await params;
  const [imovel, { tipos, bairros }] = await Promise.all([imovelDoDono(id, usuario.id), listasDoImovel()]);
  if (!imovel) notFound();
  if (imovel.status === "rascunho") redirect(`/proprietario/imoveis/${id}/dados`);
  if (imovel.status !== "pendente" && imovel.status !== "reprovado" && imovel.status !== "disponivel") {
    redirect(`/proprietario/imoveis/${id}`);
  }
  const reprovado = imovel.status === "reprovado";

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      {/* Celular */}
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px] md:hidden">
        <Link
          href={`/proprietario/imoveis/${id}`}
          aria-label="Voltar"
          className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-corpo font-bold">{reprovado ? "Editar e reenviar" : "Editar imóvel"}</h1>
          <span className="truncate text-tiny text-ink2">{imovel.titulo}</span>
        </div>
      </div>

      {/* Computador */}
      <div className="hidden flex-col gap-1 md:flex">
        <nav aria-label="Caminho" className="flex items-center gap-1.5 text-small text-ink2">
          <Link href="/proprietario" className="text-ink2 no-underline hover:text-mar">
            Meus imóveis
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/proprietario/imoveis/${id}`} className="truncate text-ink2 no-underline hover:text-mar">
            {imovel.titulo}
          </Link>
          <span aria-hidden="true">/</span>
          <span>Editar</span>
        </nav>
        <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">
          {reprovado ? "Editar e reenviar" : "Editar imóvel"}
        </h1>
      </div>

      <div className="flex w-full max-w-[760px] flex-1 flex-col gap-3.5 md:mt-6 md:gap-4">
        {imovel.status === "disponivel" && (
          <p className="mx-5 rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark md:mx-0">
            Este imóvel está <b>disponível</b>. As mudanças valem na hora, sem nova aprovação, e cada campo alterado fica registrado para a equipe PAUTA revisar.
          </p>
        )}
        {imovel.status === "pendente" && (
          <p className="mx-5 rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark md:mx-0">
            Este imóvel está <b>aguardando aprovação</b>. Você pode corrigir agora: a equipe PAUTA confere a versão mais nova.
          </p>
        )}
        {reprovado && (
          <div className="mx-5 flex flex-col gap-1 rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto md:mx-0">
            <b>Reprovado</b>
            <span>Motivo da equipe PAUTA: {imovel.motivo_reprovacao}</span>
          </div>
        )}

        <FormEditarImovel
          id={imovel.id}
          status={imovel.status}
          titulo={imovel.titulo}
          fotos={imovel.fotos}
          tipos={tipos}
          bairros={bairros}
          iniciais={{
            titulo: imovel.titulo,
            tipo_id: String(imovel.tipo_id),
            preco: numeroParaCampo(imovel.preco),
            endereco: imovel.endereco,
            bairro_id: String(imovel.bairro_id),
            quartos: String(imovel.quartos),
            banheiros: String(imovel.banheiros),
            vagas: String(imovel.vagas),
            area: numeroParaCampo(imovel.area),
            descricao: imovel.descricao,
          }}
        />
      </div>
    </div>
  );
}
