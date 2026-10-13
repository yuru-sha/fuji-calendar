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
