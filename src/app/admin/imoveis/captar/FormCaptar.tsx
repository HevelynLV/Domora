"use client";

import { startTransition, useActionState, useState, useTransition } from "react";

import { CamposDoImovel } from "@/components/imovel/CamposDoImovel";
import { Botao } from "@/components/ui/Botao";

import { buscarDonos, captarImovel, type DonoEncontrado, type EstadoCaptacao } from "./acoes";

type Opcao = { valor: string; rotulo: string };

// AdmCaptar e SiteAdmCaptar, sem o "Criar conta" (decisão de 27/10/2026: o dono
// cria a própria conta pelo app). O admin procura o dono, escolhe e preenche o
// imóvel; as fotos vêm na tela seguinte.
export function FormCaptar({ tipos, bairros }: { tipos: Opcao[]; bairros: Opcao[] }) {
  const [estado, enviar, enviando] = useActionState(captarImovel, { erros: {}, valores: {} } satisfies EstadoCaptacao);
  const [busca, setBusca] = useState("");
  const [donos, setDonos] = useState<DonoEncontrado[]>();
  const [erroBusca, setErroBusca] = useState<string>();
  const [escolhido, setEscolhido] = useState<DonoEncontrado>();
  const [buscando, iniciarBusca] = useTransition();

  function procurar() {
    iniciarBusca(async () => {
      const resultado = await buscarDonos(busca);
      setDonos(resultado.donos);
      setErroBusca(resultado.erro ?? (resultado.donos?.length === 0 ? "Nenhum proprietário encontrado. O dono precisa se cadastrar no app antes." : undefined));
    });
  }

  return (
    <form
      action={enviar}
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        startTransition(() => enviar(dados));
      }}
      noValidate
      className="flex flex-1 flex-col gap-[18px] md:flex-none md:gap-6"
    >
      <input type="hidden" name="dono" value={escolhido?.id ?? ""} />

      <section className="mx-5 flex flex-col gap-3 rounded-cartao border border-line bg-card p-4 md:mx-0 md:p-6" aria-labelledby="dono-titulo">
        <h2 id="dono-titulo" className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">
          Dono do imóvel
        </h2>
        {escolhido ? (
          <div className="flex items-center gap-3 rounded-[14px] border-2 border-mar p-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <b className="text-small">{escolhido.nome}</b>
              <span className="truncate text-tiny text-ink2">
                {escolhido.telefone} · {escolhido.email}
              </span>
            </div>
            <Botao variante="secundario" tamanho="pequeno" onClick={() => setEscolhido(undefined)}>
              Trocar
            </Botao>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="busca-dono" className="text-small font-bold">
                Buscar proprietário
              </label>
              <div className="flex gap-2">
                <input
                  id="busca-dono"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  onKeyDown={(evento) => {
                    // Enter procura, em vez de enviar o formulário inteiro.
                    if (evento.key === "Enter") {
                      evento.preventDefault();
                      procurar();
                    }
                  }}
                  placeholder="Nome, e-mail ou telefone"
                  aria-describedby="busca-dono-dica"
                  className="min-h-12 w-full min-w-0 rounded-botao border border-line bg-card px-3.5 text-ink focus:outline-2 focus:outline-offset-1 focus:outline-mar"
                />
                <Botao variante="secundario" onClick={procurar} disabled={buscando}>
                  {buscando ? "Buscando…" : "Buscar"}
                </Botao>
              </div>
              <span id="busca-dono-dica" className="text-tiny text-ink2">
                O dono precisa ter conta de proprietário no PAUTA, criada por ele pelo app.
              </span>
            </div>
            {erroBusca && <p className="text-small text-erro">{erroBusca}</p>}
            {donos && donos.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Proprietários encontrados">
                {donos.map((dono) => (
                  <li key={dono.id}>
                    <button
                      type="button"
                      onClick={() => setEscolhido(dono)}
                      className="flex w-full cursor-pointer flex-col rounded-[14px] border border-line bg-card p-3 text-left hover:border-mar"
                    >
                      <b className="text-small">{dono.nome}</b>
                      <span className="text-tiny text-ink2">
                        {dono.telefone} · {dono.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {estado.erros.dono && <p className="text-tiny font-semibold text-erro">{estado.erros.dono}</p>}
      </section>

      <section className="flex flex-col gap-3.5 px-5 md:rounded-cartao md:border md:border-line md:bg-card md:p-6" aria-labelledby="imovel-titulo">
        <h2 id="imovel-titulo" className="text-tiny font-bold uppercase tracking-[0.08em] text-ink2">
          Imóvel
        </h2>
        <CamposDoImovel tipos={tipos} bairros={bairros} valores={estado.valores} erros={estado.erros} />
        <p className="rounded-[14px] bg-mar-soft px-3.5 py-3 text-small text-mar-dark">
          O imóvel fica fora do catálogo até o dono aceitar o termo de exclusividade no app. A exclusividade de 6 meses começa no aceite.
        </p>
        {estado.erroGeral && (
          <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
            {estado.erroGeral}
          </p>
        )}
      </section>

      <div className="sticky bottom-0 mt-auto flex flex-col border-t border-line bg-card px-5 pt-3 pb-[max(22px,env(safe-area-inset-bottom))] md:static md:mt-0 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Continuar para as fotos"}
        </Botao>
      </div>
    </form>
  );
}
