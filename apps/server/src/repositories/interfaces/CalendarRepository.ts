import { Location, FujiEvent, CalendarStats } from "../../shared";

export interface CalendarRepository {
  // 月間イベント取得
  getMonthlyEvents(year: number, month: number): Promise<FujiEvent[]>;

  // 日別イベント取得
  getDayEvents(date: string): Promise<FujiEvent[]>;

  // 今後のイベント取得
  getUpcomingEvents(limit?: number): Promise<FujiEvent[]>;

  // 地点別年間イベント取得
  getLocationYearlyEvents(
    locationId: number,
    year: number,
  ): Promise<FujiEvent[]>;

  // カレンダー統計情報取得
  getCalendarStats(year: number): Promise<CalendarStats>;

  // アクティブな地点取得
  getActiveLocations(): Promise<Location[]>;

  // イベント件数カウント
  countEventsByDate(
    startDate: string,
    endDate: string,
  ): Promise<{ date: string; count: number }[]>;
}
