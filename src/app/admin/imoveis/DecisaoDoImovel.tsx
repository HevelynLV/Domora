"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";

import { Botao } from "@/components/ui/Botao";
import { CampoTextoLongo } from "@/components/ui/Campo";
import { formatarData } from "@/lib/imovel";

import { aprovarImovel, reprovarImovel, type ResultadoDecisao } from "./acoes";

// Os botões Aprovar e Reprovar do AdmAprovar, a folha do motivo e a resposta.
// children: os dados do imóvel (vêm prontos do servidor) que o admin confere.
export function DecisaoDoImovel({
  id,
  versao,
  titulo,
  children,
}: {
  id: string;
  versao: number;
  titulo: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const janela = useRef<HTMLDialogElement>(null);
  const [resultado, setResultado] = useState<ResultadoDecisao>();
  const [motivo, setMotivo] = useState("");
  // A folha do motivo está aberta? (o <dialog> avisa quando fecha, inclusive com Esc)
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [ocupado, iniciar] = useTransition();
  const erro = resultado && "erro" in resultado ? resultado.erro : undefined;

  function tratar(resposta: ResultadoDecisao) {
    setResultado(resposta);
    // O imóvel mudou ou saiu da fila: a tela recarrega os dados novos, e o aviso fica.
    if ("mudou" in resposta && resposta.mudou) router.refresh();
  }

  function aprovar() {
    iniciar(async () => tratar(await aprovarImovel(id, versao)));
  }

  function reprovar() {
    iniciar(async () => {
      const resposta = await reprovarImovel(id, motivo);
      if (!("erro" in resposta)) janela.current?.close();
      tratar(resposta);
    });
  }

  function proximo() {
    router.push("/admin/imoveis");
    router.refresh();
  }

  if (resultado && "aprovado" in resultado) {
    return (
      <Resposta titulo="Imóvel aprovado" icone={<path d="m5 12 5 5L20 7" />} aoSeguir={proximo}>
        O imóvel “{titulo}” já está no catálogo como disponível. A exclusividade vai até{" "}
        {formatarData(resultado.aprovado.exclusividadeFim)}.
      </Resposta>
    );
  }
  if (resultado && "reprovado" in resultado) {
    return (
      <Resposta titulo="Imóvel reprovado" icone={<path d="M18 6 6 18M6 6l12 12" />} erro aoSeguir={proximo}>
        O proprietário vê o motivo em Meus imóveis e pode editar e reenviar para uma nova análise.
      </Resposta>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      {erro && !folhaAberta && (
        <p role="alert" className="mx-5 rounded-[14px] bg-areia-soft px-3.5 py-3 text-small text-atencao-texto md:mx-0">
          {erro}
        </p>
      )}
      {children}

      {/* .foot do protótipo: preso embaixo no celular; no computador, no fim do cartão. */}
      <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2.5 border-t border-line bg-card px-5 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] md:static md:mt-2 md:flex md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Botao
          variante="perigo"
          disabled={ocupado}
          onClick={() => {
            setResultado(undefined);
            setFolhaAberta(true);
            janela.current?.showModal();
          }}
        >
          Reprovar
        </Botao>
        <Botao disabled={ocupado} onClick={aprovar}>
          {ocupado ? "Aprovando…" : (
            <>
              <span className="md:hidden">Aprovar</span>
              <span className="hidden md:inline">Aprovar e publicar</span>
            </>
          )}
        </Botao>
      </div>

      <dialog
        ref={janela}
        aria-labelledby="reprovar-titulo"
        onClose={() => setFolhaAberta(false)}
        className="mb-0 mt-auto w-full max-w-none rounded-t-folha bg-card p-0 text-ink backdrop:bg-[rgba(16,32,30,.45)] md:m-auto md:max-w-[520px] md:rounded-modal"
      >
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-[max(26px,env(safe-area-inset-bottom))] md:gap-4 md:p-7">
          <h2 id="reprovar-titulo" className="font-display text-t2 font-bold tracking-[-0.01em]">
            Reprovar imóvel
          </h2>
          <CampoTextoLongo
            name="motivo"
            rotulo="Motivo (o proprietário vai ler)"
            maxLength={1000}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            erro={folhaAberta ? erro : undefined}
          />
          <div className="grid grid-cols-2 gap-2.5 md:flex md:justify-end">
            <Botao variante="secundario" disabled={ocupado} onClick={() => janela.current?.close()}>
              Cancelar
            </Botao>
            <Botao className="border-erro bg-erro hover:bg-erro-texto" disabled={ocupado} onClick={reprovar}>
              {ocupado ? "Reprovando…" : "Reprovar"}
            </Botao>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function Resposta({
  titulo,
  icone,
  erro = false,
  aoSeguir,
  children,
}: {
  titulo: string;
  icone: ReactNode;
  erro?: boolean;
  aoSeguir: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-7 md:rounded-cartao md:border md:border-line md:bg-card md:p-10">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${erro ? "bg-erro-soft text-erro" : "bg-mar-soft text-mar"}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
          {icone}
        </svg>
      </span>
      <h2 role="status" className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">
        {titulo}
      </h2>
      <p className="text-ink2">{children}</p>
      <Botao variante="secundario" className="md:self-start" onClick={aoSeguir}>
        Próximo da fila
      </Botao>
    </div>
  );
}
