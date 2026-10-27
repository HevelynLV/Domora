"use client";

// Interruptor liga/desliga do protótipo (.toggle em docs/prototipo/pauta.css),
// acessível como "switch": o leitor de tela diz se está ligado.
// rotuladoPor: id do texto que dá nome ao interruptor.
export function Interruptor({
  ligado,
  aoTrocar,
  rotuladoPor,
  desabilitado = false,
}: {
  ligado: boolean;
  aoTrocar: (ligado: boolean) => void;
  rotuladoPor: string;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-labelledby={rotuladoPor}
      disabled={desabilitado}
      onClick={() => aoTrocar(!ligado)}
      className={`flex h-8 w-[52px] shrink-0 cursor-pointer rounded-2xl border-0 p-[3px] disabled:cursor-wait disabled:opacity-60 ${
        ligado ? "justify-end bg-mar" : "bg-line"
      }`}
    >
      <span className="size-[26px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
    </button>
  );
}
