import Link from "next/link";

import { classesBotao } from "@/components/ui/Botao";

// Página "não encontrada" do app, em português (RNF10). Aparece quando uma página
// chama notFound(), ex.: o imóvel de outra pessoa. Dentro de uma área logada, fica
// dentro do menu da área. Com a página já em streaming, o status continua 200;
// o que importa é que nada do imóvel aparece.
export default function NaoEncontrada() {
  return (
    <div className="flex flex-col gap-4 px-5 pb-7 pt-[46px] md:px-10 md:pt-8">
      <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Página não encontrada</h1>
      <p className="text-ink2">O endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/" className={`${classesBotao({ variante: "secundario" })} self-start`}>
        Voltar para o início
      </Link>
    </div>
  );
}
