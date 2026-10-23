import Link from "next/link";

// Logo do protótipo (.logo e .logo-mark em docs/prototipo/pauta.css).
// claro: para fundo escuro (painéis do site): texto branco e marca branca com o
// desenho verde, como no SiteEntrar.dc.html.
export function Logo({ href = "/", claro = false }: { href?: string; claro?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.03em] no-underline ${
        claro ? "text-white" : "text-ink"
      }`}
    >
      <span className={`flex size-[30px] items-center justify-center rounded-[9px] ${claro ? "bg-white" : "bg-mar"}`}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`size-[18px] fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] ${
            claro ? "stroke-mar" : "stroke-white"
          }`}
        >
          <path d="M4 11 12 4l8 7" />
          <path d="M7 20v-6a5 5 0 0 1 10 0v6" />
        </svg>
      </span>
      PAUTA
    </Link>
  );
}
