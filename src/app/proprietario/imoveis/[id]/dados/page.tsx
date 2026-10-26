import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MolduraDoCadastro } from "@/components/imovel/MolduraDoCadastro";
import { exigirTipo } from "@/lib/auth";
import { numeroParaCampo } from "@/lib/imovel";
import { imovelDoDono, listasDoImovel } from "@/lib/imoveis";

import { FormDadosImovel } from "../../FormDadosImovel";

export const metadata: Metadata = { title: "Novo imóvel" };

// Passo 1 de novo, para corrigir o rascunho (quem volta do passo 2).
export default function DadosDoRascunho({ params }: PageProps<"/proprietario/imoveis/[id]/dados">) {
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
  // Depois de enviado, a edição é a da Etapa 4.6 (pendente, reprovado, disponível).
  if (imovel.status !== "rascunho") redirect("/proprietario");

  return (
    <MolduraDoCadastro passo={1} voltar="/proprietario" previa={imovel}>
      <FormDadosImovel
        id={imovel.id}
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
    </MolduraDoCadastro>
  );
}
