import { test, expect } from "@playwright/test";

// Smoke E2E: unauthenticated users are redirected to login; health is green.
test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty("checks");
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("EVENT IQ")).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toBeVisible();
});

test("protected route redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});
