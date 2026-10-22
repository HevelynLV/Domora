import type { Metadata } from "next";

import { TelaCadastro } from "../TelaCadastro";

export const metadata: Metadata = { title: "Criar conta de corretor autônomo" };

// Cadastro do corretor autônomo, com o próprio CRECI (RF01, RF02): entra pendente.
export default function CadastroAutonomo() {
  return <TelaCadastro perfil="autonomo" />;
}
