"use server";

import { redirect } from "next/navigation";

import { exigirTipo } from "@/lib/auth";
import { idDeImovelValido, lerDadosDoImovel, type CampoImovel } from "@/lib/imovel";
import { criarClienteServidor } from "@/lib/supabase/server";

// Cadastro do imóvel pelo proprietário (RF07), na ordem do protótipo:
//   1. dados   → salvarDadosDoImovel cria o rascunho (ou corrige o rascunho)
//   2. fotos   → passo 4.3
//   3. termo   → enviarParaAprovacao aceita o termo e manda para a aprovação
// O id do imóvel chega pelo bind() do formulário, que a pessoa pode alterar: o
// RLS do banco só deixa mexer no próprio rascunho, e o status só muda pela
// função enviar_imovel() do banco.

export type EstadoDadosImovel = {
  erros: Partial<Record<CampoImovel, string>>;
  erroGeral?: string;
  valores: Partial<Record<CampoImovel, string>>;
};

export async function salvarDadosDoImovel(
  id: string | null,
  _anterior: EstadoDadosImovel,
  formData: FormData,
): Promise<EstadoDadosImovel> {
  const usuario = await exigirTipo("proprietario");

  const leitura = lerDadosDoImovel(formData);
  if (!leitura.ok) return { erros: leitura.erros, valores: leitura.valores };
  const { dados, valores } = leitura;

  const supabase = await criarClienteServidor();
  let imovelId = id;

  if (imovelId === null) {
    // proprietario_id e status: o banco preenche (dono = quem está logado; nasce rascunho).
    const { data, error } = await supabase.from("imoveis").insert(dados).select("id").single();
    if (error) return erroDoBanco(error, valores);
    imovelId = data.id as string;
  } else {
    if (!idDeImovelValido(imovelId)) return { erros: {}, valores, erroGeral: "Imóvel não encontrado." };
    const { data, error } = await supabase
      .from("imoveis")
      .update(dados)
      .eq("id", imovelId)
      .eq("proprietario_id", usuario.id)
      .eq("status", "rascunho")
      .select("id");
    if (error) return erroDoBanco(error, valores);
    // Nenhuma linha: não é dele, ou já foi enviado para a aprovação.
    if (data.length === 0) {
      return { erros: {}, valores, erroGeral: "Este imóvel não pode mais ser alterado por aqui. Volte para Meus imóveis." };
    }
  }

  redirect(`/proprietario/imoveis/${imovelId}/fotos`);
}

// Os erros que o banco devolve, pelo código (nunca pelo texto em inglês).
function erroDoBanco(error: { code?: string; message: string }, valores: EstadoDadosImovel["valores"]): EstadoDadosImovel {
  // P0001: tipo ou bairro fora de uso (gatilho conferir_listas_ativas).
  if (error.code === "P0001" && error.message.includes("tipo")) {
    return { erros: { tipo_id: "Este tipo não está mais em uso. Escolha outro." }, valores };
  }
  if (error.code === "P0001" && error.message.includes("bairro")) {
    return { erros: { bairro_id: "Este bairro não está mais em uso. Escolha outro." }, valores };
  }
  // 23503: tipo ou bairro que não existe (lista alterada na requisição).
  if (error.code === "23503") {
    return { erros: {}, valores, erroGeral: "Escolha o tipo e o bairro nas listas." };
  }
  return { erros: {}, valores, erroGeral: "Não foi possível salvar. Confira os dados e tente de novo." };
}

export type EstadoEnvio = { erro?: string; termoMudou?: boolean };

export async function enviarParaAprovacao(id: string, _anterior: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  const usuario = await exigirTipo("proprietario");
  if (!idDeImovelValido(id)) return { erro: "Imóvel não encontrado." };

  if (formData.get("aceito") !== "sim") return { erro: "Aceite o termo de exclusividade para enviar." };
  // A versão que a pessoa leu na tela. Se o termo mudou enquanto ela lia, o
  // banco recusa, e ela lê a versão nova antes de aceitar.
  const versao = String(formData.get("termo_versao") ?? "");
  const mostrarContato = formData.get("mostrar_contato") === "sim";

  const supabase = await criarClienteServidor();

  const { data, error: erroContato } = await supabase
    .from("imoveis")
    .update({ mostrar_contato: mostrarContato })
    .eq("id", id)
    .eq("proprietario_id", usuario.id)
    .eq("status", "rascunho")
    .select("id");
  if (erroContato) return { erro: "Não foi possível enviar. Tente de novo." };
  if (data.length === 0) return { erro: "Este imóvel já foi enviado ou não está mais disponível para envio." };

  const { error } = await supabase.rpc("enviar_imovel", { p_imovel: id, p_termo_versao: versao });
  if (error) {
    if (error.code === "P0001" && error.message.includes("foto")) {
      return { erro: "Envie pelo menos uma foto antes de mandar para a aprovação." };
    }
    if (error.code === "P0001" && error.message.includes("vigente")) {
      return { erro: "O termo de exclusividade foi atualizado. Leia a versão nova e aceite de novo.", termoMudou: true };
    }
    if (error.code === "P0001" && error.message.includes("rascunho")) {
      return { erro: "Este imóvel já foi enviado ou não está mais disponível para envio." };
    }
    return { erro: "Não foi possível enviar. Tente de novo." };
  }

  redirect(`/proprietario/imoveis/${id}/enviado`);
}
