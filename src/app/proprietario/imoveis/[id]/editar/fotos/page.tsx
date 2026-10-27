import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { GerenciadorDeFotos } from "@/components/imovel/GerenciadorDeFotos";
import { classesBotao } from "@/components/ui/Botao";
import { exigirTipo } from "@/lib/auth";
import { fotosDoImovel, imovelDoDono } from "@/lib/imoveis";

export const metadata: Metadata = { title: "Fotos do imóvel" };

// "Mudar fotos" da edição (ProEditar e ProReprovado): o mesmo gerenciador do
// cadastro. Em imóvel disponível, cada foto nova, tirada ou trocada de lugar vai
// para o registro de edições; pendente e disponível não ficam sem foto (o banco barra).
export default function FotosDaEdicao({ params }: PageProps<"/proprietario/imoveis/[id]/editar/fotos">) {
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
  if (imovel.status === "rascunho") redirect(`/proprietario/imoveis/${id}/fotos`);
  if (!["pendente", "reprovado", "disponivel"].includes(imovel.status)) redirect(`/proprietario/imoveis/${id}`);
  const fotos = await fotosDoImovel(id);
  const voltar = `/proprietario/imoveis/${id}/editar`;

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      <div className="flex items-center gap-2.5 px-5 pb-2.5 pt-[18px] md:hidden">
        <Link
          href={voltar}
          aria-label="Voltar para a edição"
          className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-corpo font-bold">Fotos</h1>
          <span className="truncate text-tiny text-ink2">{imovel.titulo}</span>
        </div>
      </div>
      <h1 className="hidden font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em] md:block">Fotos do imóvel</h1>

      <div className="flex w-full max-w-[760px] flex-col gap-4 px-5 md:mt-6 md:rounded-cartao md:border md:border-line md:bg-card md:p-6">
        {imovel.status === "disponivel" && (
          <p className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
            As mudanças nas fotos valem na hora e ficam registradas para a equipe PAUTA revisar.
          </p>
        )}
        <GerenciadorDeFotos imovelId={id} fotosIniciais={fotos} />
        <Link href={voltar} className={`${classesBotao({ variante: "secundario" })} md:self-end`}>
          Voltar para a edição
        </Link>
      </div>
    </div>
  );
}
