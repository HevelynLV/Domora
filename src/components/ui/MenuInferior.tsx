"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Menu de baixo do celular (.nav em docs/prototipo/pauta.css).
// No computador, as áreas usam o menu lateral do site.css (Etapa 3).

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: keyof typeof icones;
  contador?: number;
};

// Ícones de traço do protótipo (24 × 24).
const icones = {
  imoveis: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  novo: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  avisos: (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9" />
      <path d="M10 20.5h4" />
    </>
  ),
  conta: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  catalogo: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  negociacoes: (
    <>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </>
  ),
};

export function MenuInferior({ itens, rotulo }: { itens: ItemMenu[]; rotulo: string }) {
  const caminho = usePathname();

  return (
    <nav aria-label={rotulo} className="flex shrink-0 border-t border-line bg-card px-1.5 pb-4 pt-1.5">
      {itens.map((item) => {
        const ativo = caminho === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-botao text-[11px] font-semibold no-underline ${
              ativo ? "text-mar" : "text-ink2"
            }`}
          >
            {ativo && <span aria-hidden="true" className="absolute top-0.5 h-[3px] w-6 rounded-[3px] bg-mar" />}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-[22px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]"
            >
              {icones[item.icone]}
            </svg>
            {item.rotulo}
            {item.contador ? (
              <span className="absolute right-[calc(50%-20px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-erro px-1 text-[10px] font-bold text-white">
                {item.contador}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
