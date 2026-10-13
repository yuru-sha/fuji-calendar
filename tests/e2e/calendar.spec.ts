import { test, expect } from "./fixtures";

test(
  "monthly calendar renders event days and selecting a date loads that day's events",
  async ({ page, apiScenario }) => {
    const requestedDay = Object.keys(apiScenario.dayEventsByDate ?? {})[0]!;
    const dayRequest = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === `/api/events/${requestedDay}`,
    );

    await page.goto("/");

    const month = Number(requestedDay.split("-")[1]);
    await expect(
      page.getByRole("heading", { name: new RegExp(`${month}月`) }),
    ).toBeVisible();
    const dateButton = page.getByRole("button", { name: /^15/ });
    await expect(dateButton).toContainText("2件");
    await dateButton.click();
    await dayRequest;

    await expect(page.getByRole("heading", { name: /日の撮影情報/ })).toBeVisible();
    await expect(
      page.getByText("沈むダイヤモンド富士", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("山中湖交流プラザ", { exact: true }).last(),
    ).toBeVisible();
  },
);

test(
  "selecting an event location and favoriting its event updates visible state",
  async ({ page, apiScenario }) => {
    const date = Object.keys(apiScenario.dayEventsByDate ?? {})[0]!;
    const day = Number(date.split("-")[2]);
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(`^${day}`) }).click();

    const firstLocation = page
      .getByText("山中湖交流プラザ", { exact: true })
      .first()
      .locator("..");
    const secondLocation = page
      .getByText("河口湖大石公園", { exact: true })
      .first()
      .locator("..");
    await expect(firstLocation.getByText("地図表示中")).toBeVisible();

    await secondLocation.getByText("河口湖大石公園").click();
    await expect(secondLocation.getByText("地図表示中")).toBeVisible();
    await expect(firstLocation.getByText("地図表示中")).toHaveCount(0);

    await page.getByRole("button", { name: "お気に入り", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "お気に入り済み" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "予定に追加" }).click();
    await expect(page.getByRole("button", { name: "予定済み" })).toBeVisible();
    await page.getByRole("button", { name: "予定済み" }).click();
    await expect(page.getByRole("button", { name: "予定に追加" })).toBeVisible();
  },
);

test("month navigation requests the next calendar month", async ({ page, apiScenario }) => {
  const [year, month] = Object.keys(apiScenario.calendarEventsByMonth ?? {})[0]!
    .split("/")
    .map(Number);
  const nextMonth = new Date(year, month, 1);
  await page.goto("/");

  const monthRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname ===
      `/api/calendar/${nextMonth.getFullYear()}/${nextMonth.getMonth() + 1}`,
  );
  await page.getByRole("button", { name: "次月" }).click();
  await monthRequest;

  await expect(
    page.getByRole("heading", {
      name: `${nextMonth.getFullYear()}年${nextMonth.getMonth() + 1}月`,
    }),
  ).toBeVisible();
});

test("event and distance filters update visible results", async ({ page, apiScenario }) => {
  const date = Object.keys(apiScenario.dayEventsByDate ?? {})[0]!;
  const day = Number(date.split("-")[2]);
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`^${day}`) }).click();
  await expect(page.getByText("2件のイベント")).toBeVisible();

  await page.getByRole("button", { name: "撮影地点フィルター" }).click();
  await page.getByLabel("沈むダイヤモンド富士").check();
  await expect(page.getByText("1件のイベント").last()).toBeVisible();

  await page.getByLabel("沈むダイヤモンド富士").uncheck();
  await page.getByRole("combobox").selectOption("very_near");
  await expect(page.getByText("1件のイベント").last()).toBeVisible();
});

test("camera settings can be opened and changed", async ({ page, apiScenario }) => {
  const date = Object.keys(apiScenario.dayEventsByDate ?? {})[0]!;
  const day = Number(date.split("-")[2]);
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`^${day}`) }).click();
  await expect(page.getByRole("heading", { name: /日の撮影情報/ })).toBeVisible();

  await page.getByRole("button", { name: "撮影角度表示の切り替え" }).click();
  await page.getByRole("button", { name: "焦点距離85mm を選択" }).click();

  await expect(page.getByText("85mm", { exact: false }).last()).toBeVisible();
});

test("date query restores the selected day and its events", async ({ page, apiScenario }) => {
  const date = Object.keys(apiScenario.dayEventsByDate ?? {})[0]!;
  const dayRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === `/api/events/${date}`,
  );

  await page.goto(`/?date=${date}`);
  await dayRequest;

  await expect(page).toHaveURL(new RegExp(`date=${date}`));
  await expect(page.getByRole("heading", { name: /日の撮影情報/ })).toBeVisible();
  await expect(page.getByText("沈むダイヤモンド富士", { exact: true })).toBeVisible();
});

test("calendar API failure leaves the home calendar usable", async ({ page }) => {
  await page.route("**/api/calendar/**", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "富士山カレンダー" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /\d+年\d+月/ })).toBeVisible();
});

test("locations API failure leaves the home calendar usable", async ({ page }) => {
  await page.route("**/api/locations", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "富士山カレンダー" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /\d+年\d+月/ })).toBeVisible();
});

test("empty API responses render the home calendar without event details", async ({ page }) => {
  await page.route("**/api/locations", (route) =>
    route.fulfill({ status: 200, json: { locations: [] } }),
  );
  await page.route("**/api/calendar/**", async (route) => {
    const url = new URL(route.request().url());
    const [, , , year, month] = url.pathname.split("/");
    await route.fulfill({
      status: 200,
      json: { year: Number(year), month: Number(month), events: [] },
    });
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "富士山カレンダー" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /\d+年\d+月/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /日の撮影情報/ })).toHaveCount(0);
});
