import { createClient } from "@supabase/supabase-js";

// Apoio dos testes: cria, confere e apaga contas de teste com a chave secreta
// (SUPABASE_SECRET_KEY do .env.local, carregada pelo playwright.config.ts).
// Roda só no processo dos testes, nunca no navegador nem no app.
//
// ATENÇÃO: a chave secreta passa por cima do RLS e das regras dos gatilhos.
// Aqui ela só prepara e limpa dados de teste (e-mails @exemplo.com).

export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.local");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const SENHA_TESTE = "senha-de-teste-123";

// Cria uma conta já confirmada, como o cadastro do app faria (o gatilho do banco
// cria o perfil e o assinante a partir de dados).
export async function criarConta(email: string, dados: Record<string, string>) {
  const { data, error } = await clienteAdmin().auth.admin.createUser({
    email,
    password: SENHA_TESTE,
    email_confirm: true,
    user_metadata: dados,
  });
  if (error) throw new Error(`criarConta(${email}): ${error.message}`);
  return data.user.id;
}

export async function contaPorEmail(email: string) {
  const { data, error } = await clienteAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

export async function perfilPorEmail(email: string) {
  const conta = await contaPorEmail(email);
  if (!conta) return null;
  const { data } = await clienteAdmin()
    .from("perfis")
    .select("tipo, nome, telefone, assinantes!perfis_assinante_id_fkey(tipo, nome, creci, status)")
    .eq("id", conta.id)
    .maybeSingle();
  return data;
}

// Apaga as contas de teste cujo e-mail começa com o prefixo. Assinante só pode
// ser excluído pendente (RF16): antes, volta o status para pendente.
export async function apagarContas(prefixo: string) {
  const admin = clienteAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const conta of data.users.filter((u) => u.email?.startsWith(prefixo))) {
    await admin
      .from("assinantes")
      .update({ status: "pendente", bloqueado_pelo_admin: false })
      .eq("responsavel_id", conta.id);
    const { error: erro } = await admin.auth.admin.deleteUser(conta.id);
    if (erro) throw new Error(`apagarContas(${conta.email}): ${erro.message}`);
  }
}
