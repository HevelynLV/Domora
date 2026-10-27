import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CabecalhoDaTela } from "@/components/CabecalhoDaTela";
import { classesBotao } from "@/components/ui/Botao";
import { exigirTipo } from "@/lib/auth";
import { formatarData } from "@/lib/imovel";
import { captadosAguardando } from "@/lib/imoveisAdmin";

import { BotaoApagarCaptado } from "./BotaoApagarCaptado";

export const metadata: Metadata = { title: "Captados aguardando o dono" };

// Imóveis captados que esperam o dono aceitar o termo (passo 4.7). Não está no
// protótipo: é onde a equipe acompanha quem falta aceitar, muda fotos ou apaga.
export default function CaptadosAguardando({ searchParams }: PageProps<"/admin/imoveis/captados">) {
  return (
    <Suspense fallback={<p className="px-5 pt-[22px] text-ink2">Carregando…</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirTipo("admin");
  const [captados, { apagado }] = await Promise.all([captadosAguardando(), searchParams]);

  return (
    <div className="flex flex-col gap-4 pb-7 md:px-10 md:pt-8">
      <CabecalhoDaTela
        titulo="Captados aguardando o dono"
        subtitulo="Fora do catálogo até o dono aceitar o termo de exclusividade."
        voltar="/admin"
        rotuloVoltar="Voltar ao painel"
      />
      <div className="flex w-full max-w-[760px] flex-col gap-3 px-5 md:mt-2 md:px-0">
        <Link href="/admin/imoveis/captar" className={`${classesBotao({ tamanho: "pequeno" })} self-start`}>
          Captar imóvel
        </Link>
        {apagado === "1" && (
          <p role="status" className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
            O imóvel captado e as fotos dele foram apagados.
          </p>
        )}
        {captados.length === 0 ? (
          <p className="rounded-cartao border border-line bg-card p-4 text-ink2">Nenhum imóvel captado esperando o dono.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {captados.map((imovel) => {
              const { dias } = imovel;
              return (
                <li key={imovel.id} className="flex flex-col gap-1.5 rounded-cartao border border-line bg-card p-4">
                  <b>{imovel.titulo}</b>
                  <span className="text-small text-ink2">
                    Dono: {imovel.dono} · captado em {formatarData(imovel.captadoEm)}
                    {dias > 0 && ` (há ${dias} ${dias === 1 ? "dia" : "dias"})`}
                  </span>
                  <span className={`text-tiny font-bold ${imovel.fotos === 0 ? "text-erro" : "text-ink2"}`}>
                    {imovel.fotos === 0 ? "Sem fotos: o dono não consegue aceitar" : `${imovel.fotos} ${imovel.fotos === 1 ? "foto" : "fotos"}`}
                  </span>
                  <div className="flex flex-wrap gap-x-3.5">
                    <Link href={`/admin/imoveis/captar/${imovel.id}`} className="flex min-h-11 items-center text-small font-bold text-mar no-underline">
                      Fotos
                    </Link>
                    <BotaoApagarCaptado id={imovel.id} titulo={imovel.titulo} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
