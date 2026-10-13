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
