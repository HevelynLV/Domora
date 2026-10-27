import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MolduraDoCadastro } from "@/components/imovel/MolduraDoCadastro";
import { exigirTipo } from "@/lib/auth";
import { fotosDoImovel, imovelDoDono } from "@/lib/imoveis";

import { PassoFotos } from "./PassoFotos";

export const metadata: Metadata = { title: "Novo imóvel: fotos" };

// Passo 2 do cadastro (ProFotos e SiteProNovo): enviar as fotos e escolher a ordem.
export default function FotosDoRascunho({ params }: PageProps<"/proprietario/imoveis/[id]/fotos">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirTipo("proprietario");
  const { id } = await params;
  const imovel = await imovelDoDono(id, usuario.id);
  if (!imovel) notFound();
  if (imovel.status !== "rascunho") redirect("/proprietario");
  const fotos = await fotosDoImovel(id);

  return (
    <MolduraDoCadastro passo={2} voltar={`/proprietario/imoveis/${id}/dados`} previa={{ ...imovel, capa: fotos[0]?.miniatura }}>
      <PassoFotos imovelId={id} fotos={fotos} />
    </MolduraDoCadastro>
  );
}
