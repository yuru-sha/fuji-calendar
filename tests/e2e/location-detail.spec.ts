import { test, expect, testLocation } from "./fixtures";

test("location detail renders its location and supports adding and removing its favorite", async ({ page }) => {
  await page.goto("/location/101");

  await expect(page.getByRole("heading", { name: testLocation.name })).toBeVisible();
  await expect(
    page.getByText(testLocation.prefecture, { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "お気に入り追加" }).click();
  await expect(page.getByRole("button", { name: "お気に入り済み" })).toBeVisible();
  await page.getByRole("button", { name: "お気に入り済み" }).click();
  await expect(page.getByRole("button", { name: "お気に入り追加" })).toBeVisible();
});

test("nonexistent location displays the expected not-found error", async ({ page }) => {
  await page.goto("/location/999");

  await expect(page.getByRole("heading", { name: "エラー" })).toBeVisible();
  await expect(page.getByText("地点が見つかりませんでした")).toBeVisible();
});
