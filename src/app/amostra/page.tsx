import type { Metadata } from "next";
import Link from "next/link";

import { Botao, classesBotao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { MenuInferior } from "@/components/ui/MenuInferior";
import { SeloStatus, type Status } from "@/components/ui/SeloStatus";

// Página de amostra do visual (passo 1.6): compare com docs/prototipo/ProImoveis.dc.html
// e com o protótipo clicável. Sai do app antes do deploy (Etapa 13).
export const metadata: Metadata = { title: "Amostra do visual" };

const cores = [
  ["ink", "bg-ink"],
  ["ink2", "bg-ink2"],
  ["bg", "bg-bg"],
  ["card", "bg-card"],
  ["line", "bg-line"],
  ["mar", "bg-mar"],
  ["mar-dark", "bg-mar-dark"],
  ["mar-soft", "bg-mar-soft"],
  ["areia", "bg-areia"],
  ["areia-soft", "bg-areia-soft"],
  ["erro", "bg-erro"],
  ["erro-soft", "bg-erro-soft"],
  ["roxo", "bg-roxo"],
  ["roxo-soft", "bg-roxo-soft"],
  ["cinza-soft", "bg-cinza-soft"],
] as const;

const status: Status[] = ["disponivel", "negociacao", "pendente", "reprovado", "contrato", "vendido"];

export default function Amostra() {
  return (
    <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col bg-bg">
      <div className="flex flex-1 flex-col gap-4 px-5 pb-7 pt-[22px]">
        <div className="flex flex-col">
          <span className="text-small text-ink2">Amostra do visual</span>
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Meus imóveis</h1>
        </div>

        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Cores</p>
        <div className="grid grid-cols-5 gap-2">
          {cores.map(([nome, classe]) => (
            <div key={nome} className="flex flex-col items-center gap-1">
              <span className={`h-10 w-full rounded-botao-sm border border-line ${classe}`} />
              <span className="text-[10px] text-ink2">{nome}</span>
            </div>
          ))}
        </div>

        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Textos</p>
        <Cartao>
          <p className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Título 1</p>
          <p className="font-display text-t2 font-bold leading-[1.2] tracking-[-0.01em]">Título 2</p>
          <p className="font-bold">Título 3</p>
          <p>Texto normal, em Figtree, 15 px.</p>
          <p className="text-small text-ink2">Texto pequeno, apagado.</p>
          <p className="font-display text-preco font-bold tracking-[-0.01em]">R$ 1.890.000</p>
        </Cartao>

        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Botões</p>
        <div className="flex flex-col gap-2.5">
          <Botao>Enviar para aprovação</Botao>
          <div className="flex gap-2.5">
            <Botao variante="secundario" className="flex-1">
              Editar
            </Botao>
            <Botao variante="perigo" className="flex-1">
              Recusar
            </Botao>
          </div>
          <div className="flex gap-2.5">
            <Botao tamanho="pequeno" className="flex-1">
              Aceitar
            </Botao>
            <Botao tamanho="pequeno" variante="secundario" className="flex-1">
              Cancelar
            </Botao>
          </div>
          <Botao disabled>Aceite o termo para enviar</Botao>
          <Link href="/teste-conexao" className={classesBotao({ variante: "secundario" })}>
            Link com cara de botão
          </Link>
        </div>

        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Selos de status</p>
        <div className="flex flex-wrap gap-2">
          {status.map((s) => (
            <SeloStatus key={s} status={s} />
          ))}
        </div>

        <p className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">Cartão de imóvel</p>
        <Cartao className="flex-row gap-3 p-3">
          <div className="size-[88px] shrink-0 rounded-foto bg-[#bfd3cd]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SeloStatus status="disponivel" />
            <b>Casa com vista no Campeche</b>
            <span className="text-small text-ink2">R$ 1.890.000 · 4 quartos</span>
            <span className="text-tiny font-bold text-mar">1 visita para confirmar · 2 propostas</span>
          </div>
        </Cartao>
        <Cartao className="flex-row gap-3 p-3">
          <div className="size-[88px] shrink-0 rounded-foto bg-[#bcc8d6]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SeloStatus status="negociacao" />
            <b>Apartamento na Beira-Mar Norte</b>
            <span className="text-small text-ink2">R$ 2.450.000 · 3 quartos</span>
            <span className="text-tiny text-ink2">Exclusividade até 20/11/2026</span>
          </div>
        </Cartao>
      </div>

      <div className="sticky bottom-0">
        <MenuInferior
          rotulo="Menu do proprietário"
          itens={[
            { href: "/amostra", rotulo: "Imóveis", icone: "imoveis" },
            { href: "/amostra/novo", rotulo: "Novo imóvel", icone: "novo" },
            { href: "/amostra/avisos", rotulo: "Avisos", icone: "avisos", contador: 3 },
            { href: "/amostra/conta", rotulo: "Conta", icone: "conta" },
          ]}
        />
      </div>
    </main>
  );
}
