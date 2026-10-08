import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../database/prisma";
import { AstronomicalCalculator } from "./AstronomicalCalculator";
import { Location, FujiEvent } from "@fuji-calendar/types";
import { getComponentLogger, StructuredLogger } from "@fuji-calendar/utils";

type LocationEventData = Prisma.LocationEventCreateManyInput;

type EventCacheReplacement =
  | {
      kind: "location";
      locationId: number;
      year: number;
      where: Prisma.LocationEventWhereInput;
      events: LocationEventData[];
    }
  | {
      kind: "year";
      year: number;
      locationIds: number[];
      where: Prisma.LocationEventWhereInput;
      events: LocationEventData[];
    };

/**
 * イベントキャッシュサービス
 * 事前計算されたダイヤモンド・パール富士データの管理
 */
export class EventCacheService {
  private astronomicalCalculator: AstronomicalCalculator;
  private logger: StructuredLogger;

  constructor(astronomicalCalculator: AstronomicalCalculator) {
    this.astronomicalCalculator = astronomicalCalculator;
    this.logger = getComponentLogger("event-cache-service");
  }

  /**
   * 全地点の年間データを事前計算・保存
   */
  async generateYearlyCache(year: number): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
    error?: Error;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("年間キャッシュ生成開始", { year });

      const locations = await prisma.location.findMany();
      const locationTyped: Location[] = locations.map((location) => ({
        ...location,
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        elevation: Number(location.elevation) || 0,
        description: location.description || undefined,
        accessInfo: location.accessInfo || undefined,
        parkingInfo: location.parkingInfo || undefined,
        fujiAzimuth: location.fujiAzimuth
          ? Number(location.fujiAzimuth)
          : undefined,
        fujiElevation: location.fujiElevation
          ? Number(location.fujiElevation)
          : undefined,
        fujiDistance: location.fujiDistance
          ? Number(location.fujiDistance)
          : undefined,
      }));
      const locationIds = locationTyped.map(({ id }) => id).sort((a, b) => a - b);
      const allEvents: FujiEvent[] = [];
      const batchSize = 5;

      for (let i = 0; i < locationTyped.length; i += batchSize) {
        const batch = locationTyped.slice(i, i + batchSize);
        const progress = Math.round((i / locationTyped.length) * 100);
        this.logger.info("バッチ処理進行中", {
          year,
          progress: `${progress}%`,
          currentBatch: `${i + 1}-${Math.min(i + batchSize, locationTyped.length)}`,
          totalLocations: locationTyped.length,
        });
        const batchEvents = await Promise.all(
          batch.map((location) =>
            this.astronomicalCalculator.calculateLocationYearlyEvents(
              location,
              year,
            ),
          ),
        );
        for (const locationEvents of batchEvents) {
          allEvents.push(...locationEvents);
        }
      }

      const events = allEvents.map((event) =>
        this.toLocationEvent(event, year),
      );
      const savedEventCount = await this.replaceLocationEvents({
        kind: "year",
        year,
        locationIds,
        where: {
          calculationYear: year,
          locationId: { in: locationIds },
        },
        events,
      });
      const timeMs = Date.now() - startTime;

      this.logger.info("年間キャッシュ生成完了", {
        year,
        totalEvents: savedEventCount,
        timeMs,
        locations: locationTyped.length,
        avgEventsPerLocation: locationTyped.length
          ? Math.round(savedEventCount / locationTyped.length)
          : 0,
      });

      return { success: true, totalEvents: savedEventCount, timeMs };
    } catch (error) {
      this.logger.error("年間キャッシュ生成エラー", error, { year });
      return {
        success: false,
        totalEvents: 0,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * 地点別月間キャッシュ生成（効率的な月単位処理）
   */
  async generateLocationMonthCache(
    locationId: number,
    year: number,
    month: number,
  ): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("地点月間キャッシュ生成開始", {
        locationId,
        year,
        month,
      });

      // 地点情報を取得
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      const locationTyped: Location = {
        ...location,
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        elevation: Number(location.elevation) || 0,
        description: location.description || undefined,
        accessInfo: location.accessInfo || undefined,
        parkingInfo: location.parkingInfo || undefined,
        fujiAzimuth: location.fujiAzimuth
          ? Number(location.fujiAzimuth)
          : undefined,
        fujiElevation: location.fujiElevation
          ? Number(location.fujiElevation)
          : undefined,
        fujiDistance: location.fujiDistance
          ? Number(location.fujiDistance)
          : undefined,
      };

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const events = await this.astronomicalCalculator.calculateMonthlyEvents(
        year,
        month,
        [locationTyped],
      );
      const eventData = events.map((event) =>
        this.toLocationEvent(event, year),
      );
      const savedEvents = await this.replaceLocationEvents({
        kind: "location",
        locationId,
        year,
        where: {
          locationId,
          calculationYear: year,
          eventTime: { gte: monthStart, lte: monthEnd },
        },
        events: eventData,
      });

      const endTime = Date.now();

      this.logger.info("地点月間キャッシュ生成完了", {
        locationId,
        year,
        month,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      };
    } catch (error) {
      this.logger.error("地点月間キャッシュ生成エラー", error, {
        locationId,
        year,
        month,
      });
      return {
        success: false,
        totalEvents: 0,
        timeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 地点別日別キャッシュ生成（単日処理）
   */
  async generateLocationDayCache(
    locationId: number,
    year: number,
    month: number,
    day: number,
  ): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("地点日別キャッシュ生成開始", {
        locationId,
        year,
        month,
        day,
      });

      // 地点情報を取得
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      const locationTyped: Location = {
        ...location,
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        elevation: Number(location.elevation) || 0,
        description: location.description || undefined,
        accessInfo: location.accessInfo || undefined,
        parkingInfo: location.parkingInfo || undefined,
        fujiAzimuth: location.fujiAzimuth
          ? Number(location.fujiAzimuth)
          : undefined,
        fujiElevation: location.fujiElevation
          ? Number(location.fujiElevation)
          : undefined,
        fujiDistance: location.fujiDistance
          ? Number(location.fujiDistance)
          : undefined,
      };

      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      const diamondEvents =
        await this.astronomicalCalculator.calculateDiamondFuji(date, [
          locationTyped,
        ]);
      const pearlEvents = await this.astronomicalCalculator.calculatePearlFuji(
        date,
        [locationTyped],
      );
      const eventData = [...diamondEvents, ...pearlEvents].map((event) =>
        this.toLocationEvent(event, year),
      );
      const savedEvents = await this.replaceLocationEvents({
        kind: "location",
        locationId,
        year,
        where: {
          locationId,
          calculationYear: year,
          eventTime: { gte: dayStart, lte: dayEnd },
        },
        events: eventData,
      });

      const endTime = Date.now();

      this.logger.info("地点日別キャッシュ生成完了", {
        locationId,
        year,
        month,
        day,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      };
    } catch (error) {
      this.logger.error("地点日別キャッシュ生成エラー", error, {
        locationId,
        year,
        month,
        day,
      });
      return {
        success: false,
        totalEvents: 0,
        timeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 単一地点の年間データを生成・保存（地点登録時用）
   */
  async generateLocationCache(
    locationId: number,
    year: number,
  ): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("地点キャッシュ生成開始", { locationId, year });

      // 地点情報を取得
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      const locationTyped: Location = {
        ...location,
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        elevation: Number(location.elevation) || 0,
        description: location.description || undefined,
        accessInfo: location.accessInfo || undefined,
        parkingInfo: location.parkingInfo || undefined,
        fujiAzimuth: location.fujiAzimuth
          ? Number(location.fujiAzimuth)
          : undefined,
        fujiElevation: location.fujiElevation
          ? Number(location.fujiElevation)
          : undefined,
        fujiDistance: location.fujiDistance
          ? Number(location.fujiDistance)
          : undefined,
      };

      const events =
        await this.astronomicalCalculator.calculateLocationYearlyEvents(
          locationTyped,
          year,
        );
      const eventData = events.map((event) =>
        this.toLocationEvent(event, year),
      );
      const savedEvents = await this.replaceLocationEvents({
        kind: "location",
        locationId,
        year,
        where: { locationId, calculationYear: year },
        events: eventData,
      });

      const endTime = Date.now();

      this.logger.info("地点キャッシュ生成完了", {
        locationId,
        year,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents,
        timeMs: endTime - startTime,
      };
    } catch (error) {
      this.logger.error("地点キャッシュ生成エラー", error, {
        locationId,
        year,
      });
      throw error;
    }
  }

  private toLocationEvent(event: FujiEvent, year: number) {
    return {
      locationId: event.location.id,
      eventDate: this.createJstDateOnly(event.time),
      eventTime: event.time,
      azimuth: event.azimuth || 0,
      altitude: event.elevation || 0,
      qualityScore: this.getQualityScore(event.accuracy),
      moonPhase: event.moonPhase,
      moonIllumination: event.moonIllumination,
      calculationYear: year,
      eventType: this.getEventType(event),
      accuracy: this.mapAccuracy(event.accuracy),
    };
  }

  private async replaceLocationEvents(
    replacement: EventCacheReplacement,
  ): Promise<number> {
    if (replacement.kind === "year" && replacement.locationIds.length === 0) {
      return 0;
    }

    return prisma.$transaction(async (transaction) => {
      if (replacement.kind === "year") {
        await transaction.$queryRaw`
          WITH lock_result AS MATERIALIZED (
            SELECT pg_advisory_xact_lock(
              ${0}::integer,
              ${replacement.year}::integer
            )
          )
          SELECT 1 FROM lock_result
        `;
      } else {
        await transaction.$queryRaw`
          WITH lock_result AS MATERIALIZED (
            SELECT pg_advisory_xact_lock_shared(
              ${0}::integer,
              ${replacement.year}::integer
            )
          )
          SELECT 1 FROM lock_result
        `;
        await transaction.$queryRaw`
          WITH lock_result AS MATERIALIZED (
            SELECT pg_advisory_xact_lock(
              ${replacement.locationId}::integer,
              ${replacement.year}::integer
            )
          )
          SELECT 1 FROM lock_result
        `;
      }

      await transaction.locationEvent.deleteMany({
        where: replacement.where,
      });
      if (replacement.events.length === 0) return 0;

      const result = await transaction.locationEvent.createMany({
        data: replacement.events,
      });
      return result.count;
    });
  }

  /**
   * 精度レベルから品質スコアを計算
   */
  private getQualityScore(
    accuracy?: "perfect" | "excellent" | "good" | "fair",
  ): number {
    switch (accuracy) {
      case "perfect":
        return 1.0;
      case "excellent":
        return 0.8;
      case "good":
        return 0.6;
      case "fair":
        return 0.4;
      default:
        return 0.0;
    }
  }

  /**
   * イベントタイプを Enum 値にマッピング
   */
  private getEventType(
    event: FujiEvent,
  ): "diamond_sunrise" | "diamond_sunset" | "pearl_moonrise" | "pearl_moonset" {
    if (event.type === "diamond") {
      return event.subType === "sunrise" ? "diamond_sunrise" : "diamond_sunset";
    } else {
      return event.subType === "rising" ? "pearl_moonrise" : "pearl_moonset";
    }
  }

  /**
   * 精度レベルを Enum 値にマッピング
   */
  private mapAccuracy(
    accuracy?: "perfect" | "excellent" | "good" | "fair",
  ): "perfect" | "excellent" | "good" | "fair" | null {
    switch (accuracy) {
      case "perfect":
        return "perfect";
      case "excellent":
        return "excellent";
      case "good":
        return "good";
      case "fair":
        return "fair";
      default:
        return null;
    }
  }

  /**
   * JST 時刻から日付のみを抽出して JST 基準の日付オブジェクトを作成
   */
  private createJstDateOnly(jstDateTime: Date): Date {
    // JST 時刻の年月日を取得
    const jstTimeString = jstDateTime.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const [year, month, day] = jstTimeString.split("/").map((n) => parseInt(n));

    // その日の JST 00:00:00 に相当する UTC 時刻を作成
    // JST 2026-01-01 00:00:00 = UTC 2025-12-31 15:00:00
    // しかし PostgreSQL に保存する際は、JST 日付として 2026-01-01 を保存したい
    // そのため UTC 時刻でも同じ日付（2026-01-01）になるように調整
    return new Date(Date.UTC(year, month - 1, day, 9, 0, 0, 0)); // UTC 09:00 = JST 18:00（同日）
  }
}

// DI コンテナから注入されるため、シングルトンインスタンスは削除
