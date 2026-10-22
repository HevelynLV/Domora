// Limpeza e conferência dos dados de cadastro, com as mesmas regras do banco
// (supabase/migrations). O banco confere de novo: aqui é só para a pessoa ver
// uma mensagem clara no campo certo, em vez do erro genérico do Supabase.

export type PerfilCadastro = "proprietario" | "imobiliaria" | "autonomo";

export const PERFIS_CADASTRO: readonly PerfilCadastro[] = ["proprietario", "imobiliaria", "autonomo"];

// Só números e sem o 0 da frente: "0 (48) 99812-4410" vira "48998124410".
export function limparTelefone(telefone: string) {
  return telefone.replace(/\D/g, "").replace(/^0+/, "");
}

// DDD (dois dígitos de 1 a 9) + número de 8 ou 9 dígitos (perfis_telefone_formato).
export function telefoneValido(telefone: string) {
  return /^[1-9]{2}[0-9]{8,9}$/.test(telefone);
}

// O cadastro pede só o número do CRECI; a UF é sempre SC (decisão de 22/10/2026).
// Tira espaços e pontos, e "CRECI" ou "SC" se a pessoa digitar mesmo assim:
// "creci/sc 12.345-j" vira "12345-J".
export function limparCreci(creci: string) {
  return creci
    .toUpperCase()
    .replace(/[\s.]/g, "")
    .replace(/^CRECI\/?/, "")
    .replace(/^SC[/-]?/, "")
    .replace(/[/-]?SC$/, "");
}

// Número (3 a 7 dígitos) com a letra opcional (J para imobiliária, F para pessoa
// física), ao todo pelo menos 4 caracteres (assinantes_creci_formato).
export function creciValido(creci: string) {
  return /^\d{3,7}(-?[A-Z])?$/.test(creci) && creci.length >= 4;
}

export function emailValido(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// perfis_nome_tamanho e assinantes_nome_tamanho.
export function nomeValido(nome: string) {
  return nome.length >= 2 && nome.length <= 120;
}

// Mínimo do protótipo; o máximo é o limite do Supabase Auth.
export function senhaValida(senha: string) {
  return senha.length >= 8 && senha.length <= 72;
}
