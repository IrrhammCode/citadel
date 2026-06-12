import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Citadel/i);
});

test("preflight API responds", async ({ request }) => {
  const res = await request.get("/api/env/preflight");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty("checks");
});

test("store API returns JSON", async ({ request }) => {
  const res = await request.get("/api/store");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty("permissions");
  expect(body).toHaveProperty("auditLog");
});
