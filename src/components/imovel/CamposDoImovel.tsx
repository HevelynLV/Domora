"use client";

import { useState, type ChangeEvent } from "react";

import { Campo, CampoSelecao, CampoTextoLongo } from "@/components/ui/Campo";
import type { CampoImovel } from "@/lib/imovel";

type Opcao = { valor: string; rotulo: string };
type Valores = Partial<Record<CampoImovel, string>>;

// Os campos do imóvel (RF07), iguais no cadastro (ProNovo) e na edição (ProEditar
// e ProReprovado). Com "antes" (os valores gravados), cada campo mudado mostra
// "Antes: ..." embaixo, como no ProEditar: a pessoa vê o que está trocando.
export function CamposDoImovel({
  tipos,
  bairros,
  valores,
  erros,
  antes,
}: {
  tipos: Opcao[];
  bairros: Opcao[];
  valores: Valores;
  erros: Partial<Record<CampoImovel, string>>;
  antes?: Valores;
}) {
  const [digitados, setDigitados] = useState<Valores>({});

  const anotar = (evento: ChangeEvent<HTMLDivElement>) => {
    const alvo = evento.target as unknown as HTMLInputElement;
    if (alvo.name) setDigitados((atual) => ({ ...atual, [alvo.name]: alvo.value }));
  };

  // "Antes: ..." só no campo que mudou (nas listas, o nome do item, não o número).
  const dicaAntes = (campo: CampoImovel, lista?: Opcao[]) => {
    if (!antes || digitados[campo] === undefined || digitados[campo].trim() === (antes[campo] ?? "")) return undefined;
    const anterior = lista ? lista.find((opcao) => opcao.valor === antes[campo])?.rotulo : antes[campo];
    return `Antes: ${anterior || "(vazio)"}`;
  };

  return (
    <div className="flex flex-col gap-3.5 md:gap-4" onChange={anotar}>
      <Campo
        name="titulo"
        rotulo="Título do anúncio"
        maxLength={120}
        defaultValue={valores.titulo}
        erro={erros.titulo}
        dica={dicaAntes("titulo")}
      />
      <div className="grid grid-cols-2 gap-2.5 md:gap-4">
        <CampoSelecao
          name="tipo_id"
          rotulo="Tipo"
          opcoes={tipos}
          vazio="Escolha"
          defaultValue={valores.tipo_id ?? ""}
          erro={erros.tipo_id}
          dica={dicaAntes("tipo_id", tipos)}
        />
        <Campo
          name="preco"
          rotulo="Preço (R$)"
          inputMode="decimal"
          placeholder="1.890.000"
          defaultValue={valores.preco}
          erro={erros.preco}
          dica={dicaAntes("preco")}
        />
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
        <Campo
          name="endereco"
          rotulo="Endereço"
          dica={dicaAntes("endereco") ?? "Assinantes ativos veem o endereço para marcar a visita."}
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
          dica={dicaAntes("bairro_id", bairros)}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <Campo name="quartos" rotulo="Quartos" inputMode="numeric" maxLength={2} defaultValue={valores.quartos} erro={erros.quartos} dica={dicaAntes("quartos")} />
        <Campo name="banheiros" rotulo="Banheiros" inputMode="numeric" maxLength={2} defaultValue={valores.banheiros} erro={erros.banheiros} dica={dicaAntes("banheiros")} />
        <Campo name="vagas" rotulo="Vagas" inputMode="numeric" maxLength={2} defaultValue={valores.vagas} erro={erros.vagas} dica={dicaAntes("vagas")} />
        <Campo name="area" rotulo="Área m²" inputMode="decimal" defaultValue={valores.area} erro={erros.area} dica={dicaAntes("area")} />
      </div>
      <CampoTextoLongo
        name="descricao"
        rotulo="Descrição"
        maxLength={5000}
        defaultValue={valores.descricao}
        erro={erros.descricao}
        dica={dicaAntes("descricao") ? "Descrição alterada." : undefined}
      />
    </div>
  );
}
