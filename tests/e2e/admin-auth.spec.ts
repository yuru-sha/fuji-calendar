import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const admin = { id: 1, username: "admin" };

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fuji_calendar_token", "test-access-token");
    localStorage.setItem("fuji_calendar_admin", JSON.stringify({ id: 1, username: "test-admin" }));
  });
}

async function installVerifiedAdminApi(page: Page) {
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({ json: { valid: true, adminId: admin.id, username: admin.username } }),
  );
  await page.route("**/api/admin/queue/stats", (route) =>
    route.fulfill({ json: { waiting: 2, active: 1, completed: 8, failed: 0, enabled: true } }),
  );
  await page.route("**/api/locations", (route) =>
    route.fulfill({ json: { success: true, locations: [] } }),
  );
}

test("visiting /admin without a session redirects to login", async ({ page }) => {
  await page.route("**/api/admin/queue/stats", (route) => route.fulfill({ json: {} }));
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "管理者ログイン" })).toBeVisible();
});

test("successful mocked login opens the authenticated dashboard", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      json: {
        success: true,
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        admin,
      },
    }),
  );
  await installVerifiedAdminApi(page);

  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "ユーザー名" }).fill(admin.username);
  await page.getByLabel("パスワード").fill("correct-password");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(page.getByText("総撮影地点数")).toBeVisible();
});

test("failed token verification redirects an authenticated session to login", async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route("**/api/admin/queue/stats", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({ status: 401, json: { valid: false } }),
  );

  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "管理者ログイン" })).toBeVisible();
});

test("admin logout returns to login and clears the saved token", async ({ page }) => {
  await seedAuthenticatedSession(page);
  await installVerifiedAdminApi(page);
  await page.route("**/api/auth/logout", (route) => route.fulfill({ json: { success: true } }));

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await page.getByRole("button", { name: /スーパー管理者/ }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();

  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("fuji_calendar_token"))).toBeNull();
});
