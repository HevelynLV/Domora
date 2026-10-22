import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Cartao } from "@/components/ui/Cartao";
import { Logo } from "@/components/ui/Logo";
import { assinaturaAtual, exigirTipo, TIPOS_ASSINANTE } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aguardando ativação" };

// "Cadastro recebido" (docs/prototipo/AguardandoAtivacao.dc.html): imobiliária ou
// autônomo com a assinatura pendente, até o admin conferir o CRECI e ativar.
export default function AguardandoAtivacao() {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between px-5 pt-[22px] md:pt-12">
        <Logo />
        {/* "Sair" entra no passo 3.4, junto com o login. */}
      </div>
      <Suspense fallback={<p className="mx-auto w-full max-w-[440px] px-5 pt-8 text-ink2">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  // assinaturaAtiva: false, senão o exigirTipo() mandaria de volta para cá.
  const usuario = await exigirTipo(TIPOS_ASSINANTE, { assinaturaAtiva: false });
  const assinatura = await assinaturaAtual();
  if (assinatura?.temAcesso) redirect("/assinante");
  if (assinatura?.status !== "pendente") redirect("/acesso-suspenso");

  const supabase = await criarClienteServidor();
  const { data: assinante } = await supabase
    .from("assinantes")
    .select("tipo, nome, creci, criado_em")
    .eq("id", usuario.assinanteId!)
    .maybeSingle();

  const imobiliaria = assinante?.tipo === "imobiliaria";
  const primeiroNome = usuario.nome.split(/\s+/)[0];
  const criadoEm = assinante
    ? new Date(assinante.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "";

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[22px] px-5 pb-7 pt-5">
      <div className="flex flex-col gap-3">
        <span className="flex size-14 items-center justify-center rounded-cartao bg-areia-soft text-areia">
          <Icone>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Icone>
        </span>
        <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">
          Cadastro recebido, {primeiroNome}
        </h1>
        <p className="text-ink2">
          {imobiliaria ? `A ${assinante?.nome} está` : "Sua conta está"} com a assinatura{" "}
          <b className="text-ink">pendente</b>. Avisamos no seu WhatsApp assim que liberarmos o catálogo.
        </p>
      </div>

      <Cartao className="gap-4">
        <Passo cor="feito" titulo="Conta criada" detalhe={criadoEm}>
          <path d="m5 12 5 5L20 7" />
        </Passo>
        <Passo cor="agora" titulo={`Conferência do CRECI ${assinante?.creci ?? ""} SC`} detalhe="Feita à mão pela equipe PAUTA">
          <circle cx="12" cy="12" r="3" />
        </Passo>
        <Passo cor="depois" titulo="Pagamento da mensalidade" detalhe="Boleto, Pix ou cartão">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
        </Passo>
        <Passo
          cor="depois"
          titulo="Acesso ao catálogo"
          detalhe={imobiliaria ? "E você já pode convidar seus corretores" : "Imóveis exclusivos de Florianópolis"}
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </Passo>
      </Cartao>
    </div>
  );
}

const coresPasso = {
  feito: "bg-mar-soft text-mar",
  agora: "bg-areia-soft text-areia",
  depois: "bg-cinza-soft text-ink2",
};

function Passo({ cor, titulo, detalhe, children }: { cor: keyof typeof coresPasso; titulo: string; detalhe: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${coresPasso[cor]}`}>
        <Icone pequeno>{children}</Icone>
      </span>
      <div className="flex flex-col">
        <b>{titulo}</b>
        <span className="text-small text-ink2">{detalhe}</span>
      </div>
    </div>
  );
}

function Icone({ pequeno = false, children }: { pequeno?: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${pequeno ? "size-4" : "size-[22px]"} fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]`}
    >
      {children}
    </svg>
  );
}
