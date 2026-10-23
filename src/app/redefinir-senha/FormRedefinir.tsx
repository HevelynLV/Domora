"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Botao, classesBotao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";

import { redefinirSenha, type EstadoRedefinir } from "./acoes";

// RecuperarSenha.dc.html: fases "nova" e "feito", mais "link vencido".
// linkValido vem do servidor; a action confere de novo.
export function FormRedefinir({ linkValido }: { linkValido: boolean }) {
  const [estado, enviar, enviando] = useActionState(redefinirSenha, {} as EstadoRedefinir);

  if (!estado.feito && !linkValido) {
    return (
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Link vencido</h1>
          <p className="text-ink2">
            O link para criar a senha nova vale por tempo limitado e só uma vez. Peça um link novo.
          </p>
        </div>
        <Link href="/recuperar-senha" className={classesBotao()}>
          Pedir um link novo
        </Link>
      </div>
    );
  }

  if (estado.feito) {
    return (
      <div className="flex flex-col gap-[18px]">
        <span className="flex size-14 items-center justify-center rounded-cartao bg-mar-soft text-mar">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Senha alterada</h1>
          <p className="text-ink2">Pronto. Use a senha nova para entrar.</p>
        </div>
        <Link href="/entrar" className={classesBotao()}>
          Entrar
        </Link>
      </div>
    );
  }

  // Aqui os campos podem ser limpos depois de enviar: são só as senhas.
  return (
    <form action={enviar} noValidate className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">Criar senha nova</h1>
        <p className="text-ink2">Escolha uma senha que você não usa em outros sites.</p>
      </div>
      <Campo
        name="senha"
        type="password"
        rotulo="Senha nova"
        dica="Mínimo de 8 caracteres."
        autoComplete="new-password"
        erro={estado.erros?.senha}
      />
      <Campo
        name="confirmacao"
        type="password"
        rotulo="Repita a senha nova"
        autoComplete="new-password"
        erro={estado.erros?.confirmacao}
      />
      {estado.erro && (
        <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
          {estado.erro}{" "}
          <Link href="/recuperar-senha" className="font-bold text-erro-texto underline">
            Pedir um link novo
          </Link>
        </p>
      )}
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar senha nova"}
      </Botao>
    </form>
  );
}
