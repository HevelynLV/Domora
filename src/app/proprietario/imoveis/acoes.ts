"use server";

import { redirect } from "next/navigation";

import { exigirTipo } from "@/lib/auth";
import { BUCKET_FOTOS, formatarPreco, idDeImovelValido, lerDadosDoImovel, type CampoImovel } from "@/lib/imovel";
import { imovelDoDono, listasDoImovel } from "@/lib/imoveis";
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

// Editar imóvel já enviado (RF10, RF11). Pendente e reprovado: a edição não vai
// para o registro (o imóvel não está no catálogo). Disponível: vale na hora, sem
// nova aprovação, e o banco registra cada campo para o admin (RNF11). Salvar
// nunca reenvia: o reprovado só volta para a fila pelo botão "Reenviar", que
// manda acao=reenviar (salva e reenvia num clique só, explícito).
export type EstadoEdicao = EstadoDadosImovel & {
  mudancas?: { campo: string; antes: string; depois: string }[];
  reenviado?: boolean;
};

const ROTULOS: Record<CampoImovel, string> = {
  titulo: "Título",
  tipo_id: "Tipo",
  preco: "Preço",
  endereco: "Endereço",
  bairro_id: "Bairro",
  quartos: "Quartos",
  banheiros: "Banheiros",
  vagas: "Vagas",
  area: "Área",
  descricao: "Descrição",
};

export async function editarImovel(id: string, _anterior: EstadoEdicao, formData: FormData): Promise<EstadoEdicao> {
  const usuario = await exigirTipo("proprietario");
  const leitura = lerDadosDoImovel(formData);
  if (!leitura.ok) return { erros: leitura.erros, valores: leitura.valores };
  const { dados, valores } = leitura;
  if (!idDeImovelValido(id)) return { erros: {}, valores, erroGeral: "Imóvel não encontrado." };

  const [atual, listas] = await Promise.all([imovelDoDono(id, usuario.id), listasDoImovel()]);
  if (!atual || !["pendente", "reprovado", "disponivel"].includes(atual.status)) {
    return { erros: {}, valores, erroGeral: "Este imóvel não pode ser editado agora." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("imoveis")
    .update(dados)
    .eq("id", id)
    .eq("proprietario_id", usuario.id)
    .in("status", ["pendente", "reprovado", "disponivel"])
    .select("id");
  if (error) return erroDoBanco(error, valores);
  if (data.length === 0) return { erros: {}, valores, erroGeral: "Este imóvel não pode ser editado agora." };

  // O que mudou, em texto para a pessoa conferir (ProEditar: "O que mudou").
  const nomeNaLista = (lista: { valor: string; rotulo: string }[], valor: number) =>
    lista.find((opcao) => opcao.valor === String(valor))?.rotulo ?? String(valor);
  const comoTexto = (campo: CampoImovel, valor: string | number) => {
    if (campo === "preco") return formatarPreco(Number(valor));
    if (campo === "area") return `${Number(valor).toLocaleString("pt-BR")} m²`;
    if (campo === "tipo_id") return nomeNaLista(listas.tipos, Number(valor));
    if (campo === "bairro_id") return nomeNaLista(listas.bairros, Number(valor));
    return String(valor);
  };
  const mudancas = (Object.keys(ROTULOS) as CampoImovel[])
    .filter((campo) => String(atual[campo]) !== String(dados[campo]))
    .map((campo) =>
      campo === "descricao"
        ? { campo: ROTULOS[campo], antes: "(texto anterior)", depois: "(texto novo)" }
        : { campo: ROTULOS[campo], antes: comoTexto(campo, atual[campo]), depois: comoTexto(campo, dados[campo]) },
    );

  if (formData.get("acao") === "reenviar" && atual.status === "reprovado") {
    const { error: erroReenvio } = await supabase.rpc("reenviar_imovel", { p_imovel: id });
    if (erroReenvio) {
      const semFoto = erroReenvio.code === "P0001" && erroReenvio.message.includes("foto");
      return {
        erros: {},
        valores,
        mudancas,
        erroGeral: semFoto
          ? "As mudanças foram salvas, mas o imóvel precisa de pelo menos uma foto para ser reenviado."
          : "As mudanças foram salvas, mas não foi possível reenviar. Tente de novo.",
      };
    }
    return { erros: {}, valores, mudancas, reenviado: true };
  }

  return { erros: {}, valores, mudancas };
}

// O dono aceita o termo do imóvel que a equipe PAUTA captou para ele (passo 4.7):
// o imóvel entra no catálogo e os 6 meses de exclusividade começam agora. Quem
// confere dono, status, foto, versão do termo e versão do imóvel é a função
// aceitar_termo_captado(). versao_imovel: a versão que a tela mostrou ao dono (o
// admin ainda pode mudar o captado enquanto ele lê).
export async function aceitarTermoCaptado(id: string, _anterior: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  await exigirTipo("proprietario");
  const versao = Number(formData.get("versao_imovel"));
  if (!idDeImovelValido(id) || !Number.isInteger(versao)) return { erro: "Imóvel não encontrado." };
  if (formData.get("aceito") !== "sim") return { erro: "Aceite o termo de exclusividade para publicar." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aceitar_termo_captado", {
    p_imovel: id,
    p_versao: versao,
    p_termo_versao: String(formData.get("termo_versao") ?? ""),
    p_mostrar_contato: formData.get("mostrar_contato") === "sim",
  });
  if (error) {
    if (error.code === "P0001" && error.message.includes("mudou")) {
      return {
        erro: "A equipe PAUTA mudou este imóvel enquanto você lia. Confira os dados de novo antes de aceitar.",
        mudou: true,
      };
    }
    if (error.code === "P0001" && error.message.includes("fotos")) {
      return { erro: "O imóvel ainda não tem fotos. Fale com a equipe PAUTA." };
    }
    if (error.code === "P0001" && error.message.includes("vigente")) {
      return { erro: "O termo de exclusividade foi atualizado. Leia a versão nova e aceite de novo.", termoMudou: true };
    }
    if (error.code === "P0001" && error.message.includes("Só o dono")) {
      return { erro: "Este imóvel não está esperando o seu aceite." };
    }
    return { erro: "Não foi possível publicar. Tente de novo." };
  }
  redirect(`/proprietario/imoveis/${id}?publicado=1`);
}

// Apagar o imóvel com as fotos (RF12): só em rascunho, pendente ou reprovado.
// Primeiro o imóvel, numa operação só no banco (se o admin aprovar no mesmo
// instante, o banco recusa e nada some); depois os arquivos, que quem enviou ainda
// pode apagar (migration 20261026225310_apagar_imovel_com_fotos).
export async function apagarImovel(id: string): Promise<{ erro?: string }> {
  const usuario = await exigirTipo("proprietario");
  if (!idDeImovelValido(id)) return { erro: "Imóvel não encontrado." };

  const supabase = await criarClienteServidor();
  const balde = supabase.storage.from(BUCKET_FOTOS);
  // A lista dos arquivos sai antes: sem o imóvel, a pasta não pode mais ser listada.
  const { data: arquivos } = await balde.list(id, { limit: 1000 });

  const { data, error } = await supabase
    .from("imoveis")
    .delete()
    .eq("id", id)
    .eq("proprietario_id", usuario.id)
    .in("status", ["rascunho", "pendente", "reprovado"])
    .select("id");
  if (error) return { erro: "Não foi possível apagar. Tente de novo." };
  if (data.length === 0) {
    return { erro: "Só dá para apagar imóvel em cadastro, aguardando aprovação ou reprovado." };
  }

  // Se falhar, os arquivos ficam soltos no bucket, sem ninguém ver (limpeza na Etapa 13).
  if (arquivos?.length) await balde.remove(arquivos.map((arquivo) => `${id}/${arquivo.name}`));
  redirect("/proprietario?apagado=1");
}

// Mostrar ou não o contato aos corretores, neste imóvel (RF13). Em imóvel
// disponível, a troca vai para o registro de edições, como qualquer campo.
export async function mudarContato(id: string, mostrar: boolean): Promise<{ erro?: string; mostrar?: boolean }> {
  const usuario = await exigirTipo("proprietario");
  if (!idDeImovelValido(id) || typeof mostrar !== "boolean") return { erro: "Imóvel não encontrado." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("imoveis")
    .update({ mostrar_contato: mostrar })
    .eq("id", id)
    .eq("proprietario_id", usuario.id)
    .select("mostrar_contato");
  if (error || data.length === 0) return { erro: "Não foi possível mudar agora. Tente de novo." };
  return { mostrar: data[0].mostrar_contato };
}

export type EstadoEnvio = { erro?: string; termoMudou?: boolean; mudou?: boolean };

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
