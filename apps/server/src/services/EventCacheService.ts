import { AstronomicalCalculator } from "./interfaces/AstronomicalCalculator";
import { Location, FujiEvent } from "@fuji-calendar/types";
import { getComponentLogger, StructuredLogger } from "@fuji-calendar/utils";
import { PrismaClient } from "@prisma/client";
import { singleton, inject } from "tsyringe";

@singleton()
export class EventCacheService {
  private logger: StructuredLogger;

  constructor(
    @inject("AstronomicalCalculator")
    private astronomicalCalculator: AstronomicalCalculator,
    @inject("PrismaClient") private prisma: PrismaClient,
  ) {
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

      // 既存データを削除
      const deletedCount = await this.prisma.locationEvent.deleteMany({
        where: { calculationYear: year },
      });
      this.logger.info("既存データ削除完了", {
        year,
        deletedCount: deletedCount.count,
      });

      // 全地点を取得
      const locations = await this.prisma.location.findMany();
      const locationTyped: Location[] = locations.map((loc: any) => ({
        ...loc,
        // 数値型フィールドの安全な変換
        latitude: Number(loc.latitude) || 0,
        longitude: Number(loc.longitude) || 0,
        elevation: Number(loc.elevation) || 0,
        // オプショナルフィールドの変換
        description: loc.description || undefined,
        accessInfo: loc.accessInfo || undefined,
        parkingInfo: loc.parkingInfo || undefined,
        fujiAzimuth: loc.fujiAzimuth ? Number(loc.fujiAzimuth) : undefined,
        fujiElevation: loc.fujiElevation
          ? Number(loc.fujiElevation)
          : undefined,
        fujiDistance: loc.fujiDistance ? Number(loc.fujiDistance) : undefined,
      }));

      this.logger.info("地点データ取得完了", {
        year,
        locationCount: locationTyped.length,
      });

      // 年間イベントを計算（バッチ処理で進捗報告）
      const allEvents: Array<{ location: Location; events: FujiEvent[] }> = [];
      const batchSize = 5; // 一度に処理する地点数を制限

      for (let i = 0; i < locationTyped.length; i += batchSize) {
        const batch = locationTyped.slice(i, i + batchSize);
        const progress = Math.round((i / locationTyped.length) * 100);

        this.logger.info("バッチ処理進行中", {
          year,
          progress: `${progress}%`,
          currentBatch: `${i + 1}-${Math.min(i + batchSize, locationTyped.length)}`,
          totalLocations: locationTyped.length,
        });

        // バッチ内の地点を並列処理
        const batchResults = await Promise.all(
          batch.map(async (location) => {
            try {
              const events =
                await this.astronomicalCalculator.calculateLocationYearlyEvents(
                  location,
                  year,
                );
              return { location, events };
            } catch (error) {
              this.logger.error("地点別計算エラー", error, {
                year,
                locationId: location.id,
                locationName: location.name,
              });
              return { location, events: [] }; // エラー時は空配列を返す
            }
          }),
        );

        allEvents.push(...batchResults);
      }

      const events = allEvents.flatMap((item) =>
        item.events.map((event) => ({ ...event, location: item.location })),
      );

      this.logger.info("全イベント計算完了", {
        year,
        totalEvents: events.length,
      });

      // データベースに保存（バッチ保存）
      const savedEvents = [];
      const saveBatchSize = 100; // データベース保存のバッチサイズ

      for (let i = 0; i < events.length; i += saveBatchSize) {
        const batch = events.slice(i, i + saveBatchSize);
        const progress = Math.round((i / events.length) * 100);

        this.logger.debug("データベース保存進行中", {
          year,
          progress: `${progress}%`,
          currentBatch: `${i + 1}-${Math.min(i + saveBatchSize, events.length)}`,
          totalEvents: events.length,
        });

        const batchSaved = await Promise.all(
          batch.map((event) =>
            this.prisma.locationEvent.create({
              data: {
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
              },
            }),
          ),
        );

        savedEvents.push(...batchSaved);
      }

      const endTime = Date.now();

      this.logger.info("年間キャッシュ生成完了", {
        year,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime,
        locations: locationTyped.length,
        avgEventsPerLocation: Math.round(
          savedEvents.length / locationTyped.length,
        ),
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime,
      };
    } catch (error) {
      this.logger.error("年間キャッシュ生成エラー", error, { year });
      return {
        success: false,
        totalEvents: 0,
        timeMs: Date.now() - startTime,
        error: error as Error,
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
      const location = await this.prisma.location.findUnique({
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

      // 該当月の既存データを削除
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      await this.prisma.locationEvent.deleteMany({
        where: {
          locationId: locationId,
          calculationYear: year,
          eventTime: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      // 月間イベントを計算
      const events = await this.astronomicalCalculator.calculateMonthlyEvents(
        year,
        month,
        [locationTyped],
      );

      // データベースに保存
      const savedEvents = await Promise.all(
        events.map((event) =>
          this.prisma.locationEvent.create({
            data: {
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
            },
          }),
        ),
      );

      const endTime = Date.now();

      this.logger.info("地点月間キャッシュ生成完了", {
        locationId,
        year,
        month,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
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
      const location = await this.prisma.location.findUnique({
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

      // 該当日の既存データを削除
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      await this.prisma.locationEvent.deleteMany({
        where: {
          locationId: locationId,
          calculationYear: year,
          eventTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      // その日のイベントを計算
      const date = new Date(year, month - 1, day, 12, 0, 0, 0); // JST 正午基準
      const diamondEvents =
        await this.astronomicalCalculator.calculateDiamondFuji(date, [
          locationTyped,
        ]);
      const pearlEvents = await this.astronomicalCalculator.calculatePearlFuji(
        date,
        [locationTyped],
      );
      const events = [...diamondEvents, ...pearlEvents];

      // データベースに保存
      const savedEvents = await Promise.all(
        events.map((event) =>
          this.prisma.locationEvent.create({
            data: {
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
            },
          }),
        ),
      );

      const endTime = Date.now();

      this.logger.info("地点日別キャッシュ生成完了", {
        locationId,
        year,
        month,
        day,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
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
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      const locationTyped: Location = {
        ...location,
        // 数値型フィールドの安全な変換
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
        elevation: Number(location.elevation) || 0,
        // オプショナルフィールドの変換
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

      // 既存データを削除
      await this.prisma.locationEvent.deleteMany({
        where: {
          locationId: locationId,
          calculationYear: year,
        },
      });

      // 年間イベントを計算
      const events =
        await this.astronomicalCalculator.calculateLocationYearlyEvents(
          locationTyped,
          year,
        );

      // データベースに保存
      const savedEvents = await Promise.all(
        events.map((event: any) =>
          this.prisma.locationEvent.create({
            data: {
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
            },
          }),
        ),
      );

      const endTime = Date.now();

      this.logger.info("地点キャッシュ生成完了", {
        locationId,
        year,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime,
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
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
