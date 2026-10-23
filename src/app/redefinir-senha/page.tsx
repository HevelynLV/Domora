import type { Metadata } from "next";
import { Suspense } from "react";

import { TelaPublica } from "@/components/TelaPublica";
import { veioDeLinkDeRecuperacao } from "@/lib/auth";

import { FormRedefinir } from "./FormRedefinir";

export const metadata: Metadata = { title: "Criar senha nova" };

// Destino do link de recuperação (via /auth/confirmar). Só abre o formulário
// para uma sessão aberta pelo link; a action confere de novo.
export default function RedefinirSenha() {
  return (
    <TelaPublica voltarPara="/entrar">
      <Suspense fallback={<p className="text-ink2">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </TelaPublica>
  );
}

// O formulário fica sempre no mesmo lugar e recebe só se o link vale: depois de
// salvar, a sessão do link é encerrada e a página é montada de novo; assim o
// "Senha alterada" continua na tela.
async function Conteudo() {
  return <FormRedefinir linkValido={await veioDeLinkDeRecuperacao()} />;
}
