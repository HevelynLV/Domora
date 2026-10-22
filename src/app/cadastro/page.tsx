import type { Metadata } from "next";

import { TelaCadastro } from "./TelaCadastro";

export const metadata: Metadata = { title: "Criar conta" };

// Cadastro do proprietário (RF01).
export default function CadastroProprietario() {
  return <TelaCadastro perfil="proprietario" />;
}
