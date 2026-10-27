"use server";

import { exigirTipo, type Usuario } from "@/lib/auth";
import { BUCKET_FOTOS, caminhoDaMiniatura, idDeImovelValido, LIMITE_DE_FOTOS } from "@/lib/imovel";
import { fotosDoImovel, type FotoDoImovel } from "@/lib/imoveis";
import { criarClienteServidor } from "@/lib/supabase/server";

// Fotos do imóvel (RF09): pelo proprietário, e pelo admin no imóvel captado
// (passo 4.7), antes de o dono aceitar o termo. Os arquivos não passam por aqui (o
// limite de uma Server Action é 1 MB): o servidor confere quem pede e dá links de
// envio assinados; o navegador manda os arquivos direto para o Supabase Storage;
// depois o servidor confere que eles chegaram e grava as fotos no banco.
// Quem pode mexer em quê está nas regras do bucket e de fotos_imovel
// (supabase/migrations/20261026221116_fotos_storage.sql).

// Onde cada um mexe nas fotos por estas telas (o banco confere de novo).
const STATUS_QUE_ACEITAM_FOTOS = {
  proprietario: ["rascunho", "pendente", "reprovado", "disponivel"],
  admin: ["captado"],
} as const;
const NOME_DE_ARQUIVO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type ResultadoFotos = { fotos?: FotoDoImovel[]; erro?: string };

export type LinksDeEnvio = {
  erro?: string;
  envios?: { nome: string; grande: { caminho: string; token: string }; mini: { caminho: string; token: string } }[];
};

// Confere que quem está logado pode mexer nas fotos deste imóvel agora (o dono, no
// próprio imóvel; o admin, no captado). Devolve quantas fotos ele já tem, ou null.
async function fotosJaEnviadas(imovelId: string, usuario: Usuario) {
  if (!idDeImovelValido(imovelId)) return null;
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("imoveis").select("status, fotos_imovel(count)").eq("id", imovelId);
  if (usuario.tipo === "proprietario") consulta = consulta.eq("proprietario_id", usuario.id);
  const { data } = await consulta.maybeSingle();
  const permitidos: readonly string[] = usuario.tipo === "admin" ? STATUS_QUE_ACEITAM_FOTOS.admin : STATUS_QUE_ACEITAM_FOTOS.proprietario;
  if (!data || !permitidos.includes(data.status)) return null;
  return (data.fotos_imovel as { count: number }[])[0]?.count ?? 0;
}

export async function pedirEnvioDeFotos(imovelId: string, quantidade: number): Promise<LinksDeEnvio> {
  const usuario = await exigirTipo(["proprietario", "admin"]);
  const jaTem = await fotosJaEnviadas(imovelId, usuario);
  if (jaTem === null) return { erro: "Este imóvel não aceita fotos agora." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Escolha pelo menos uma foto." };
  if (jaTem + quantidade > LIMITE_DE_FOTOS) {
    return { erro: `Cada imóvel tem no máximo ${LIMITE_DE_FOTOS} fotos. Dá para enviar mais ${LIMITE_DE_FOTOS - jaTem}.` };
  }

  // O nome do arquivo é escolhido aqui, não pelo navegador.
  const supabase = await criarClienteServidor();
  const balde = supabase.storage.from(BUCKET_FOTOS);
  const envios: NonNullable<LinksDeEnvio["envios"]> = [];
  for (let i = 0; i < quantidade; i++) {
    const nome = crypto.randomUUID();
    const caminho = `${imovelId}/${nome}.jpg`;
    // O Storage confere as regras do bucket (insert) para quem está logado.
    const [grande, mini] = await Promise.all([
      balde.createSignedUploadUrl(caminho),
      balde.createSignedUploadUrl(caminhoDaMiniatura(caminho)),
    ]);
    if (grande.error || mini.error) return { erro: "Não foi possível preparar o envio. Tente de novo." };
    envios.push({
      nome,
      grande: { caminho, token: grande.data.token },
      mini: { caminho: caminhoDaMiniatura(caminho), token: mini.data.token },
    });
  }
  return { envios };
}

// Grava no banco as fotos que chegaram ao Storage, depois das que já existem.
export async function registrarFotos(imovelId: string, nomes: string[]): Promise<ResultadoFotos> {
  const usuario = await exigirTipo(["proprietario", "admin"]);
  const jaTem = await fotosJaEnviadas(imovelId, usuario);
  if (jaTem === null) return { erro: "Este imóvel não aceita fotos agora." };
  if (!Array.isArray(nomes) || nomes.length > LIMITE_DE_FOTOS || !nomes.every((n) => NOME_DE_ARQUIVO.test(n))) {
    return { erro: "Não foi possível gravar as fotos." };
  }

  const supabase = await criarClienteServidor();
  const balde = supabase.storage.from(BUCKET_FOTOS);
  // Só grava a foto se os dois arquivos chegaram (a rede do celular pode ter caído).
  const chegaram: string[] = [];
  for (const nome of nomes) {
    const caminho = `${imovelId}/${nome}.jpg`;
    const [grande, mini] = await Promise.all([balde.exists(caminho), balde.exists(caminhoDaMiniatura(caminho))]);
    if (grande.data && mini.data) chegaram.push(caminho);
  }

  const { data: ultima } = await supabase
    .from("fotos_imovel")
    .select("ordem")
    .eq("imovel_id", imovelId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proxima = (ultima?.ordem ?? 0) + 1;

  let erro: string | undefined;
  if (chegaram.length > 0) {
    const { error } = await supabase
      .from("fotos_imovel")
      .insert(chegaram.map((caminho, i) => ({ imovel_id: imovelId, caminho, ordem: proxima + i })));
    // P0001: passou do limite de 20 (gatilho conferir_limite_de_fotos).
    if (error) erro = error.code === "P0001" ? "Cada imóvel tem no máximo 20 fotos." : "Não foi possível gravar as fotos.";
  }
  if (!erro && chegaram.length < nomes.length) {
    erro = "Algumas fotos não chegaram. Confira a internet e envie de novo.";
  }
  return { fotos: await fotosDoImovel(imovelId), erro };
}

// Nova ordem: a lista de todas as fotos do imóvel, a primeira é a capa.
export async function reordenarFotos(imovelId: string, ids: string[]): Promise<ResultadoFotos> {
  const usuario = await exigirTipo(["proprietario", "admin"]);
  if ((await fotosJaEnviadas(imovelId, usuario)) === null) return { erro: "Este imóvel não aceita mudanças nas fotos agora." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("reordenar_fotos", { p_imovel: imovelId, p_fotos: ids });
  return {
    fotos: await fotosDoImovel(imovelId),
    erro: error ? "As fotos mudaram em outra tela. Confira a ordem e tente de novo." : undefined,
  };
}

export async function removerFoto(imovelId: string, fotoId: string): Promise<ResultadoFotos> {
  const usuario = await exigirTipo(["proprietario", "admin"]);
  if ((await fotosJaEnviadas(imovelId, usuario)) === null) return { erro: "Este imóvel não aceita mudanças nas fotos agora." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("fotos_imovel")
    .delete()
    .eq("id", fotoId)
    .eq("imovel_id", imovelId)
    .select("caminho");
  if (error?.code === "P0001") {
    // Gatilho conferir_ultima_foto: pendente e disponível não ficam sem foto.
    return { fotos: await fotosDoImovel(imovelId), erro: "O imóvel precisa de pelo menos uma foto. Envie outra antes de tirar esta." };
  }
  if (error || data.length === 0) return { fotos: await fotosDoImovel(imovelId), erro: "Não foi possível tirar a foto." };

  // Depois da linha, os arquivos. Se falhar, sobra um arquivo sem foto no banco
  // (ninguém vê na tela; limpeza dos arquivos soltos na Etapa 13).
  const caminho = data[0].caminho as string;
  await supabase.storage.from(BUCKET_FOTOS).remove([caminho, caminhoDaMiniatura(caminho)]);

  // Fecha o buraco na ordem: as que sobraram, na mesma sequência, viram 1, 2, 3...
  const restantes = await fotosDoImovel(imovelId);
  if (restantes.some((foto, i) => foto.ordem !== i + 1)) {
    await supabase.rpc("reordenar_fotos", { p_imovel: imovelId, p_fotos: restantes.map((foto) => foto.id) });
    return { fotos: await fotosDoImovel(imovelId) };
  }
  return { fotos: restantes };
}
