import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarPreco, idDeImovelValido } from "@/lib/imovel";
import { fotosDoImovel, type FotoDoImovel } from "@/lib/imoveis";

// Leituras do admin sobre imóveis, com a sessão dele: o RLS deixa o admin ver
// todos os imóveis (menos rascunho), as fotos, os perfis e o registro de edições.
// Quem chama já passou pelo exigirTipo("admin").

export type ImovelNaFila = { id: string; titulo: string; dona: string; enviado_em: string | null };

export type ImovelParaAprovar = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  endereco: string;
  bairro: string;
  preco: number;
  quartos: number;
  banheiros: number;
  vagas: number;
  area: number;
  mostrar_contato: boolean;
  status: string;
  // A versão que esta tela mostra: vai junto com o "Aprovar" (RF14).
  versao: number;
  termo_versao: string | null;
  termo_aceito_em: string | null;
  dona: string;
  contato: { telefone: string; email: string } | null;
  fotos: FotoDoImovel[];
};

// Ligação com outra tabela: sem os tipos gerados do banco, o supabase-js descreve
// como lista, mas chega um objeto só.
function campoDaLigacao<T>(ligacao: T | T[] | null): T | null {
  return (Array.isArray(ligacao) ? ligacao[0] : ligacao) ?? null;
}

// Imóveis esperando aprovação, os mais antigos primeiro.
export async function filaDeAprovacao(): Promise<ImovelNaFila[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("imoveis")
    .select("id, titulo, termo_aceito_em, perfis!imoveis_proprietario_id_fkey(nome)")
    .eq("status", "pendente")
    .order("termo_aceito_em", { ascending: true });
  if (error) throw error;
  return data.map((imovel) => ({
    id: imovel.id,
    titulo: imovel.titulo,
    dona: campoDaLigacao(imovel.perfis as { nome: string } | { nome: string }[] | null)?.nome ?? "",
    enviado_em: imovel.termo_aceito_em,
  }));
}

export async function imovelParaAprovar(id: string): Promise<ImovelParaAprovar | null> {
  if (!idDeImovelValido(id)) return null;
  const supabase = await criarClienteServidor();
  const [{ data, error }, contato, fotos] = await Promise.all([
    supabase
      .from("imoveis")
      .select(
        "id, titulo, descricao, endereco, preco, quartos, banheiros, vagas, area, mostrar_contato, status, versao, termo_versao, termo_aceito_em, tipos_imovel(nome), bairros(nome), perfis!imoveis_proprietario_id_fkey(nome)",
      )
      .eq("id", id)
      .maybeSingle(),
    // O contato do dono só sai por esta função (RNF06); para o admin, sempre.
    supabase.rpc("contato_do_proprietario", { p_imovel: id }),
    fotosDoImovel(id, { grandes: true }),
  ]);
  if (error) throw error;
  if (!data) return null;

  const { tipos_imovel, bairros, perfis, ...imovel } = data;
  const nome = (ligacao: unknown) => campoDaLigacao(ligacao as { nome: string } | null)?.nome ?? "";
  return {
    ...imovel,
    preco: Number(imovel.preco),
    area: Number(imovel.area),
    tipo: nome(tipos_imovel),
    bairro: nome(bairros),
    dona: nome(perfis),
    contato: (contato.data as { telefone: string; email: string }[] | null)?.[0] ?? null,
    fotos,
  };
}

export type EdicaoParaRevisar = {
  id: number;
  imovel: string;
  campo: string;
  antes: string;
  depois: string;
  quem: string;
  editadoEm: string;
  revisada: boolean;
};

const ROTULO_DO_CAMPO: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  tipo_id: "Tipo",
  endereco: "Endereço",
  bairro_id: "Bairro",
  preco: "Preço",
  quartos: "Quartos",
  banheiros: "Banheiros",
  vagas: "Vagas",
  area: "Área",
  mostrar_contato: "Contato para corretores",
  fotos: "Fotos",
};

// O registro guarda o valor como texto do banco ("550000.00", "true", o número do
// tipo, "abc/123.jpg (posição 2)"); aqui ele vira o que a pessoa lê.
function valorLegivel(campo: string, valor: string | null, nomes: { tipos: Map<string, string>; bairros: Map<string, string> }) {
  if (valor === null) return campo === "fotos" ? "" : "(vazio)";
  switch (campo) {
    case "preco":
      return formatarPreco(Number(valor));
    case "area":
      return `${Number(valor).toLocaleString("pt-BR")} m²`;
    case "tipo_id":
      return nomes.tipos.get(valor) ?? valor;
    case "bairro_id":
      return nomes.bairros.get(valor) ?? valor;
    case "mostrar_contato":
      return valor === "true" ? "Mostrar" : "Esconder";
    case "fotos":
      return `foto na posição ${valor.match(/\(posição (\d+)\)$/)?.[1] ?? "?"}`;
    default:
      return valor;
  }
}

// Foto: uma linha do registro é uma foto nova, tirada ou trocada de lugar.
function textoDaFoto(antes: string | null, depois: string | null, legivel: (v: string | null) => string) {
  if (antes === null) return { antes: "—", depois: `Foto nova (${legivel(depois)})` };
  if (depois === null) return { antes: `Foto tirada (${legivel(antes)})`, depois: "—" };
  return { antes: legivel(antes), depois: legivel(depois) };
}

// Edições do dono em imóvel disponível (RF17, RNF11): todas as que faltam revisar
// e as 20 revisadas mais recentes.
export async function edicoesParaRevisar(): Promise<EdicaoParaRevisar[]> {
  const supabase = await criarClienteServidor();
  const campos = "id, campo, valor_antigo, valor_novo, editado_em, revisado_em, imoveis(titulo), perfis!edicoes_imovel_editado_por_fkey(nome)";
  const [pendentes, revisadas, tipos, bairros] = await Promise.all([
    supabase.from("edicoes_imovel").select(campos).is("revisado_em", null).order("editado_em", { ascending: false }),
    supabase.from("edicoes_imovel").select(campos).not("revisado_em", "is", null).order("revisado_em", { ascending: false }).limit(20),
    supabase.from("tipos_imovel").select("id, nome"),
    supabase.from("bairros").select("id, nome"),
  ]);
  if (pendentes.error) throw pendentes.error;
  if (revisadas.error) throw revisadas.error;
  const nomes = {
    tipos: new Map((tipos.data ?? []).map((t) => [String(t.id), t.nome as string])),
    bairros: new Map((bairros.data ?? []).map((b) => [String(b.id), b.nome as string])),
  };

  return [...pendentes.data, ...revisadas.data].map((edicao) => {
    const legivel = (valor: string | null) => valorLegivel(edicao.campo, valor, nomes);
    const valores =
      edicao.campo === "fotos"
        ? textoDaFoto(edicao.valor_antigo, edicao.valor_novo, legivel)
        : { antes: legivel(edicao.valor_antigo), depois: legivel(edicao.valor_novo) };
    return {
      id: edicao.id,
      imovel: campoDaLigacao(edicao.imoveis as { titulo: string } | { titulo: string }[] | null)?.titulo ?? "",
      campo: ROTULO_DO_CAMPO[edicao.campo] ?? edicao.campo,
      ...valores,
      quem: campoDaLigacao(edicao.perfis as { nome: string } | { nome: string }[] | null)?.nome ?? "(conta apagada)",
      editadoEm: edicao.editado_em,
      revisada: edicao.revisado_em !== null,
    };
  });
}

export type CaptadoAguardando = { id: string; titulo: string; dono: string; captadoEm: string; dias: number; fotos: number };

// Imóveis captados que ainda esperam o dono aceitar o termo (passo 4.7).
export async function captadosAguardando(): Promise<CaptadoAguardando[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("imoveis")
    .select("id, titulo, criado_em, perfis!imoveis_proprietario_id_fkey(nome), fotos_imovel(count)")
    .eq("status", "captado")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return data.map((imovel) => ({
    id: imovel.id,
    titulo: imovel.titulo,
    dono: campoDaLigacao(imovel.perfis as { nome: string } | { nome: string }[] | null)?.nome ?? "",
    captadoEm: imovel.criado_em,
    dias: Math.floor((Date.now() - new Date(imovel.criado_em).getTime()) / 864e5),
    fotos: (imovel.fotos_imovel as { count: number }[])[0]?.count ?? 0,
  }));
}

// Números do painel do admin (AdmPainel): o que está esperando por ele.
export async function numerosDoPainel() {
  const supabase = await criarClienteServidor();
  const [imoveis, edicoes, captados] = await Promise.all([
    supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("edicoes_imovel").select("id", { count: "exact", head: true }).is("revisado_em", null),
    supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "captado"),
  ]);
  return {
    imoveisParaAprovar: imoveis.count ?? 0,
    edicoesParaRevisar: edicoes.count ?? 0,
    captadosAguardando: captados.count ?? 0,
  };
}
