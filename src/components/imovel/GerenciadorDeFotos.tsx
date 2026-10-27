"use client";

import { useRef, useState, useSyncExternalStore, useTransition, type DragEvent } from "react";

import {
  pedirEnvioDeFotos,
  registrarFotos,
  removerFoto,
  reordenarFotos,
  type ResultadoFotos,
} from "@/app/proprietario/imoveis/acoesFotos";
import type { FotoDoImovel } from "@/lib/imoveis";
import { BUCKET_FOTOS, LIMITE_DE_FOTOS, TAMANHO_MAXIMO_DA_FOTO, TIPOS_DE_FOTO } from "@/lib/imovel";
import { criarClienteNavegador } from "@/lib/supabase/client";

// Fotos do imóvel (ProFotos e o passo 2 do SiteProNovo): adicionar, mudar a ordem
// com as setas (a primeira é a capa) e tirar.
//
// Pensado para o celular: antes de enviar, o navegador reduz cada foto (a do
// celular costuma ter de 3 a 8 MB) para duas versões em JPEG, a grande (lado maior
// de 2.000 px) e a miniatura (640 px), e manda uma de cada vez direto para o
// Storage, com os links de envio que o servidor deu.

const LADO_GRANDE = 2000;
const LADO_MINI = 640;

// Uma versão menor da foto, em JPEG. O fundo branco evita que um PNG transparente
// vire preto. imageOrientation: a foto deitada do celular fica em pé.
async function reduzir(imagem: ImageBitmap, ladoMaior: number, qualidade: number) {
  const escala = Math.min(1, ladoMaior / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagem.width * escala));
  canvas.height = Math.max(1, Math.round(imagem.height * escala));
  const contexto = canvas.getContext("2d")!;
  contexto.fillStyle = "#fff";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((pronto, falhou) =>
    canvas.toBlob((blob) => (blob ? pronto(blob) : falhou(new Error("toBlob"))), "image/jpeg", qualidade),
  );
}

const nadaParaOuvir = () => () => {};

async function prepararFoto(arquivo: File) {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  try {
    return { grande: await reduzir(imagem, LADO_GRANDE, 0.85), mini: await reduzir(imagem, LADO_MINI, 0.8) };
  } finally {
    imagem.close();
  }
}

export function GerenciadorDeFotos({
  imovelId,
  fotosIniciais,
  aoMudar,
}: {
  imovelId: string;
  fotosIniciais: FotoDoImovel[];
  // Avisa quantas fotos o imóvel tem agora (ex.: para liberar o "Continuar").
  aoMudar?: (quantidade: number) => void;
}) {
  const [fotos, setFotosNaTela] = useState(fotosIniciais);
  const setFotos = (lista: FotoDoImovel[]) => {
    setFotosNaTela(lista);
    aoMudar?.(lista.length);
  };
  const [erro, setErro] = useState<string>();
  const [progresso, setProgresso] = useState<string>();
  const [ocupado, iniciar] = useTransition();
  const [arrastando, setArrastando] = useState(false);
  // Até o JavaScript da página carregar, a escolha de fotos ficaria sem resposta
  // (no celular com internet lenta, a pessoa toca antes): o botão só liga depois.
  // false no HTML que vem do servidor, true depois que o React assume a página.
  const pronto = useSyncExternalStore(
    nadaParaOuvir,
    () => true,
    () => false,
  );
  const entrada = useRef<HTMLInputElement>(null);
  const cabem = LIMITE_DE_FOTOS - fotos.length;

  function aplicar(resultado: ResultadoFotos) {
    if (resultado.fotos) setFotos(resultado.fotos);
    setErro(resultado.erro);
  }

  function enviar(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const arquivos = [...lista];
    if (entrada.current) entrada.current.value = "";

    // Confere no navegador antes de gastar a internet do celular (o bucket confere de novo).
    if (arquivos.some((a) => !TIPOS_DE_FOTO.includes(a.type))) {
      setErro("Escolha fotos JPG, PNG ou WebP.");
      return;
    }
    if (arquivos.some((a) => a.size > TAMANHO_MAXIMO_DA_FOTO)) {
      setErro("Cada foto pode ter até 10 MB.");
      return;
    }
    if (arquivos.length > cabem) {
      setErro(`Cada imóvel tem no máximo ${LIMITE_DE_FOTOS} fotos. Dá para enviar mais ${cabem}.`);
      return;
    }

    setErro(undefined);
    iniciar(async () => {
      const links = await pedirEnvioDeFotos(imovelId, arquivos.length);
      if (!links.envios) {
        setErro(links.erro);
        return;
      }

      const balde = criarClienteNavegador().storage.from(BUCKET_FOTOS);
      const enviados: string[] = [];
      for (const [i, arquivo] of arquivos.entries()) {
        setProgresso(`Enviando foto ${i + 1} de ${arquivos.length}…`);
        const envio = links.envios[i];
        try {
          const { grande, mini } = await prepararFoto(arquivo);
          const opcoes = { contentType: "image/jpeg" };
          const [a, b] = await Promise.all([
            balde.uploadToSignedUrl(envio.grande.caminho, envio.grande.token, grande, opcoes),
            balde.uploadToSignedUrl(envio.mini.caminho, envio.mini.token, mini, opcoes),
          ]);
          if (!a.error && !b.error) enviados.push(envio.nome);
        } catch {
          // Foto que o navegador não consegue abrir (ex.: HEIC fora do iPhone): segue
          // com as outras e avisa no fim.
        }
      }

      setProgresso("Salvando…");
      const resultado = await registrarFotos(imovelId, enviados);
      setProgresso(undefined);
      aplicar(
        enviados.length < arquivos.length && !resultado.erro
          ? { ...resultado, erro: "Algumas fotos não foram enviadas. Confira a internet e o formato e envie de novo." }
          : resultado,
      );
    });
  }

  function mover(posicao: number, direcao: -1 | 1) {
    const ids = fotos.map((foto) => foto.id);
    [ids[posicao], ids[posicao + direcao]] = [ids[posicao + direcao], ids[posicao]];
    iniciar(async () => aplicar(await reordenarFotos(imovelId, ids)));
  }

  function tirar(fotoId: string) {
    iniciar(async () => aplicar(await removerFoto(imovelId, fotoId)));
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastando(false);
    if (!ocupado) enviar(evento.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-small text-ink2">A primeira foto é a capa no catálogo. Use as setas para mudar a ordem.</p>

      <input
        ref={entrada}
        type="file"
        multiple
        // Com os tipos listados, o iPhone converte a foto HEIC para JPEG ao escolher.
        accept={TIPOS_DE_FOTO.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={!pronto}
        onChange={(evento) => enviar(evento.target.files)}
        data-testid="entrada-de-fotos"
      />
      <button
        type="button"
        disabled={!pronto || ocupado || cabem === 0}
        onClick={() => entrada.current?.click()}
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-cartao border-[1.5px] border-dashed p-4 text-mar disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[110px] ${
          arrastando ? "border-mar bg-mar-soft" : "border-line bg-card"
        }`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
          <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
        </svg>
        <b>
          {cabem === 0 ? "Limite de fotos atingido" : (
            <>
              <span className="md:hidden">Adicionar fotos</span>
              <span className="hidden md:inline">Arraste as fotos aqui ou clique para escolher</span>
            </>
          )}
        </b>
        <span className="text-tiny text-ink2">
          JPG, PNG ou WebP, até 10 MB cada · {fotos.length} de {LIMITE_DE_FOTOS}
        </span>
      </button>

      <p aria-live="polite" className="text-small font-semibold text-mar empty:hidden">
        {progresso}
      </p>
      {erro && (
        <p role="alert" className="rounded-[14px] bg-erro-soft px-3.5 py-3 text-small text-erro-texto">
          {erro}
        </p>
      )}

      <ol className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] md:gap-3.5">
        {fotos.map((foto, i) => {
          const rotulo = i === 0 ? "Capa" : `Foto ${i + 1}`;
          return (
            <li
              key={foto.id}
              className="flex items-center gap-3 rounded-cartao border border-line bg-card p-2.5 md:flex-col md:items-stretch md:gap-2"
            >
              {foto.miniatura ? (
                // A miniatura já vem do tamanho certo (640 px), com link temporário do
                // bucket privado: o otimizador do Next não ajuda aqui.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto.miniatura}
                  alt={rotulo}
                  className="h-14 w-[72px] shrink-0 rounded-foto object-cover md:h-[130px] md:w-full"
                />
              ) : (
                <div aria-hidden="true" className="h-14 w-[72px] shrink-0 rounded-foto bg-[#BFD3CD] md:h-[130px] md:w-full" />
              )}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
                <b className={`text-small ${i === 0 ? "text-mar" : ""}`}>{rotulo}</b>
                <div className="flex gap-1">
                  <BotaoDaFoto rotulo={`Subir ${rotulo.toLowerCase()}`} desabilitado={ocupado || i === 0} onClick={() => mover(i, -1)}>
                    <path d="m6 15 6-6 6 6" />
                  </BotaoDaFoto>
                  <BotaoDaFoto
                    rotulo={`Descer ${rotulo.toLowerCase()}`}
                    desabilitado={ocupado || i === fotos.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </BotaoDaFoto>
                  <BotaoDaFoto rotulo={`Tirar ${rotulo.toLowerCase()}`} desabilitado={ocupado} onClick={() => tirar(foto.id)} perigo>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </BotaoDaFoto>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Botão quadrado de 44 px das setas (.ord do protótipo).
function BotaoDaFoto({
  rotulo,
  desabilitado,
  onClick,
  perigo = false,
  children,
}: {
  rotulo: string;
  desabilitado: boolean;
  onClick: () => void;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onClick}
      className={`flex size-11 cursor-pointer items-center justify-center rounded-botao-sm border border-line bg-card disabled:cursor-default disabled:opacity-35 ${
        perigo ? "text-erro" : "text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
        {children}
      </svg>
    </button>
  );
}
