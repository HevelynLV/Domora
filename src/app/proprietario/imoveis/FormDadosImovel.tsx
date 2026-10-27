"use client";

import { startTransition, useActionState } from "react";

import { CamposDoImovel } from "@/components/imovel/CamposDoImovel";
import { BarraDoPasso } from "@/components/imovel/MolduraDoCadastro";
import { Botao } from "@/components/ui/Botao";
import type { CampoImovel } from "@/lib/imovel";

import { salvarDadosDoImovel, type EstadoDadosImovel } from "./acoes";

type Opcao = { valor: string; rotulo: string };

// Passo 1 do cadastro (ProNovo e SiteProNovo). Sem id, cria o rascunho; com id,
// corrige o rascunho (quem volta do passo 2). O servidor confere tudo de novo.
export function FormDadosImovel({
  id,
  tipos,
  bairros,
  iniciais = {},
}: {
  id: string | null;
  tipos: Opcao[];
  bairros: Opcao[];
  iniciais?: Partial<Record<CampoImovel, string>>;
}) {
  const [estado, enviar, enviando] = useActionState(salvarDadosDoImovel.bind(null, id), {
    erros: {},
    valores: iniciais,
  } satisfies EstadoDadosImovel);

  return (
    <form
      action={enviar}
      // Sem isto, o React limpa o formulário depois de enviar, e a pessoa perde o
      // que digitou quando aparece um erro. Sem JavaScript, o action acima envia.
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        startTransition(() => enviar(dados));
      }}
      noValidate
      className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-4 md:rounded-cartao md:border md:border-line md:bg-card md:p-6"
    >
      <div className="flex flex-col gap-3.5 px-5 md:gap-4 md:px-0">
        <CamposDoImovel tipos={tipos} bairros={bairros} valores={estado.valores} erros={estado.erros} />

        {estado.erroGeral && (
          <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
            {estado.erroGeral}
          </p>
        )}
      </div>

      <BarraDoPasso>
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Continuar para as fotos"}
        </Botao>
      </BarraDoPasso>
    </form>
  );
}
