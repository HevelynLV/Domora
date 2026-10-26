import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { BarraDoPasso, MolduraDoCadastro } from "@/components/imovel/MolduraDoCadastro";
import { classesBotao } from "@/components/ui/Botao";
import { exigirTipo } from "@/lib/auth";
import { imovelDoDono } from "@/lib/imoveis";

export const metadata: Metadata = { title: "Novo imóvel: fotos" };

// Passo 2 do cadastro (ProFotos). O envio das fotos entra no passo 4.3; por
// enquanto a tela só mostra quantas fotos o imóvel tem e segue para o termo.
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

  return (
    <MolduraDoCadastro passo={2} voltar={`/proprietario/imoveis/${id}/dados`} previa={imovel}>
      <div className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-4 md:rounded-cartao md:border md:border-line md:bg-card md:p-6">
        <div className="flex flex-col gap-3.5 px-5 md:px-0">
          <p className="text-small text-ink2">A primeira foto é a capa no catálogo.</p>
          <p className="rounded-[14px] bg-areia-soft px-3.5 py-3 text-small text-atencao-texto">
            O envio de fotos chega no próximo passo do desenvolvimento (4.3). Este imóvel tem {imovel.fotos}{" "}
            {imovel.fotos === 1 ? "foto" : "fotos"}.
          </p>
        </div>
        <BarraDoPasso>
          <Link href={`/proprietario/imoveis/${id}/dados`} className={`${classesBotao({ variante: "secundario" })} hidden md:inline-flex`}>
            Voltar
          </Link>
          <Link href={`/proprietario/imoveis/${id}/termo`} className={classesBotao()}>
            Continuar para o termo
          </Link>
        </BarraDoPasso>
      </div>
    </MolduraDoCadastro>
  );
}
