import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/Gigahack/);
    await expect(page.getByText("Gigahack")).toBeVisible();
    await expect(page.getByText("Continuă cu Google")).toBeVisible();
    await expect(page.getByLabel("Adresă de email")).toBeVisible();
    await expect(page.getByRole("button", { name: /Trimite link/i })).toBeVisible();
  });

  test("landing page has sign-in CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Deeptech Gigahack")).toBeVisible();
    await expect(page.getByRole("link", { name: /Înregistrează-te/i })).toBeVisible();
  });

  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
  });

  test("magic link form shows error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Adresă de email").fill("not-an-email");
    await page.getByRole("button", { name: /Trimite link/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });
});
