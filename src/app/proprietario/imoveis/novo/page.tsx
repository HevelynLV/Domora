import type { Metadata } from "next";
import { Suspense } from "react";

import { MolduraDoCadastro } from "@/components/imovel/MolduraDoCadastro";
import { exigirTipo } from "@/lib/auth";
import { listasDoImovel } from "@/lib/imoveis";

import { FormDadosImovel } from "../FormDadosImovel";

export const metadata: Metadata = { title: "Novo imóvel" };

// Passo 1 do cadastro (ProNovo e SiteProNovo): cria o imóvel em rascunho.
export default function NovoImovel() {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirTipo("proprietario");
  const { tipos, bairros } = await listasDoImovel();

  return (
    <MolduraDoCadastro passo={1} voltar="/proprietario">
      <FormDadosImovel id={null} tipos={tipos} bairros={bairros} />
    </MolduraDoCadastro>
  );
}
