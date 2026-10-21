import type { HTMLAttributes } from "react";

// Cartão do protótipo (.card em docs/prototipo/pauta.css): fundo branco,
// borda line, cantos de 16 px e espaço de 16 px por dentro.
export function Cartao({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-cartao border border-line bg-card p-4 ${className}`}
      {...props}
    />
  );
}
