import {
  EventService,
  CacheResult,
  MonthlyEventResult,
  YearlyEventResult,
  CacheValidationResult,
} from "./interfaces/EventService";
import { EventCacheService } from "./EventCacheService";
import { AstronomicalCalculator } from "./interfaces/AstronomicalCalculator";
import { PrismaClient } from "@prisma/client";
import { getComponentLogger } from "@fuji-calendar/utils";
import { singleton, inject } from "tsyringe";

const logger = getComponentLogger("EventServiceImpl");

@singleton()
export class EventServiceImpl implements EventService {
  constructor(
    @inject("AstronomicalCalculator")
    private astronomicalCalculator: AstronomicalCalculator,
    @inject(EventCacheService) private eventCacheService: EventCacheService,
    @inject("PrismaClient") private prisma: PrismaClient,
  ) {}

  async generateLocationCache(
    locationId: number,
    year: number,
  ): Promise<CacheResult> {
    const startTime = Date.now();
    logger.info("地点キャッシュ生成開始", { locationId, year });

    try {
      // 地点情報を取得
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return {
          success: false,
          locationId,
          year,
          eventsGenerated: 0,
          processingTime: Date.now() - startTime,
          errors: [`Location not found: ${locationId}`],
        };
      }

      // 環境変数で計算スキップを制御（バックエンドでは計算しない）
      if (process.env.SKIP_DIRECT_CALCULATION === 'true') {
        logger.info("直接計算をスキップ（キューシステム使用）", {
          locationId,
          year,
          skipDirectCalculation: process.env.SKIP_DIRECT_CALCULATION,
        });
        
        // 空の結果を返す
        return {
          success: true,
          locationId,
          year,
          eventsGenerated: 0,
          processingTime: Date.now() - startTime,
          errors: [],
        };
      }

      // EventCacheService を使用してキャッシュ生成
      const result = await this.eventCacheService.generateLocationCache(
        locationId,
        year,
      );
      const processingTime = Date.now() - startTime;

      logger.info("地点キャッシュ生成完了", {
        locationId,
        year,
        eventsGenerated: result.totalEvents,
        processingTime,
      });

      return {
        success: result.success,
        locationId,
        year,
        eventsGenerated: result.totalEvents,
        processingTime,
        errors: result.success ? undefined : ["Generation failed"],
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("地点キャッシュ生成エラー", error, { locationId, year });

      return {
        success: false,
        locationId,
        year,
        eventsGenerated: 0,
        processingTime,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  async calculateMonthlyEvents(
    year: number,
    month: number,
    locationIds: number[],
  ): Promise<MonthlyEventResult> {
    const startTime = Date.now();
    logger.info("月間イベント計算開始", {
      year,
      month,
      locationCount: locationIds.length,
    });

    try {
      // 環境変数で計算スキップを制御（バックエンドでは計算しない）
      if (process.env.SKIP_DIRECT_CALCULATION === 'true') {
        logger.info("月間直接計算をスキップ（キューシステム使用）", {
          year,
          month,
          locationCount: locationIds.length,
          skipDirectCalculation: process.env.SKIP_DIRECT_CALCULATION,
        });
        
        const processingTime = Date.now() - startTime;
        return {
          success: true,
          year,
          month,
          eventsGenerated: 0,
          locationCount: locationIds.length,
          processingTime,
          errors: [],
        };
      }

      let totalEventsGenerated = 0;
      const errors: string[] = [];

      // 各地点の月間イベントを計算
      for (const locationId of locationIds) {
        try {
          const monthlyResult =
            await this.eventCacheService.generateLocationCache(
              locationId,
              year,
            );
          totalEventsGenerated += monthlyResult.totalEvents;
        } catch (error) {
          const errorMessage = `Location ${locationId}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errors.push(errorMessage);
          logger.warn("地点別月間計算エラー", { locationId, error });
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info("月間イベント計算完了", {
        year,
        month,
        locationCount: locationIds.length,
        eventsGenerated: totalEventsGenerated,
        errors: errors.length,
        processingTime,
      });

      return {
        success: errors.length === 0,
        year,
        month,
        locationCount: locationIds.length,
        eventsGenerated: totalEventsGenerated,
        processingTime,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("月間イベント計算エラー", error, { year, month });

      return {
        success: false,
        year,
        month,
        locationCount: locationIds.length,
        eventsGenerated: 0,
        processingTime,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  async calculateYearlyEvents(
    year: number,
    locationIds: number[],
  ): Promise<YearlyEventResult> {
    const startTime = Date.now();
    logger.info("年間イベント計算開始", {
      year,
      locationCount: locationIds.length,
    });

    try {
      let totalEventsGenerated = 0;
      const errors: string[] = [];

      // 各地点の年間イベントを計算
      for (const locationId of locationIds) {
        const cacheResult = await this.generateLocationCache(locationId, year);

        if (cacheResult.success) {
          totalEventsGenerated += cacheResult.eventsGenerated;
        } else {
          errors.push(...(cacheResult.errors || []));
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info("年間イベント計算完了", {
        year,
        locationCount: locationIds.length,
        eventsGenerated: totalEventsGenerated,
        errors: errors.length,
        processingTime,
      });

      return {
        success: errors.length === 0,
        year,
        locationCount: locationIds.length,
        eventsGenerated: totalEventsGenerated,
        processingTime,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error("年間イベント計算エラー", error, { year });

      return {
        success: false,
        year,
        locationCount: locationIds.length,
        eventsGenerated: 0,
        processingTime,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  async validateEventCache(
    locationId: number,
    year: number,
  ): Promise<CacheValidationResult> {
    logger.debug("キャッシュ検証開始", { locationId, year });

    try {
      // 現在のキャッシュ状況を確認
      const existingEvents = await this.prisma.locationEvent.count({
        where: {
          locationId,
          eventDate: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });

      // 月別のイベント数を確認
      const monthlyEvents = await this.prisma.locationEvent.groupBy({
        by: ["eventDate"],
        where: {
          locationId,
          eventDate: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
        _count: true,
      });

      // 欠損している月を特定
      const existingMonths = new Set(
        monthlyEvents.map(
          (event: any) => new Date(event.eventDate).getMonth() + 1,
        ),
      );
      const missingMonths: number[] = [];
      for (let month = 1; month <= 12; month++) {
        if (!existingMonths.has(month)) {
          missingMonths.push(month);
        }
      }

      // 期待値の計算（簡易版）
      const expectedEvents = 365 * 2; // 概算：年間 365 日 × (ダイヤモンド富士 + パール富士)

      const isValid = existingEvents > 0 && missingMonths.length <= 2; // 2 ヶ月以内の欠損は許容

      const recommendations: string[] = [];
      if (!isValid) {
        if (existingEvents === 0) {
          recommendations.push(
            "キャッシュが全く存在しません。完全な再計算が必要です。",
          );
        } else if (missingMonths.length > 2) {
          recommendations.push(
            `${missingMonths.length}ヶ月のデータが欠損しています。部分的な再計算を推奨します。`,
          );
        }
      }

      logger.info("キャッシュ検証完了", {
        locationId,
        year,
        isValid,
        existingEvents,
        expectedEvents,
        missingMonths: missingMonths.length,
      });

      return {
        isValid,
        locationId,
        year,
        expectedEvents,
        actualEvents: existingEvents,
        missingMonths,
        recommendations:
          recommendations.length > 0 ? recommendations : undefined,
      };
    } catch (error) {
      logger.error("キャッシュ検証エラー", error, { locationId, year });

      return {
        isValid: false,
        locationId,
        year,
        expectedEvents: 0,
        actualEvents: 0,
        missingMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        recommendations: ["検証エラーのため、完全な再計算が必要です。"],
      };
    }
  }
}
