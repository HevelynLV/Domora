import type { NomeIcone } from "./icones";

// Item dos menus de área (MenuInferior no celular, MenuLateral no computador).
export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: NomeIcone;
  contador?: number;
};

// Acende o item do endereço atual e também das páginas dentro dele
// (/imoveis/123 acende "Imóveis"). Se dois itens servirem, vale o mais específico.
export function hrefAtivo(caminho: string, itens: ItemMenu[]) {
  const servem = itens.filter(
    (item) => caminho === item.href || caminho.startsWith(`${item.href}/`),
  );
  return servem.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
