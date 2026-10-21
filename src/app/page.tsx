import Link from "next/link";

import { classesBotao } from "@/components/ui/Botao";

// Página inicial provisória. A tela "Início" do protótipo (docs/prototipo/Main.dc.html)
// é construída na Etapa 3, junto com o cadastro e o login.
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col gap-6 px-5 py-10">
      <span className="inline-flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.03em]">
        <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-mar">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-[18px] fill-none stroke-white [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]"
          >
            <path d="M4 11 12 4l8 7" />
            <path d="M7 20v-6a5 5 0 0 1 10 0v6" />
          </svg>
        </span>
        PAUTA
      </span>
      <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">
        Imóveis exclusivos de Florianópolis, num só catálogo.
      </h1>
      <p className="text-ink2">App em construção. A tela inicial de verdade chega na Etapa 3.</p>
      <div className="flex flex-col gap-2.5">
        <Link href="/amostra" className={classesBotao()}>
          Ver a amostra do visual
        </Link>
        <Link href="/teste-conexao" className={classesBotao({ variante: "secundario" })}>
          Testar a conexão com o Supabase
        </Link>
      </div>
    </main>
  );
}
