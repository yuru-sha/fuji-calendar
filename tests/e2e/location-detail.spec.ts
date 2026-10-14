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

test("location detail shows upcoming events and opens its Google Maps route", async ({ page, apiScenario }) => {
  const monthlyEvents = Object.values(apiScenario.calendarEventsByMonth ?? {}).flat();
  const futureDate = "2099-06-15T08:30:00.000Z";
  monthlyEvents[0]!.date = futureDate;
  monthlyEvents[0]!.events[0]!.time = futureDate;
  await page.goto("/location/101");

  await expect(page.getByRole("heading", { name: "今後の撮影チャンス" })).toBeVisible();
  await expect(page.getByText("ダイヤモンド富士").first()).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "経路案内" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(
    "https://www.google.com/maps/dir/?api=1&destination=35.4167,138.87",
  );
});
