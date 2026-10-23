import Link from "next/link";
import type { ReactNode } from "react";

import { classesBotao } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";

// Página inicial. No celular segue Main.dc.html; no computador (a partir de
// 768 px), SiteInicio.dc.html. Não lê a sessão: fica pronta de antemão.
// As fotos ainda são os blocos do protótipo; as de verdade entram com o PWA (Etapa 13).

const motivos = [
  ["Exclusivo:", "durante 6 meses o imóvel só é vendido pelo PAUTA."],
  ["Conferido:", "todo imóvel passa pela nossa aprovação e toda imobiliária tem o CRECI conferido."],
  ["No seu controle:", "o proprietário confirma visitas, escolhe propostas e decide se mostra o contato."],
];

const passos = [
  ["Cadastro com exclusividade", "O proprietário cadastra o imóvel com fotos e aceita 6 meses de exclusividade. Ou nossa equipe capta o imóvel por ele."],
  ["Curadoria", "A equipe PAUTA confere cada imóvel antes de ele entrar no catálogo."],
  ["Catálogo para assinantes", "Imobiliárias e corretores com CRECI conferido trabalham qualquer imóvel, ao mesmo tempo."],
  ["Visita pelo app", "O corretor sugere um horário e o proprietário confirma ou recusa."],
  ["Propostas", "O proprietário aceita ou recusa cada uma e pode negociar com vários corretores."],
  ["Contrato e venda", "O contrato é assinado fora do app. Conferimos o PDF e o imóvel vira vendido."],
];

export default function Inicio() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <header className="md:border-b md:border-line md:bg-card">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-7 px-5 pt-[18px] pb-2.5 md:min-h-[72px] md:px-8 md:py-2.5">
          <Logo />
          <nav aria-label="Seções" className="hidden flex-1 gap-[22px] md:flex">
            <a href="#como" className="text-sm font-semibold text-ink2 no-underline hover:text-ink">Como funciona</a>
            <a href="#proprietarios" className="text-sm font-semibold text-ink2 no-underline hover:text-ink">Para proprietários</a>
            <a href="#imobiliarias" className="text-sm font-semibold text-ink2 no-underline hover:text-ink">Para imobiliárias</a>
          </nav>
          <div className="flex gap-2.5">
            <Link href="/entrar" className={classesBotao({ variante: "secundario", tamanho: "pequeno" })}>
              Entrar
            </Link>
            {/* O hidden fica num bloco à parte: no próprio link, o inline-flex do botão ganharia dele. */}
            <div className="hidden md:block">
              <Link href="/cadastro" className={classesBotao({ tamanho: "pequeno" })}>
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        <section className="mx-auto flex w-full max-w-[1200px] flex-col-reverse gap-[22px] px-5 pt-1.5 md:flex-row md:items-center md:gap-12 md:px-8 md:py-16">
          <div className="flex flex-1 flex-col gap-3 md:gap-6">
            <span className="hidden self-start rounded-full bg-mar-soft px-2.5 py-[3px] text-tiny font-bold text-mar-dark md:inline-flex">
              Florianópolis · SC
            </span>
            <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[clamp(40px,5.4vw,68px)] md:font-extrabold md:leading-[1.02] md:tracking-[-0.03em]">
              Imóveis exclusivos de Florianópolis, num só catálogo.
            </h1>
            <p className="text-ink2 md:text-lg">
              O proprietário dá 6 meses de exclusividade ao PAUTA. Imobiliárias e corretores assinantes trabalham o
              imóvel até a venda.
            </p>
            <div className="hidden flex-wrap gap-3 md:flex">
              <Link href="/cadastro" className={classesBotao()}>Tenho um imóvel para vender</Link>
              <Link href="/cadastro/imobiliaria" className={classesBotao({ variante: "secundario" })}>
                Sou imobiliária ou corretor
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <Foto className="h-[230px] md:hidden" legenda="Foto: casa no Campeche" lugar="Florianópolis · SC" />
            <div className="hidden grid-cols-2 grid-rows-[220px_180px] gap-3 md:grid">
              <Foto className="row-span-2" legenda="Casa no Campeche" />
              <Foto cor="bg-[#BCC8D6] text-[#2A3B52]" legenda="Beira-Mar Norte" />
              <Foto cor="bg-[#D8CBB4] text-[#5A4423]" legenda="Jurerê Internacional" />
            </div>
          </div>
        </section>

        {/* Celular (Main.dc.html) */}
        <section className="flex flex-col gap-[22px] px-5 pt-[22px] pb-7 md:hidden">
          <div className="flex flex-col gap-2.5">
            <CartaoEscolha href="/cadastro" titulo="Tenho um imóvel para vender" detalhe="Cadastre como proprietário" cor="mar">
              <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
            </CartaoEscolha>
            <CartaoEscolha href="/cadastro/imobiliaria" titulo="Sou imobiliária ou corretor" detalhe="Assine e acesse o catálogo" cor="areia">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
              <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.3 3.5 5.2" />
            </CartaoEscolha>
          </div>
          <div className="flex flex-col gap-3.5">
            <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Por que o PAUTA</p>
            {motivos.map(([titulo, texto]) => (
              <Item key={titulo}>
                <span className="text-small"><b>{titulo}</b> {texto}</span>
              </Item>
            ))}
          </div>
          <p className="text-center text-tiny text-ink2">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-bold text-mar no-underline hover:underline">Entrar</Link>
          </p>
        </section>

        {/* Computador (SiteInicio.dc.html) */}
        <section id="como" className="hidden bg-card py-16 md:block">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-8">
            <div className="flex max-w-[640px] flex-col gap-2.5">
              <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Como funciona</p>
              <h2 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">
                Do cadastro do imóvel até a venda, em seis passos.
              </h2>
            </div>
            <ol className="grid grid-cols-3 gap-6">
              {passos.map(([titulo, texto], i) => (
                <li key={titulo} className="flex flex-col gap-1.5">
                  <span className="font-display text-t2 font-bold text-mar">{i + 1}</span>
                  <b>{titulo}</b>
                  <span className="text-small text-ink2">{texto}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hidden py-16 md:block">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-6 px-8">
            <div id="proprietarios" className="flex flex-[1_1_420px] flex-col gap-4 rounded-cartao border border-line bg-card p-8">
              <h2 className="font-display text-[26px] font-bold">Para proprietários</h2>
              <Item>Vários corretores trabalhando o seu imóvel, sem anúncio espalhado em várias imobiliárias.</Item>
              <Item>Você confirma as visitas e escolhe as propostas, vendo quem é cada corretor.</Item>
              <Item>Você decide se mostra o seu contato. Se não mostrar, tudo passa pelo app.</Item>
              <Link href="/cadastro" className={`${classesBotao()} mt-2 self-start`}>Cadastrar meu imóvel</Link>
            </div>
            <div id="imobiliarias" className="flex flex-[1_1_420px] flex-col gap-4 rounded-cartao border border-ink bg-ink p-8 text-white">
              <h2 className="font-display text-[26px] font-bold">Para imobiliárias e corretores</h2>
              <Item claro>Estoque exclusivo e conferido, sem precisar captar.</Item>
              <Item claro>Mensalidade fixa e uma % da comissão só quando a venda fecha.</Item>
              <Item claro>Convide os corretores da sua equipe, cada um com o próprio acesso.</Item>
              <Link
                href="/cadastro/imobiliaria"
                className="mt-2 inline-flex min-h-12 items-center justify-center self-start rounded-botao border border-white bg-white px-[18px] font-bold text-ink no-underline"
              >
                Assinar o PAUTA
              </Link>
            </div>
          </div>
        </section>

        <section className="hidden bg-card py-16 md:block">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-8">
            <div className="flex max-w-[620px] flex-col gap-2">
              <h2 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">Já tem conta?</h2>
              <p className="text-ink2">Entre para acompanhar seus imóveis ou acessar o catálogo.</p>
            </div>
            <Link href="/entrar" className={classesBotao()}>Entrar no PAUTA</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

// cor: as cores das fotos do protótipo (.foto, .f2, .f3 do pauta.css).
function Foto({ className = "", cor = "bg-[#BFD3CD] text-mar-dark", legenda, lugar }: { className?: string; cor?: string; legenda: string; lugar?: string }) {
  return (
    <div className={`flex items-end justify-between rounded-foto px-3 py-2.5 text-tiny font-bold ${cor} ${className}`}>
      <span>{legenda}</span>
      {lugar && <span>{lugar}</span>}
    </div>
  );
}

function Item({ claro = false, children }: { claro?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`mt-0.5 size-[18px] shrink-0 fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] ${claro ? "stroke-[#8FD3C9]" : "stroke-mar"}`}>
        <path d="m5 12 5 5L20 7" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

function CartaoEscolha({ href, titulo, detalhe, cor, children }: { href: string; titulo: string; detalhe: string; cor: "mar" | "areia"; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-cartao border border-line bg-card p-4 text-ink no-underline hover:border-mar">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${cor === "mar" ? "bg-mar-soft text-mar" : "bg-areia-soft text-areia"}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
          {children}
        </svg>
      </span>
      <span className="flex flex-1 flex-col">
        <b>{titulo}</b>
        <span className="text-small text-ink2">{detalhe}</span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}
