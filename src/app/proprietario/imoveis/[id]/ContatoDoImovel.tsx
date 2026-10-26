"use client";

import { useState, useTransition } from "react";

import { Interruptor } from "@/components/ui/Interruptor";

import { mudarContato } from "../acoes";

// "Mostrar meu contato aos corretores" na página do imóvel (RF13). Grava na hora;
// se o banco recusar, o interruptor volta para onde estava.
export function ContatoDoImovel({ id, mostrar }: { id: string; mostrar: boolean }) {
  const [ligado, setLigado] = useState(mostrar);
  const [erro, setErro] = useState<string>();
  const [salvando, iniciar] = useTransition();

  function trocar(novo: boolean) {
    setLigado(novo);
    setErro(undefined);
    iniciar(async () => {
      const resultado = await mudarContato(id, novo);
      if (resultado.erro) {
        setLigado(!novo);
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-cartao border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <b id="contato-rotulo" className="text-small">
            Mostrar meu contato aos corretores
          </b>
          <span className="text-tiny text-ink2">
            {ligado ? "Corretores veem seu telefone e e-mail." : "Corretores não veem seu contato. Tudo passa pelo app."}
          </span>
        </div>
        <Interruptor ligado={ligado} aoTrocar={trocar} rotuladoPor="contato-rotulo" desabilitado={salvando} />
      </div>
      {erro && (
        <p role="alert" className="text-tiny font-semibold text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
