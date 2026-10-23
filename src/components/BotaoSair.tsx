import { sair } from "@/lib/sessao";

// "Sair" com cara de link (.link do protótipo). É um formulário porque sair muda
// o estado no servidor: um link comum poderia ser seguido por engano (prefetch).
export function BotaoSair({ className = "" }: { className?: string }) {
  return (
    <form action={sair} className={className}>
      <button type="submit" className="cursor-pointer text-small font-bold text-mar hover:underline">
        Sair
      </button>
    </form>
  );
}
