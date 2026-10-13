import type { Page } from "@playwright/test";
import { test, expect, testLocation } from "./fixtures";
const futureEvent = {
  id: "future-favorite",
  type: "diamond" as const,
  subType: "sunset" as const,
  time: "2099-06-15T08:30:00.000Z",
  locationId: testLocation.id,
  locationName: testLocation.name,
  azimuth: 270,
  elevation: 1.2,
  addedAt: "2024-01-01T00:00:00.000Z",
};
const pastEvent = {
  ...futureEvent,
  id: "past-favorite",
  time: "2000-06-15T08:30:00.000Z",
};
const favoriteLocation = {
  id: testLocation.id,
  name: testLocation.name,
  prefecture: testLocation.prefecture,
  latitude: testLocation.latitude,
  longitude: testLocation.longitude,
  addedAt: "2024-01-01T00:00:00.000Z",
};

async function seedFavorites(page: Page) {
  await page.addInitScript(({ locations, events }) => {
    localStorage.setItem("fuji-calendar-favorites", JSON.stringify({ locations, events }));
  }, { locations: [favoriteLocation], events: [futureEvent, pastEvent] });
}

test("Favorites upcoming, past, and location tabs show their matching records", async ({ page }) => {
  await seedFavorites(page);
  await page.goto("/favorites");

  await expect(page.getByRole("heading", { name: "今後のイベント", level: 2 })).toBeVisible();
  await expect(page.getByText(/2099年6月15日/)).toBeVisible();
  await expect(page.getByText(/2000年6月15日/)).toHaveCount(0);

  await page.getByRole("button", { name: /過去のイベント/ }).click();
  await expect(page.getByRole("heading", { name: "過去のイベント", level: 2 })).toBeVisible();
  await expect(page.getByText(/2000年6月15日/)).toBeVisible();
  await expect(page.getByText(/2099年6月15日/)).toHaveCount(0);

  await page.getByRole("button", { name: /保存地点 \(/ }).click();
  await expect(page.getByRole("heading", { name: "保存地点", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: testLocation.name })).toBeVisible();
});

test("Home → Favorites → Location detail → Home navigation works", async ({ page }) => {
  await seedFavorites(page);
  await page.goto("/");

  await page.getByRole("link", { name: "お気に入り" }).click();
  await expect(page.getByRole("heading", { name: "お気に入り管理" })).toBeVisible();
  await page.getByRole("button", { name: /保存地点 \(/ }).click();
  await page.getByRole("button", { name: "詳細" }).click();

  await expect(page).toHaveURL(/\/location\/101$/);
  await expect(page.getByRole("heading", { name: testLocation.name })).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "ホーム", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "富士山カレンダー" })).toBeVisible();
});

test("adding and removing a location favorite works and survives reload", async ({ page }) => {
  await page.goto("/location/101");
  await expect(page.getByRole("heading", { name: testLocation.name })).toBeVisible();

  await page.getByRole("button", { name: "お気に入り追加" }).click();
  await expect(page.getByRole("button", { name: "お気に入り済み" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "お気に入り済み" })).toBeVisible();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "お気に入り", exact: true })
    .click();
  await page.getByRole("button", { name: /保存地点 \(/ }).click();
  await expect(page.getByRole("heading", { name: testLocation.name })).toBeVisible();
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByText("お気に入り地点はありません")).toBeVisible();
});
