import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { CabecalhoDaTela } from "@/components/CabecalhoDaTela";
import { exigirTipo } from "@/lib/auth";
import { formatarPreco } from "@/lib/imovel";
import { capaDoImovel, imovelDoDono, termoVigente } from "@/lib/imoveis";

import { aceitarTermoCaptado } from "../../acoes";
import { FormTermo } from "../termo/FormTermo";

export const metadata: Metadata = { title: "Aceitar o termo" };

// O dono confere o imóvel que a equipe PAUTA captou para ele e aceita o termo de
// exclusividade daquele imóvel (passo 4.7). Com o aceite, o imóvel entra no catálogo.
export default function AceitarCaptado({ params }: PageProps<"/proprietario/imoveis/[id]/aceitar">) {
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
  if (imovel.status !== "captado") redirect(`/proprietario/imoveis/${id}`);

  return (
    <div className="flex flex-1 flex-col md:px-10 md:pb-14 md:pt-8">
      <CabecalhoDaTela titulo="Aceitar o termo" subtitulo="Imóvel cadastrado pela equipe PAUTA" voltar="/proprietario" />
      <div className="flex w-full max-w-[760px] flex-1 flex-col gap-4 md:mt-6">
        <div className="mx-5 flex gap-3 rounded-cartao border border-line bg-card p-3 md:mx-0">
          <div
            aria-hidden="true"
            className="size-[88px] shrink-0 rounded-foto bg-[#BFD3CD] bg-cover bg-center"
            style={capa ? { backgroundImage: `url("${capa}")` } : undefined}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <b>{imovel.titulo}</b>
            <span className="text-small text-ink2">
              {formatarPreco(imovel.preco)} · {imovel.bairro}
            </span>
            <span className="text-small text-ink2">
              {imovel.endereco} · {imovel.tipo} · {imovel.area.toLocaleString("pt-BR")} m² · {imovel.fotos}{" "}
              {imovel.fotos === 1 ? "foto" : "fotos"}
            </span>
          </div>
        </div>
        <p className="mx-5 rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark md:mx-0">
          A equipe PAUTA cadastrou este imóvel para você. Confira os dados e, se estiver tudo certo, aceite o termo: ele entra no
          catálogo agora, e a exclusividade de 6 meses começa hoje. Se algo estiver errado, fale com a equipe PAUTA antes de aceitar.
        </p>
        <FormTermo
          termo={termo}
          mostrarContato={imovel.mostrar_contato}
          acao={aceitarTermoCaptado.bind(null, imovel.id)}
          versaoDoImovel={imovel.versao}
          rotuloEnviar="Aceitar e publicar"
          rotuloSemAceite="Aceite o termo para continuar"
        />
      </div>
    </div>
  );
}
