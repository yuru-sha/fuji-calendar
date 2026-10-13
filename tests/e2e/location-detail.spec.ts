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

test("location detail deduplicates upcoming events and opens its Maps destination", async ({ page }) => {
  await page.route("**/api/calendar/**", async (route) => {
    const url = new URL(route.request().url());
    const [, , , year, month] = url.pathname.split("/");
    const tokyoToday = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const overlappingDate = new Date(
      Date.UTC(tokyoToday.getUTCFullYear(), tokyoToday.getUTCMonth() + 1, 2),
    );
    const date = overlappingDate.toISOString().slice(0, 10);
    const eventMonthIndex =
      overlappingDate.getUTCFullYear() * 12 + overlappingDate.getUTCMonth();
    const requestedMonthIndex = Number(year) * 12 + Number(month) - 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        year: Number(year),
        month: Number(month),
        events:
          requestedMonthIndex === eventMonthIndex - 1 ||
          requestedMonthIndex === eventMonthIndex
            ? [{
          date,
          type: "diamond",
          events: [{
            id: "upcoming-location-event",
            type: "diamond",
            subType: "sunset",
            time: `${date}T12:00:00.000Z`,
            location: {
              id: 101,
              name: "山中湖交流プラザ",
              prefecture: "山梨県",
              latitude: 35.4167,
              longitude: 138.87,
            },
            azimuth: 270,
            elevation: 1.2,
          }],
        }] : [],
      }),
    });
  });
  await page.goto("/location/101");

  await expect(page.getByRole("heading", { name: "今後の撮影チャンス" })).toBeVisible();
  await expect(page.getByText("ダイヤモンド富士 (日の入り)")).toHaveCount(1);
  await page.evaluate(() => {
    window.open = (url) => {
      document.body.dataset.openedMapsUrl = String(url);
      return null;
    };
  });
  await page.getByRole("button", { name: "経路案内" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-maps-url",
    "https://www.google.com/maps/dir/?api=1&destination=35.4167,138.87",
  );
});

test("nonexistent location displays the expected not-found error", async ({ page }) => {
  await page.goto("/location/999");

  await expect(page.getByRole("heading", { name: "エラー" })).toBeVisible();
  await expect(page.getByText("地点が見つかりませんでした")).toBeVisible();
});
