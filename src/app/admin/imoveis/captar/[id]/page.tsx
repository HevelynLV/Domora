import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoDaTela } from "@/components/CabecalhoDaTela";
import { GerenciadorDeFotos } from "@/components/imovel/GerenciadorDeFotos";
import { classesBotao } from "@/components/ui/Botao";
import { exigirTipo } from "@/lib/auth";
import { fotosDoImovel } from "@/lib/imoveis";
import { imovelParaAprovar } from "@/lib/imoveisAdmin";

export const metadata: Metadata = { title: "Captar imóvel: fotos" };

// Captar imóvel, passo 2: as fotos (o mesmo gerenciador do cadastro do dono). O
// admin mexe nas fotos enquanto o imóvel espera o aceite do dono.
export default function FotosDoCaptado({ params }: PageProps<"/admin/imoveis/captar/[id]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  await exigirTipo("admin");
  const { id } = await params;
  const imovel = await imovelParaAprovar(id);
  if (!imovel || imovel.status !== "captado") notFound();
  const fotos = await fotosDoImovel(id);

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      <CabecalhoDaTela titulo="Fotos do imóvel captado" subtitulo={`${imovel.titulo} · dono: ${imovel.dona}`} voltar="/admin/imoveis/captados" />
      <div className="flex w-full max-w-[760px] flex-col gap-4 px-5 md:mt-6 md:rounded-cartao md:border md:border-line md:bg-card md:p-6">
        <GerenciadorDeFotos imovelId={id} fotosIniciais={fotos} />
        <p className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
          {imovel.dona} vê o imóvel em Meus imóveis e aceita o termo de exclusividade. Só então ele entra no catálogo. Sem pelo
          menos uma foto, o dono não consegue aceitar.
        </p>
        <Link href="/admin/imoveis/captados" className={`${classesBotao()} md:self-end`}>
          Concluir
        </Link>
      </div>
    </div>
  );
}
