import { crc32, deflateSync } from "node:zlib";

// Fotos de teste geradas na hora (PNG de uma cor só), sem arquivos no repositório.
// O navegador do teste reduz e converte para JPEG, como faria com a foto do celular.

function bloco(tipo: string, dados: Buffer) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const verificacao = Buffer.alloc(4);
  verificacao.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, verificacao]);
}

export function pngDeTeste(largura: number, altura: number, [r, g, b]: [number, number, number]) {
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8; // 8 bits por cor
  cabecalho[9] = 2; // RGB
  // Cada linha: o byte de filtro (0) e os pixels.
  const linha = Buffer.alloc(1 + largura * 3);
  for (let x = 0; x < largura; x++) linha.set([r, g, b], 1 + x * 3);
  const pixels = Buffer.concat(Array.from({ length: altura }, () => linha));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cabecalho),
    bloco("IDAT", deflateSync(pixels)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}
