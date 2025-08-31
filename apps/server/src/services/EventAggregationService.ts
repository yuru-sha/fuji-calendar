import { CalendarEvent, FujiEvent, Location } from "@fuji-calendar/types";
import { getComponentLogger, StructuredLogger, timeUtils } from "@fuji-calendar/utils";
import { injectable } from "tsyringe";

/**
 * イベント集計・グルーピングサービス
 * カレンダー表示用のデータ変換とイベントの統計処理を担当
 */
@injectable()
export class EventAggregationService {
  private logger: StructuredLogger;

  constructor() {
    this.logger = getComponentLogger("event-aggregation");
  }

  /**
   * 富士イベントを日付別のカレンダーイベントにグループ化
   */
  groupEventsByDate(events: FujiEvent[]): CalendarEvent[] {
    const eventMap = new Map<
      string,
      {
        events: FujiEvent[];
        diamondCount: number;
        pearlCount: number;
      }
    >();

    // イベントを日付でグループ化
    events.forEach((event) => {
      const dateKey = timeUtils.formatDateString(new Date(event.time));

      if (!eventMap.has(dateKey)) {
        eventMap.set(dateKey, {
          events: [],
          diamondCount: 0,
          pearlCount: 0,
        });
      }

      const group = eventMap.get(dateKey)!;
      group.events.push(event);

      // イベントタイプ別カウント
      if (event.type === "diamond") {
        group.diamondCount++;
      } else if (event.type === "pearl") {
        group.pearlCount++;
      }
    });

    // カレンダーイベント形式に変換
    const calendarEvents: CalendarEvent[] = [];
    eventMap.forEach((group, dateKey) => {
      // イベントタイプを決定
      let eventType: "diamond" | "pearl" | "both";
      if (group.diamondCount > 0 && group.pearlCount > 0) {
        eventType = "both";
      } else if (group.diamondCount > 0) {
        eventType = "diamond";
      } else {
        eventType = "pearl";
      }

      calendarEvents.push({
        date: new Date(dateKey),
        type: eventType,
        events: group.events,
      });
    });

    // 日付順でソート
    calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    this.logger.debug("イベントグループ化完了", {
      totalEvents: events.length,
      groupedDates: calendarEvents.length,
      averageEventsPerDate:
        Math.round((events.length / calendarEvents.length) * 100) / 100,
    });

    return calendarEvents;
  }

  /**
   * 特定日のイベントをフィルタリング・ソート
   */
  filterEventsByDate(
    events: FujiEvent[],
    targetDate: string,
    locationId?: number,
  ): FujiEvent[] {
    let filteredEvents = events.filter((event) => {
      const eventDate = timeUtils.formatDateString(new Date(event.time));
      return eventDate === targetDate;
    });

    // 地点 ID によるフィルタリング
    if (locationId !== undefined) {
      filteredEvents = filteredEvents.filter(
        (event) => event.location.id === locationId,
      );
    }

    // 時刻順でソート
    filteredEvents.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    this.logger.debug("日別イベントフィルタリング完了", {
      targetDate,
      locationId,
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
    });

    return filteredEvents;
  }

  /**
   * 撮影推奨日の抽出（月間ベスト）
   */
  getBestShotDays(
    events: FujiEvent[],
    year: number,
    month: number,
    limit: number = 10,
  ): CalendarEvent[] {
    const monthEvents = events.filter((event) => {
      const eventDate = new Date(event.time);
      return (
        eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month
      );
    });

    const groupedEvents = this.groupEventsByDate(monthEvents);

    // スコア計算（イベント数 + 品質評価）
    const scoredEvents = groupedEvents.map((calendarEvent) => {
      let score = calendarEvent.events.length;

      // 高品質イベントに追加スコア
      calendarEvent.events.forEach((event) => {
        if (event.accuracy === "perfect") score += 3;
        else if (event.accuracy === "excellent") score += 2;
        else if (event.accuracy === "good") score += 1;
      });

      return {
        ...calendarEvent,
        score,
      };
    });

    // スコア順でソート
    scoredEvents.sort((a, b) => b.score - a.score);

    const bestDays = scoredEvents.slice(0, limit);

    this.logger.info("撮影推奨日抽出完了", {
      year,
      month,
      totalDays: groupedEvents.length,
      bestDaysCount: bestDays.length,
      averageScore:
        Math.round(
          (bestDays.reduce((sum, day) => sum + day.score, 0) /
            bestDays.length) *
            100,
        ) / 100,
    });

    return bestDays;
  }

  /**
   * 撮影統計情報の生成
   */
  generateCalendarStats(
    events: FujiEvent[],
    year: number,
    locations: Location[],
  ) {
    const yearEvents = events.filter((event) => {
      const eventDate = new Date(event.time);
      return eventDate.getFullYear() === year;
    });

    const stats = {
      totalEvents: yearEvents.length,
      monthlyBreakdown: new Array(12).fill(0),
      diamondEvents: 0,
      pearlEvents: 0,
      qualityBreakdown: {
        perfect: 0,
        excellent: 0,
        good: 0,
        fair: 0,
      },
      locationStats: locations.map((location) => ({
        id: location.id,
        name: location.name,
        eventCount: 0,
      })),
    };

    yearEvents.forEach((event) => {
      const eventDate = new Date(event.time);
      const month = eventDate.getMonth();

      // 月別統計
      stats.monthlyBreakdown[month]++;

      // イベントタイプ別統計
      if (event.type === "diamond") {
        stats.diamondEvents++;
      } else if (event.type === "pearl") {
        stats.pearlEvents++;
      }

      // 品質別統計
      if (
        event.accuracy &&
        stats.qualityBreakdown[event.accuracy] !== undefined
      ) {
        stats.qualityBreakdown[event.accuracy]++;
      }

      // 地点別統計
      const locationStat = stats.locationStats.find(
        (ls) => ls.id === event.location.id,
      );
      if (locationStat) {
        locationStat.eventCount++;
      }
    });

    this.logger.info("カレンダー統計生成完了", {
      year,
      totalEvents: stats.totalEvents,
      diamondEvents: stats.diamondEvents,
      pearlEvents: stats.pearlEvents,
    });

    return stats;
  }
}
