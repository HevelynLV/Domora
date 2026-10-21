import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Carrega o .env.local do mesmo jeito que o Next.js. Os testes das próximas
// etapas usam a SUPABASE_SECRET_KEY para criar e apagar usuários de teste;
// ela fica só aqui, no processo dos testes, e nunca vai para o navegador.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  // Um teste por vez: todos usam o mesmo banco compartilhado do Supabase.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    // O PAUTA é pensado primeiro para o celular (RNF09).
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Reaproveita o npm run dev que já estiver aberto.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
