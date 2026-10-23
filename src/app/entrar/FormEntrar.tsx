"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";

import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

import { entrar, type EstadoEntrar } from "./acoes";

export function FormEntrar() {
  const [estado, enviar, enviando] = useActionState(entrar, {} as EstadoEntrar);

  return (
    <form
      action={enviar}
      // Não limpa o e-mail quando a senha está errada (ver FormCadastro).
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        startTransition(() => enviar(dados));
      }}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        name="email"
        type="email"
        rotulo="E-mail"
        placeholder="voce@email.com"
        autoComplete="email"
        defaultValue={estado.email}
      />
      <Campo name="senha" type="password" rotulo="Senha" placeholder="Sua senha" autoComplete="current-password" />
      <Link href="/recuperar-senha" className="self-end text-small font-bold text-mar no-underline hover:underline">
        Esqueci minha senha
      </Link>

      {estado.erro && (
        <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
          {estado.erro}
        </p>
      )}

      <Botao type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
