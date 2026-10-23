import { classesBotao } from "@/components/ui/Botao";
import { sair } from "@/lib/sessao";

// "Sair". É um formulário porque sair muda o estado no servidor: um link comum
// poderia ser seguido por engano (prefetch).
//   estilo "link"  → .link do protótipo (menus e topo das telas)
//   estilo "botao" → .btn.perigo do protótipo (tela Minha conta, no celular)
export function BotaoSair({ className = "", estilo = "link" }: { className?: string; estilo?: "link" | "botao" }) {
  return (
    <form action={sair} className={className}>
      <button
        type="submit"
        className={
          estilo === "botao"
            ? `${classesBotao({ variante: "perigo" })} w-full`
            : "cursor-pointer text-small font-bold text-mar hover:underline"
        }
      >
        Sair
      </button>
    </form>
  );
}
