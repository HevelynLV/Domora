import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import type { PerfilCadastro } from "@/lib/validacao";

import { FormCadastro } from "./FormCadastro";

// Moldura do cadastro. No celular segue Cadastro.dc.html e
// CadastroImobiliaria.dc.html; no computador (a partir de 768 px),
// SiteCadastro.dc.html (painel escuro à esquerda e o formulário à direita).
// Não lê a sessão: a página fica pronta de antemão.

const textos = {
  proprietario: {
    titulo: "Seu imóvel, no seu controle",
    subtitulo: "Você confirma as visitas, escolhe as propostas e decide se mostra o seu contato aos corretores.",
    painel: "Seu imóvel, no seu controle.",
    itens: [
      "Exclusividade de 6 meses com o PAUTA",
      "Você confirma visitas e escolhe propostas",
      "Você decide se mostra o seu contato",
    ],
  },
  assinante: {
    titulo: "Acesse o catálogo exclusivo",
    subtitulo: "Mensalidade fixa mais uma % da comissão só quando a venda fecha.",
    painel: "Estoque exclusivo, sem precisar captar.",
    itens: [
      "Imóveis conferidos pela equipe PAUTA",
      "Mensalidade fixa e % da comissão só na venda",
      "Convide os corretores da sua equipe",
    ],
  },
};

const perfis: { perfil: PerfilCadastro; href: string; rotulo: string }[] = [
  { perfil: "proprietario", href: "/cadastro", rotulo: "Proprietário" },
  { perfil: "imobiliaria", href: "/cadastro/imobiliaria", rotulo: "Imobiliária" },
  { perfil: "autonomo", href: "/cadastro/autonomo", rotulo: "Corretor autônomo" },
];

export function TelaCadastro({ perfil }: { perfil: PerfilCadastro }) {
  const assinante = perfil !== "proprietario";
  const t = assinante ? textos.assinante : textos.proprietario;

  return (
    <div className="flex flex-1 flex-col bg-bg md:flex-row">
      {/* Painel escuro, só no computador (.split > .art do site.css) */}
      <aside className="hidden flex-1 flex-col justify-between gap-8 bg-ink p-12 text-white md:flex">
        <Logo claro />
        <div className="flex max-w-[460px] flex-col gap-[18px]">
          <p className="font-display text-[34px] font-bold leading-[1.1]">{t.painel}</p>
          {t.itens.map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-[3px] size-[18px] shrink-0 fill-none stroke-[#8FD3C9] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
                <path d="m5 12 5 5L20 7" />
              </svg>
              <span className="text-[#D7E0DE]">{item}</span>
            </div>
          ))}
        </div>
        <span className="text-tiny text-[#9FB0AC]">Florianópolis · SC</span>
      </aside>

      <div className="flex flex-1 flex-col md:items-center md:justify-center md:px-6 md:py-12">
        <div className="flex w-full flex-1 flex-col gap-[18px] md:max-w-[440px] md:flex-none">
          {/* Topo do celular (.top): voltar e título */}
          <div className="flex items-center gap-2.5 px-5 pt-[18px] md:hidden">
            <Link
              href="/"
              aria-label="Voltar"
              className="flex size-11 shrink-0 items-center justify-center rounded-botao border border-line bg-card text-ink"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <span className="text-corpo font-bold">Criar conta</span>
          </div>

          {/* Título do computador */}
          <div className="hidden flex-col gap-1.5 md:flex">
            <h1 className="font-display text-[36px] font-bold leading-[1.1] tracking-[-0.02em]">Criar conta</h1>
            <p className="text-ink2">
              Já tem conta?{" "}
              <Link href="/entrar" className="font-bold text-mar no-underline hover:underline">
                Entrar
              </Link>
            </p>
          </div>

          {/* Celular: Proprietário | Imobiliária ou corretor (.seg) */}
          <nav aria-label="Tipo de conta" className="mx-5 grid grid-cols-2 gap-1 rounded-botao bg-cinza-soft p-1 md:hidden">
            {[
              { href: "/cadastro", rotulo: "Proprietário", ativo: !assinante },
              { href: "/cadastro/imobiliaria", rotulo: "Imobiliária ou corretor", ativo: assinante },
            ].map((aba) => (
              <Link
                key={aba.href}
                href={aba.href}
                aria-current={aba.ativo ? "page" : undefined}
                className={`flex min-h-10 items-center justify-center rounded-[9px] text-sm font-bold no-underline ${
                  aba.ativo ? "bg-card text-ink shadow-[0_1px_2px_rgba(16,32,30,.12)]" : "text-ink2"
                }`}
              >
                {aba.rotulo}
              </Link>
            ))}
          </nav>

          {/* Computador: os três perfis (.perfil do SiteCadastro) */}
          <nav aria-label="Tipo de conta" className="hidden grid-cols-3 gap-2 md:grid">
            {perfis.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={p.perfil === perfil ? "page" : undefined}
                className={`flex min-h-[72px] items-center justify-center rounded-[14px] p-2 text-center text-small font-bold no-underline ${
                  p.perfil === perfil
                    ? "border-2 border-mar bg-mar-soft text-mar-dark"
                    : "border border-line bg-card text-ink"
                }`}
              >
                {p.rotulo}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-1.5 px-5 md:hidden">
            <h1 className="font-display text-t1 font-bold leading-[1.1] tracking-[-0.02em]">{t.titulo}</h1>
            <p className="text-small text-ink2">{t.subtitulo}</p>
          </div>

          {/* Celular: Imobiliária ou Corretor autônomo (.chip) */}
          {assinante && (
            <div className="flex flex-col gap-2 px-5 md:hidden">
              <span className="text-small font-bold">Como você trabalha?</span>
              <div className="flex gap-2.5">
                {perfis.slice(1).map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    aria-current={p.perfil === perfil ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-small font-semibold no-underline ${
                      p.perfil === perfil ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"
                    }`}
                  >
                    {p.rotulo}
                  </Link>
                ))}
              </div>
              <span className="text-tiny text-ink2">
                Corretor de imobiliária não se cadastra aqui: ele entra pelo convite da imobiliária.
              </span>
            </div>
          )}

          <FormCadastro perfil={perfil} />
        </div>
      </div>
    </div>
  );
}
