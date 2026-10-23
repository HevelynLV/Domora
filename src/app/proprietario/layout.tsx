import { AreaLogada } from "@/components/AreaLogada";
import { menuProprietario } from "@/lib/menus";

// Moldura da área (menus). Não confere quem é: cada página chama exigirTipo().
export default function Layout({ children }: LayoutProps<"/proprietario">) {
  return <AreaLogada menu={menuProprietario}>{children}</AreaLogada>;
}
