import type { Metadata } from "next";
import Link from "next/link";

import { TelaPublica } from "@/components/TelaPublica";

import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };

// Entrar (docs/prototipo/Entrar.dc.html e SiteEntrar.dc.html). Sem "manter
// conectado": o login fica sempre conectado até a pessoa sair (decisão do 3.1).
export default function Entrar() {
  return (
    <TelaPublica voltarPara="/">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em] md:text-[36px]">Entrar</h1>
        <p className="text-ink2">Use o e-mail e a senha do seu cadastro.</p>
      </div>
      <FormEntrar />
      <p className="text-center text-small text-ink2">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-bold text-mar no-underline hover:underline">
          Cadastre-se
        </Link>
      </p>
    </TelaPublica>
  );
}
