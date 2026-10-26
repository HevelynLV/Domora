import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MolduraDoCadastro } from "@/components/imovel/MolduraDoCadastro";
import { exigirTipo } from "@/lib/auth";
import { capaDoImovel, imovelDoDono, termoVigente } from "@/lib/imoveis";

import { FormTermo } from "./FormTermo";

export const metadata: Metadata = { title: "Novo imóvel: exclusividade" };

// Passo 3 do cadastro (ProTermo): aceite do termo vigente e envio para a aprovação.
export default function TermoDoRascunho({ params }: PageProps<"/proprietario/imoveis/[id]/termo">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirTipo("proprietario");
  const { id } = await params;
  const [imovel, termo, capa] = await Promise.all([imovelDoDono(id, usuario.id), termoVigente(), capaDoImovel(id)]);
  if (!imovel) notFound();
  if (imovel.status !== "rascunho") redirect("/proprietario");

  return (
    <MolduraDoCadastro passo={3} voltar={`/proprietario/imoveis/${id}/fotos`} previa={{ ...imovel, capa }}>
      <FormTermo id={imovel.id} termo={termo} mostrarContato={imovel.mostrar_contato} />
    </MolduraDoCadastro>
  );
}
