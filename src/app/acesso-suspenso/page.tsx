import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BotaoSair } from "@/components/BotaoSair";
import { Cartao } from "@/components/ui/Cartao";
import { Logo } from "@/components/ui/Logo";
import { assinaturaAtual, exigirTipo, TIPOS_ASSINANTE } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acesso suspenso" };

// "Seu acesso está suspenso" (docs/prototipo/AcessoSuspenso.dc.html): assinante
// com o pagamento vencido ou bloqueado pelo admin. O pagamento pelo app (Asaas) e
// o contato da equipe entram na Etapa 11.
export default function AcessoSuspenso() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between px-5 pt-[22px] md:pt-12">
        <Logo />
        <BotaoSair />
      </div>
      <Suspense fallback={<p className="mx-auto w-full max-w-[440px] px-5 pt-8 text-ink2">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const usuario = await exigirTipo(TIPOS_ASSINANTE, { assinaturaAtiva: false });
  const assinatura = await assinaturaAtual();
  if (assinatura?.temAcesso) redirect("/assinante");
  if (assinatura?.status === "pendente") redirect("/aguardando-ativacao");

  // RLS: o corretor convidado lê a assinatura da imobiliária dele.
  const supabase = await criarClienteServidor();
  const { data: assinante } = await supabase
    .from("assinantes")
    .select("tipo, nome, bloqueado_pelo_admin")
    .eq("id", usuario.assinanteId!)
    .maybeSingle();

  const bloqueado = assinante?.bloqueado_pelo_admin === true;
  const deQuem = assinante?.tipo === "imobiliaria" ? `da ${assinante.nome}` : "da sua assinatura";
  const quemPerde =
    assinante?.tipo === "imobiliaria" ? "Você e os corretores da imobiliária não veem" : "Você não vê";

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-5 pb-7 pt-5">
      <div className="flex flex-col gap-3">
        <span className="flex size-14 items-center justify-center rounded-cartao bg-erro-soft text-erro">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">
          Seu acesso ao catálogo está suspenso
        </h1>
        <p className="text-ink2">
          {bloqueado
            ? `A equipe PAUTA bloqueou o acesso ${deQuem}. ${quemPerde} o catálogo até o desbloqueio.`
            : `A mensalidade ${deQuem} venceu. ${quemPerde} o catálogo enquanto ela não for paga.`}
        </p>
      </div>

      <Cartao className="gap-1.5">
        {bloqueado ? (
          <>
            <b>Fale com a equipe PAUTA</b>
            <span className="text-small text-ink2">Para entender o motivo do bloqueio.</span>
          </>
        ) : (
          <>
            <b>Mensalidade vencida</b>
            <span className="text-small text-ink2">O acesso volta sozinho assim que o pagamento for confirmado.</span>
          </>
        )}
      </Cartao>

      {usuario.tipo === "corretor" && (
        <p className="rounded-[14px] bg-areia-soft px-3.5 py-3 text-small text-atencao-texto">
          Corretor convidado? Quem resolve é o responsável pela imobiliária.
        </p>
      )}
    </div>
  );
}
