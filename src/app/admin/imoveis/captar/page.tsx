import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaTela } from "@/components/CabecalhoDaTela";
import { exigirTipo } from "@/lib/auth";
import { listasDoImovel } from "@/lib/imoveis";

import { FormCaptar } from "./FormCaptar";

export const metadata: Metadata = { title: "Captar imóvel" };

// Captar imóvel (AdmCaptar e SiteAdmCaptar), passo 1: o dono e os dados.
export default function CaptarImovel() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirTipo("admin");
  const { tipos, bairros } = await listasDoImovel();

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      <CabecalhoDaTela
        titulo="Captar imóvel"
        subtitulo="Para o dono que já tem conta. Entra no catálogo quando ele aceitar o termo."
        voltar="/admin"
        rotuloVoltar="Voltar ao painel"
      />
      <div className="flex w-full max-w-[760px] flex-1 flex-col md:mt-6">
        <FormCaptar tipos={tipos} bairros={bairros} />
      </div>
    </div>
  );
}
