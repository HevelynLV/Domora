"use client";

import Link from "next/link";
import { startTransition, useActionState, type ReactNode } from "react";

import { CamposDoImovel } from "@/components/imovel/CamposDoImovel";
import { Botao, classesBotao } from "@/components/ui/Botao";
import type { CampoImovel } from "@/lib/imovel";

import { editarImovel, type EstadoEdicao } from "../../acoes";

type Opcao = { valor: string; rotulo: string };
type Valores = Partial<Record<CampoImovel, string>>;

// Edição do imóvel já enviado: ProEditar (disponível), ProReprovado (reprovado,
// com o "Reenviar") e o pendente (corrige antes da análise).
export function FormEditarImovel({
  id,
  status,
  titulo,
  fotos,
  tipos,
  bairros,
  iniciais,
}: {
  id: string;
  status: "pendente" | "reprovado" | "disponivel";
  titulo: string;
  fotos: number;
  tipos: Opcao[];
  bairros: Opcao[];
  iniciais: Valores;
}) {
  const [estado, enviar, enviando] = useActionState(editarImovel.bind(null, id), {
    erros: {},
    valores: iniciais,
  } satisfies EstadoEdicao);
  const salvou = estado.mudancas !== undefined && !estado.erroGeral;

  if (estado.reenviado) {
    return (
      <Resposta titulo="Imóvel reenviado" selo="Aguardando aprovação" voltar={{ href: "/proprietario", rotulo: "Voltar para meus imóveis" }}>
        A equipe PAUTA vai analisar o imóvel “{titulo}” de novo. Você recebe a resposta em Meus imóveis.
      </Resposta>
    );
  }
  if (salvou && status !== "reprovado") {
    return (
      <Resposta titulo="Alterações salvas" voltar={{ href: `/proprietario/imoveis/${id}`, rotulo: "Voltar para o imóvel" }}>
        {status === "disponivel"
          ? "As mudanças já aparecem no catálogo para os corretores."
          : "A equipe PAUTA vai conferir a versão nova antes de aprovar."}
        <OQueMudou mudancas={estado.mudancas!} registrado={status === "disponivel"} />
      </Resposta>
    );
  }

  return (
    <form
      action={enviar}
      onSubmit={(evento) => {
        evento.preventDefault();
        // O botão clicado (Salvar ou Reenviar) vai junto: new FormData(form) sozinho não leva.
        const dados = new FormData(evento.currentTarget, (evento.nativeEvent as SubmitEvent).submitter);
        startTransition(() => enviar(dados));
      }}
      noValidate
      className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-4 md:rounded-cartao md:border md:border-line md:bg-card md:p-6"
    >
      <div className="flex flex-col gap-3.5 px-5 md:gap-4 md:px-0">
        <CamposDoImovel tipos={tipos} bairros={bairros} valores={estado.valores} erros={estado.erros} antes={iniciais} />

        <div className="flex items-center justify-between gap-3 rounded-cartao border border-line bg-card p-4">
          <div className="flex flex-col gap-0.5">
            <b className="text-small">Fotos ({fotos})</b>
            {status === "disponivel" && (
              <span className="text-tiny text-ink2">Foto nova, removida ou fora de ordem também fica registrada.</span>
            )}
          </div>
          <Link href={`/proprietario/imoveis/${id}/editar/fotos`} className={classesBotao({ variante: "secundario", tamanho: "pequeno" })}>
            Mudar fotos
          </Link>
        </div>

        {salvou && status === "reprovado" && (
          <p role="status" className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
            {estado.mudancas!.length > 0 ? "Mudanças salvas." : "Nada mudou."} O imóvel continua reprovado até você reenviar.
          </p>
        )}
        {estado.erroGeral && (
          <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
            {estado.erroGeral}
          </p>
        )}
        {status === "reprovado" && (
          <p className="text-tiny text-ink2">
            Salvar guarda as mudanças sem mandar o imóvel para a aprovação. Ele só volta para a fila quando você tocar em Reenviar.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 border-t border-line bg-card px-5 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] md:static md:mt-0 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0">
        {status === "reprovado" ? (
          <div className="grid grid-cols-2 gap-2.5 md:flex">
            <Botao type="submit" name="acao" value="salvar" variante="secundario" disabled={enviando}>
              Salvar
            </Botao>
            <Botao type="submit" name="acao" value="reenviar" disabled={enviando}>
              {enviando ? "Enviando…" : "Reenviar para aprovação"}
            </Botao>
          </div>
        ) : (
          <Botao type="submit" name="acao" value="salvar" disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar alterações"}
          </Botao>
        )}
      </div>
    </form>
  );
}

function OQueMudou({ mudancas, registrado }: { mudancas: NonNullable<EstadoEdicao["mudancas"]>; registrado: boolean }) {
  if (mudancas.length === 0) return <span className="mt-3 block rounded-[14px] bg-bg p-3.5 text-small">Nada mudou.</span>;
  return (
    <span className="mt-3 flex flex-col gap-2 rounded-cartao border border-line bg-card p-4 text-left text-ink">
      <span className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">O que mudou</span>
      {mudancas.map((mudanca) => (
        <span key={mudanca.campo} className="flex flex-wrap justify-between gap-2 text-small">
          <b>{mudanca.campo}</b>
          <span>
            <span className="text-erro line-through">{mudanca.antes}</span> → <span className="font-bold text-mar-dark">{mudanca.depois}</span>
          </span>
        </span>
      ))}
      {registrado && <span className="text-tiny text-ink2">Registrado para a equipe PAUTA revisar.</span>}
    </span>
  );
}

function Resposta({
  titulo,
  selo,
  voltar,
  children,
}: {
  titulo: string;
  selo?: string;
  voltar: { href: string; rotulo: string };
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-4 md:max-w-[640px] md:rounded-cartao md:border md:border-line md:bg-card md:p-10">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-mar-soft text-mar">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
      {selo && <span className="self-start rounded-full bg-cinza-soft px-2.5 py-[3px] text-tiny font-bold text-ink2">{selo}</span>}
      <h2 role="status" className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">
        {titulo}
      </h2>
      <p className="text-ink2">{children}</p>
      <Link href={voltar.href} className={`${classesBotao({ variante: "secundario" })} md:self-start`}>
        {voltar.rotulo}
      </Link>
    </div>
  );
}
