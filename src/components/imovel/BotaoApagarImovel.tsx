"use client";

import { useRef, useState, useTransition } from "react";

import { apagarImovel } from "@/app/proprietario/imoveis/acoes";
import { Botao } from "@/components/ui/Botao";

// "Apagar" de um imóvel em "Meus imóveis", com a confirmação do protótipo
// (folha de baixo no celular, .sheet do pauta.css; janela no computador, .modal
// do site.css). O <dialog> do navegador cuida do foco e fecha com Esc.
export function BotaoApagarImovel({ id, titulo, fotos }: { id: string; titulo: string; fotos: number }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState<string>();
  const [apagando, iniciar] = useTransition();

  function apagar() {
    iniciar(async () => {
      // Deu certo: a action leva para "Meus imóveis" com o aviso de apagado.
      const resultado = await apagarImovel(id);
      setErro(resultado?.erro);
    });
  }

  const tituloId = `apagar-${id}`;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErro(undefined);
          janela.current?.showModal();
        }}
        className="min-h-11 cursor-pointer text-small font-bold text-erro"
      >
        Apagar
      </button>
      <dialog
        ref={janela}
        aria-labelledby={tituloId}
        className="mb-0 mt-auto w-full max-w-none rounded-t-folha bg-card p-0 text-ink backdrop:bg-[rgba(16,32,30,.45)] md:m-auto md:max-w-[520px] md:rounded-modal"
      >
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-[max(26px,env(safe-area-inset-bottom))] md:gap-4 md:p-7">
          <h2 id={tituloId} className="font-display text-t2 font-bold tracking-[-0.01em]">
            Apagar imóvel?
          </h2>
          <p className="text-ink2">
            {fotos > 0
              ? `O imóvel “${titulo}” e ${fotos === 1 ? "a foto dele" : `as ${fotos} fotos dele`} serão apagados.`
              : `O imóvel “${titulo}” será apagado.`}{" "}
            Isso não pode ser desfeito.
          </p>
          <p className="rounded-[14px] bg-areia-soft px-3.5 py-3 text-small text-atencao-texto">
            Só dá para apagar imóvel em cadastro, aguardando aprovação ou reprovado. Imóvel aprovado fica no catálogo durante a exclusividade.
          </p>
          {erro && (
            <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
              {erro}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 md:flex md:justify-end">
            <Botao variante="secundario" onClick={() => janela.current?.close()} disabled={apagando}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={apagar} disabled={apagando}>
              {apagando ? "Apagando…" : "Apagar"}
            </Botao>
          </div>
        </div>
      </dialog>
    </>
  );
}
