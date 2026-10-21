import type { ButtonHTMLAttributes } from "react";

// Botão do protótipo (.btn em docs/prototipo/pauta.css).
//   primario   → .btn          (fundo mar)
//   secundario → .btn.sec      (fundo branco, borda line)
//   perigo     → .btn.perigo   (texto erro: recusar, apagar)
//   pequeno    → .btn.sm
// Para um link com cara de botão, use classesBotao() no className do <Link>.

type Variante = "primario" | "secundario" | "perigo";
type Tamanho = "normal" | "pequeno";

const base =
  "inline-flex items-center justify-center gap-2 border font-bold no-underline cursor-pointer " +
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-ink2";

const variantes: Record<Variante, string> = {
  primario: "border-mar bg-mar text-white hover:bg-mar-dark",
  secundario: "border-line bg-card text-ink hover:bg-cinza-soft",
  perigo: "border-perigo-borda bg-card text-erro hover:bg-erro-soft",
};

const tamanhos: Record<Tamanho, string> = {
  normal: "min-h-12 rounded-botao px-[18px]",
  pequeno: "min-h-11 rounded-botao-sm px-3.5 text-sm",
};

export function classesBotao({
  variante = "primario",
  tamanho = "normal",
}: { variante?: Variante; tamanho?: Tamanho } = {}) {
  return `${base} ${variantes[variante]} ${tamanhos[tamanho]}`;
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
};

export function Botao({ variante, tamanho, className = "", type = "button", ...props }: BotaoProps) {
  return <button type={type} className={`${classesBotao({ variante, tamanho })} ${className}`} {...props} />;
}
