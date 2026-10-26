import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import { idDeImovelValido } from "@/lib/imovel";
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

// Números do painel do admin (AdmPainel): o que está esperando por ele.
export async function numerosDoPainel() {
  const supabase = await criarClienteServidor();
  const [imoveis, edicoes] = await Promise.all([
    supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("edicoes_imovel").select("id", { count: "exact", head: true }).is("revisado_em", null),
  ]);
  return { imoveisParaAprovar: imoveis.count ?? 0, edicoesParaRevisar: edicoes.count ?? 0 };
}
