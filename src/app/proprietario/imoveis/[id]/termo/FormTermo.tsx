"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { BarraDoPasso } from "@/components/imovel/MolduraDoCadastro";
import { Botao, classesBotao } from "@/components/ui/Botao";
import { Interruptor } from "@/components/ui/Interruptor";

import { enviarParaAprovacao, type EstadoEnvio } from "../../acoes";

const PONTOS = [
  "Durante 6 meses, o imóvel só é vendido pelo PAUTA. Nesse prazo você não tira o imóvel de venda.",
  "Vários corretores assinantes podem trabalhar o imóvel ao mesmo tempo.",
  "Antes do vencimento você recebe um aviso para renovar. Sem renovação, o imóvel sai do catálogo.",
];

// Passo 3 do cadastro (ProTermo e SiteProNovo): o resumo da exclusividade, o
// texto do termo, a escolha de mostrar o contato e o aceite. A versão do termo
// que está na tela vai junto com o envio.
export function FormTermo({
  id,
  termo,
  mostrarContato,
}: {
  id: string;
  termo: { versao: string; texto: string; provisorio: boolean };
  mostrarContato: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(enviarParaAprovacao.bind(null, id), {} satisfies EstadoEnvio);
  const [contato, setContato] = useState(mostrarContato);
  const [aceito, setAceito] = useState(false);

  return (
    <form
      action={enviar}
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-4 md:rounded-cartao md:border md:border-line md:bg-card md:p-6"
    >
      <input type="hidden" name="termo_versao" value={termo.versao} />
      <input type="hidden" name="mostrar_contato" value={contato ? "sim" : "nao"} />

      <div className="flex flex-col gap-4 px-5 md:px-0">
        <div className="flex flex-col gap-3 rounded-cartao border border-line bg-card p-4 md:border-0 md:p-0">
          <h2 className="font-display text-t2 font-bold tracking-[-0.01em]">6 meses de exclusividade</h2>
          {PONTOS.map((ponto) => (
            <p key={ponto} className="flex items-start gap-2.5 text-small">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 fill-none stroke-mar [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                <path d="m5 12 5 5L20 7" />
              </svg>
              {ponto}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span id="termo-rotulo" className="flex items-center gap-2 text-small font-bold">
            Termo de exclusividade
            {termo.provisorio && (
              <span className="rounded-full bg-areia-soft px-2 py-0.5 text-tiny text-areia">Versão provisória</span>
            )}
          </span>
          {/* tabIndex: quem usa teclado consegue rolar o texto. */}
          <div
            role="region"
            aria-labelledby="termo-rotulo"
            tabIndex={0}
            className="h-[150px] overflow-y-auto whitespace-pre-line rounded-botao border border-line bg-card px-3.5 py-3 text-small text-ink2 md:bg-bg"
          >
            {termo.texto}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-cartao border border-line bg-card p-4 md:bg-bg">
          <div className="flex flex-1 flex-col gap-0.5">
            <b id="contato-rotulo" className="text-small">
              Mostrar meu contato aos corretores
            </b>
            <span className="text-tiny text-ink2">
              {contato
                ? "Corretores veem seu telefone e e-mail."
                : "Visitas e propostas passam só pelo app. Você pode mudar depois."}
            </span>
          </div>
          <Interruptor ligado={contato} aoTrocar={setContato} rotuladoPor="contato-rotulo" />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="aceito"
            value="sim"
            checked={aceito}
            onChange={(evento) => setAceito(evento.target.checked)}
            className="mt-px size-[22px] shrink-0 accent-mar"
          />
          <span>Li e aceito o termo de exclusividade de 6 meses.</span>
        </label>

        {estado.erro && (
          <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
            {estado.erro}{" "}
            {estado.termoMudou && (
              <a href={`/proprietario/imoveis/${id}/termo`} className="font-bold text-erro-texto">
                Abrir a versão nova
              </a>
            )}
          </p>
        )}
      </div>

      <BarraDoPasso>
        <Link href={`/proprietario/imoveis/${id}/fotos`} className={`${classesBotao({ variante: "secundario" })} hidden md:inline-flex`}>
          Voltar
        </Link>
        <Botao type="submit" disabled={!aceito || enviando}>
          {enviando ? "Enviando…" : aceito ? "Enviar para aprovação" : "Aceite o termo para enviar"}
        </Botao>
      </BarraDoPasso>
    </form>
  );
}
