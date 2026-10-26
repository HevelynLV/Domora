"use client";

import Link from "next/link";
import { useState } from "react";

import { GerenciadorDeFotos } from "@/components/imovel/GerenciadorDeFotos";
import { BarraDoPasso } from "@/components/imovel/MolduraDoCadastro";
import { classesBotao } from "@/components/ui/Botao";
import type { FotoDoImovel } from "@/lib/imoveis";

// Passo 2 do cadastro (ProFotos): as fotos e a barra para seguir ao termo. Sem
// nenhuma foto não dá para seguir (o banco também não envia imóvel sem foto).
export function PassoFotos({ imovelId, fotos }: { imovelId: string; fotos: FotoDoImovel[] }) {
  const [quantidade, setQuantidade] = useState(fotos.length);

  return (
    <div className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-4 md:rounded-cartao md:border md:border-line md:bg-card md:p-6">
      <div className="px-5 md:px-0">
        <GerenciadorDeFotos imovelId={imovelId} fotosIniciais={fotos} aoMudar={setQuantidade} />
      </div>
      <BarraDoPasso>
        <Link
          href={`/proprietario/imoveis/${imovelId}/dados`}
          className={`${classesBotao({ variante: "secundario" })} hidden md:inline-flex`}
        >
          Voltar
        </Link>
        {quantidade > 0 ? (
          <Link href={`/proprietario/imoveis/${imovelId}/termo`} className={classesBotao()}>
            Continuar para o termo
          </Link>
        ) : (
          <span aria-disabled="true" className={`${classesBotao()} cursor-not-allowed border-line bg-line text-ink2 hover:bg-line`}>
            Envie pelo menos uma foto
          </span>
        )}
      </BarraDoPasso>
    </div>
  );
}
