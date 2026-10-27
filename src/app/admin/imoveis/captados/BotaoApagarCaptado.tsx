"use client";

import { useRef, useState, useTransition } from "react";

import { Botao } from "@/components/ui/Botao";

import { apagarCaptado } from "../captar/acoes";

// "Apagar" do imóvel captado que ainda espera o dono, com confirmação (o mesmo
// <dialog> do apagar em Meus imóveis).
export function BotaoApagarCaptado({ id, titulo }: { id: string; titulo: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState<string>();
  const [apagando, iniciar] = useTransition();
  const tituloId = `apagar-captado-${id}`;

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
            Apagar imóvel captado?
          </h2>
          <p className="text-ink2">O imóvel “{titulo}” e as fotos dele serão apagados. Isso não pode ser desfeito.</p>
          {erro && (
            <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
              {erro}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 md:flex md:justify-end">
            <Botao variante="secundario" onClick={() => janela.current?.close()} disabled={apagando}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              disabled={apagando}
              onClick={() => iniciar(async () => setErro((await apagarCaptado(id))?.erro))}
            >
              {apagando ? "Apagando…" : "Apagar"}
            </Botao>
          </div>
        </div>
      </dialog>
    </>
  );
}
