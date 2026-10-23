import type { Metadata } from "next";

import { TelaCadastro } from "../TelaCadastro";

export const metadata: Metadata = { title: "Criar conta de imobiliária" };

// Cadastro da imobiliária (RF01, RF02): entra com a assinatura pendente.
export default function CadastroImobiliaria() {
  return <TelaCadastro perfil="imobiliaria" />;
}
