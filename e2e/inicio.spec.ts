import { expect, test } from "@playwright/test";

test("a página inicial abre", async ({ page }) => {
  const resposta = await page.goto("/");
  expect(resposta?.ok()).toBe(true);
  await expect(page).toHaveTitle(/PAUTA/);
});

test("o app conecta ao Supabase", async ({ page }) => {
  await page.goto("/teste-conexao");
  await expect(page.getByText("Conectado ao Supabase")).toBeVisible();
  await expect(page.getByText("A conexão ainda não funciona")).toHaveCount(0);
});
