import { expect, test as base } from "@playwright/test";
import type {
  CalendarEventResponse,
  FujiEventResponse,
  Location,
} from "../../packages/types/src";
import type { Page, Route } from "@playwright/test";

export type ApiScenario = {
  locations: Location[];
  calendarEventsByMonth?: Record<string, CalendarEventResponse[]>;
  dayEventsByDate?: Record<string, FujiEventResponse[]>;
};

export const testLocation: Location = {
  id: 101,
  name: "山中湖交流プラザ",
  prefecture: "山梨県",
  latitude: 35.4167,
  longitude: 138.87,
  elevation: 980,
  description: "湖畔の撮影地点",
  accessInfo: null,
  parkingInfo: null,
  fujiDistance: 30_000,
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

export const secondTestLocation: Location = {
  ...testLocation,
  id: 102,
  name: "河口湖大石公園",
  latitude: 35.522,
  longitude: 138.75,
  fujiDistance: 150_000,
};
const currentMonthDay = () => {
  const tokyoNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${tokyoNow.getUTCFullYear()}-${String(tokyoNow.getUTCMonth() + 1).padStart(2, "0")}-15`;
};

export const createScenario = (): ApiScenario => {
  const date = currentMonthDay();
  const [yearString, monthString] = date.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const event: FujiEventResponse = {
    id: "diamond-yamanakako-15",
    type: "diamond",
    subType: "sunset",
    time: `${date}T08:30:00.000Z`,
    location: testLocation,
    azimuth: 270,
    elevation: 1.2,
  };
  const secondEvent: FujiEventResponse = {
    id: "pearl-kawaguchiko-15",
    type: "pearl",
    subType: "rising",
    time: `${date}T09:30:00.000Z`,
    location: secondTestLocation,
    azimuth: 90,
    elevation: 1.2,
  };

  const monthlyEvent: CalendarEventResponse = {
    date,
    type: "both",
    events: [event, secondEvent],
  };

  return {
    locations: [testLocation, secondTestLocation],
    calendarEventsByMonth: { [`${year}/${month}`]: [monthlyEvent] },
    dayEventsByDate: { [date]: [event, secondEvent] },
  };
};

const fulfill = (route: Route, json: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });

export async function installApiScenario(
  page: Page,
  scenario: ApiScenario,
  unexpectedRequests: string[],
): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === "/api/locations" && route.request().method() === "GET") {
      await fulfill(route, { locations: scenario.locations });
      return;
    }

    const calendarMatch = pathname.match(/^\/api\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (calendarMatch && route.request().method() === "GET") {
      const year = Number(calendarMatch[1]);
      const month = Number(calendarMatch[2]);
      await fulfill(route, {
        year,
        month,
        events: scenario.calendarEventsByMonth?.[`${year}/${month}`] ?? [],
      });
      return;
    }

    const dayMatch = pathname.match(/^\/api\/events\/(\d{4}-\d{2}-\d{2})$/);
    if (dayMatch && route.request().method() === "GET") {
      await fulfill(route, {
        date: dayMatch[1],
        events: scenario.dayEventsByDate?.[dayMatch[1]] ?? [],
      });
      return;
    }

    if (pathname === "/api/auth/verify" && route.request().method() === "GET") {
      await fulfill(route, { success: false, message: "Unauthorized" }, 401);
      return;
    }

    if (pathname === "/api/auth/login" && route.request().method() === "POST") {
      await fulfill(route, { success: false, message: "認証に失敗しました" }, 401);
      return;
    }

    const message = `${route.request().method()} ${pathname}`;
    unexpectedRequests.push(message);
    await fulfill(route, { error: `Unexpected API request: ${message}` }, 500);
  });
}

export const test = base.extend<{ apiScenario: ApiScenario }>({
  apiScenario: [
    async ({ page }, use) => {
      const scenario = createScenario();
      const unexpectedRequests: string[] = [];
      await installApiScenario(page, scenario, unexpectedRequests);
      await use(scenario);
      expect(unexpectedRequests, "Unexpected /api/** requests").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
