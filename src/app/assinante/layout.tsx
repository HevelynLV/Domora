import { AreaLogada } from "@/components/AreaLogada";
import { menuAssinante } from "@/lib/menus";

// Moldura da área (menus). Não confere quem é: cada página chama exigirTipo().
export default function Layout({ children }: LayoutProps<"/assinante">) {
  return <AreaLogada menu={menuAssinante}>{children}</AreaLogada>;
}
