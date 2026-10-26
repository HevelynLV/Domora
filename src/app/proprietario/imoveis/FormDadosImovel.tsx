"use client";

import { startTransition, useActionState } from "react";

import { BarraDoPasso } from "@/components/imovel/MolduraDoCadastro";
import { Botao } from "@/components/ui/Botao";
import { Campo, CampoSelecao, CampoTextoLongo } from "@/components/ui/Campo";
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
  const { erros, valores } = estado;

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
        <Campo name="titulo" rotulo="Título do anúncio" maxLength={120} defaultValue={valores.titulo} erro={erros.titulo} />
        <div className="grid grid-cols-2 gap-2.5 md:gap-4">
          <CampoSelecao
            name="tipo_id"
            rotulo="Tipo"
            opcoes={tipos}
            vazio="Escolha"
            defaultValue={valores.tipo_id ?? ""}
            erro={erros.tipo_id}
          />
          <Campo
            name="preco"
            rotulo="Preço (R$)"
            inputMode="decimal"
            placeholder="1.890.000"
            defaultValue={valores.preco}
            erro={erros.preco}
          />
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
          <Campo
            name="endereco"
            rotulo="Endereço"
            dica="Assinantes ativos veem o endereço para marcar a visita."
            autoComplete="street-address"
            maxLength={200}
            defaultValue={valores.endereco}
            erro={erros.endereco}
          />
          <CampoSelecao
            name="bairro_id"
            rotulo="Bairro"
            opcoes={bairros}
            vazio="Escolha o bairro"
            defaultValue={valores.bairro_id ?? ""}
            erro={erros.bairro_id}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <Campo name="quartos" rotulo="Quartos" inputMode="numeric" maxLength={2} defaultValue={valores.quartos} erro={erros.quartos} />
          <Campo name="banheiros" rotulo="Banheiros" inputMode="numeric" maxLength={2} defaultValue={valores.banheiros} erro={erros.banheiros} />
          <Campo name="vagas" rotulo="Vagas" inputMode="numeric" maxLength={2} defaultValue={valores.vagas} erro={erros.vagas} />
          <Campo name="area" rotulo="Área m²" inputMode="decimal" defaultValue={valores.area} erro={erros.area} />
        </div>
        <CampoTextoLongo
          name="descricao"
          rotulo="Descrição"
          maxLength={5000}
          defaultValue={valores.descricao}
          erro={erros.descricao}
        />

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
