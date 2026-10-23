import type { Metadata } from "next";

import { TelaPublica } from "@/components/TelaPublica";

import { FormRecuperar } from "./FormRecuperar";

export const metadata: Metadata = { title: "Esqueci minha senha" };

// RecuperarSenha.dc.html e SiteRecuperarSenha.dc.html (RF03).
export default function RecuperarSenha() {
  return (
    <TelaPublica voltarPara="/entrar">
      <FormRecuperar />
    </TelaPublica>
  );
}
