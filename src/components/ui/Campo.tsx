import type { InputHTMLAttributes } from "react";

// Campo de formulário do protótipo (.field em docs/prototipo/pauta.css):
// rótulo, caixa de texto, dica e mensagem de erro. A dica e o erro ficam ligados
// à caixa (aria-describedby), para o leitor de tela ler junto.

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  rotulo: string;
  dica?: string;
  erro?: string;
};

export function Campo({ name, rotulo, dica, erro, id, className = "", ...input }: CampoProps) {
  const idCampo = id ?? name;
  const descricao = [dica && `${idCampo}-dica`, erro && `${idCampo}-erro`].filter(Boolean).join(" ");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="text-small font-bold">
        {rotulo}
      </label>
      <input
        id={idCampo}
        name={name}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao || undefined}
        className={`min-h-12 w-full rounded-botao border bg-card px-3.5 text-ink focus:outline-2 focus:outline-offset-1 focus:outline-mar ${
          erro ? "border-erro" : "border-line"
        }`}
        {...input}
      />
      {dica && (
        <span id={`${idCampo}-dica`} className="text-tiny text-ink2">
          {dica}
        </span>
      )}
      {erro && (
        <span id={`${idCampo}-erro`} className="text-tiny font-semibold text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
