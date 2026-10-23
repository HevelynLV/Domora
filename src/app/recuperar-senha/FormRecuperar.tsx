"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

import { pedirLinkDeSenha, type EstadoRecuperar } from "./acoes";

// RecuperarSenha.dc.html: fases "pedir" e "enviado".
export function FormRecuperar() {
  const [estado, enviar, enviando] = useActionState(pedirLinkDeSenha, {} as EstadoRecuperar);
  const [pedirDeNovo, setPedirDeNovo] = useState(false);

  if (estado.enviadoPara && !pedirDeNovo) {
    return (
      <div className="flex flex-col gap-[18px]">
        <span className="flex size-14 items-center justify-center rounded-cartao bg-mar-soft text-mar">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Confira seu e-mail</h1>
          <p className="text-ink2">
            Se houver uma conta com {estado.enviadoPara}, você recebe um link para criar uma senha nova. O link vale
            por tempo limitado.
          </p>
        </div>
        <span className="text-tiny text-ink2">Não chegou? Veja a caixa de spam ou peça o link de novo.</span>
        <Botao variante="secundario" onClick={() => setPedirDeNovo(true)}>
          Pedir o link de novo
        </Botao>
      </div>
    );
  }

  return (
    <form
      action={enviar}
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        setPedirDeNovo(false);
        startTransition(() => enviar(dados));
      }}
      noValidate
      className="flex flex-col gap-[18px]"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Esqueci minha senha</h1>
        <p className="text-ink2">Digite o e-mail do seu cadastro. Enviamos um link para você criar uma senha nova.</p>
      </div>
      <Campo
        name="email"
        type="email"
        rotulo="E-mail"
        autoComplete="email"
        defaultValue={estado.enviadoPara}
        erro={estado.erro}
      />
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar link"}
      </Botao>
      <p className="text-center text-small text-ink2">
        Lembrou a senha?{" "}
        <Link href="/entrar" className="font-bold text-mar no-underline hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
