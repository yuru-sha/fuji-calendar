import { expect, test } from "./fixtures";


test("public navigation reaches home and favorites", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "富士山カレンダー" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "お気に入り" }).click();

  await expect(page).toHaveURL(/\/favorites$/);
  await expect(
    page.getByRole("heading", { name: "お気に入り管理" }),
  ).toBeVisible();
});

test("login page renders an accessible form", async ({ page }) => {
  await page.goto("/admin/login");

  await expect(
    page.getByRole("heading", { name: "管理者ログイン" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "ユーザー名" })).toBeVisible();
  await expect(page.getByLabel("パスワード")).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
});

test("failed login stays on the login page", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { success: false, message: "認証に失敗しました" },
    }),
  );

  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "ユーザー名" }).fill("invalid-user");
  await page.getByLabel("パスワード").fill("invalid-password");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page.getByText("認証に失敗しました")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin routes redirect unauthenticated and rejected tokens to login", async ({ page }) => {
  await page.route("**/api/admin/queue/stats", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.addInitScript(() => {
    localStorage.setItem("fuji_calendar_token", "expired-token");
    localStorage.setItem("fuji_calendar_admin", JSON.stringify({ id: 1, username: "admin" }));
  });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("successful admin login renders dashboard and logout clears the session", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/login" && route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          accessToken: "e2e-access-token",
          refreshToken: "e2e-refresh-token",
          admin: { id: 1, username: "admin" },
          message: "ログインしました",
        },
      });
      return;
    }
    if (url.pathname === "/api/auth/verify" && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        json: { valid: true, adminId: 1, username: "admin" },
      });
      return;
    }
    if (url.pathname === "/api/admin/queue/stats") {
      await route.fulfill({ status: 200, json: {} });
      return;
    }
    if (url.pathname === "/api/auth/logout") {
      await route.fulfill({ status: 200, json: { success: true } });
      return;
    }
    await route.fallback();
  });

  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "ユーザー名" }).fill("admin");
  await page.getByLabel("パスワード").fill("valid-password");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /ダッシュボード/ })).toBeVisible();

  await page.getByRole("button", { name: /admin/ }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "管理者ログイン" })).toBeVisible();
});
