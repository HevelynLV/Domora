import { AreaLogada } from "@/components/AreaLogada";
import { menuAdmin } from "@/lib/menus";

// Moldura da área (menus). Não confere quem é: cada página chama exigirTipo().
export default function Layout({ children }: LayoutProps<"/admin">) {
  return <AreaLogada menu={menuAdmin}>{children}</AreaLogada>;
}
