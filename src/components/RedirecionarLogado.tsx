import { redirect } from "next/navigation";
import { Suspense } from "react";

import { areaDoTipo, usuarioAtual } from "@/lib/auth";

// Para as telas de entrar e de cadastro: quem já está logado vai para a própria
// área. Sem isso, um cadastro novo trocaria a sessão de quem já estava logado.
// Fica num <Suspense> para o resto da tela continuar pronto de antemão.
export function RedirecionarLogado() {
  return (
    <Suspense fallback={null}>
      <Redirecionar />
    </Suspense>
  );
}

async function Redirecionar() {
  const usuario = await usuarioAtual();
  if (usuario) redirect(areaDoTipo(usuario.tipo));
  return null;
}
