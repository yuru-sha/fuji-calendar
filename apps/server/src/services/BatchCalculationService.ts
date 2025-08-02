import { Location } from "../shared";
import { PrismaClientManager } from "../database/prisma";
import { EventCacheService } from "./EventCacheService";
import { AstronomicalCalculator } from "./AstronomicalCalculator";
import { getComponentLogger, StructuredLogger } from "../shared";

/**
 * バッチ計算サービス
 * QueueService から呼び出される重い天体計算処理を担当
 */
export class BatchCalculationService {
  private astronomicalCalculator: AstronomicalCalculator;
  private eventCacheService: EventCacheService;
  private logger: StructuredLogger;
  private prisma = PrismaClientManager.getInstance();

  constructor(
    astronomicalCalculator: AstronomicalCalculator,
    eventCacheService: EventCacheService,
  ) {
    this.astronomicalCalculator = astronomicalCalculator;
    this.eventCacheService = eventCacheService;
    this.logger = getComponentLogger("batch-calculation-service");
  }

  /**
   * 単一地点の年間イベント計算
   */
  async calculateLocationYearlyEvents(
    locationId: number,
    year: number,
  ): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("地点年間計算開始", { locationId, year });

      // 地点情報を取得
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      // EventCacheService を使用して年間計算を実行
      const result = await this.eventCacheService.generateLocationCache(
        locationId,
        year,
      );

      const timeMs = Date.now() - startTime;

      if (result.success) {
        this.logger.info("地点年間計算完了", {
          locationId,
          locationName: location.name,
          year,
          totalEvents: result.totalEvents,
          timeMs,
        });

        return {
          success: true,
          totalEvents: result.totalEvents,
          timeMs,
        };
      } else {
        throw new Error("Cache generation failed");
      }
    } catch (error) {
      const timeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error("地点年間計算エラー", error, {
        locationId,
        year,
        timeMs,
      });

      return {
        success: false,
        totalEvents: 0,
        timeMs,
        error: errorMessage,
      };
    }
  }

  /**
   * 月間イベント計算（複数地点対応）
   */
  async calculateMonthlyEvents(
    year: number,
    month: number,
    locationIds: number[],
  ): Promise<{
    success: boolean;
    totalEvents: number;
    processedLocations: number;
    timeMs: number;
    locationResults: Array<{
      locationId: number;
      locationName: string;
      events: number;
      success: boolean;
      error?: string;
    }>;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("月間計算開始", {
        year,
        month,
        locationCount: locationIds.length,
      });

      const locationResults = [];
      let totalEvents = 0;
      let processedLocations = 0;

      // 全地点を一括取得（N+1 クエリ問題の解決）
      const locations = await this.prisma.location.findMany({
        where: {
          id: { in: locationIds },
        },
      });

      // 地点 ID をキーとする Map を作成（高速検索用）
      const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

      // 各地点で月間計算を実行
      for (const locationId of locationIds) {
        try {
          const location = locationMap.get(locationId);

          if (!location) {
            locationResults.push({
              locationId,
              locationName: `Unknown (${locationId})`,
              events: 0,
              success: false,
              error: "Location not found",
            });
            continue;
          }

          // 月間データをデータベースに保存（EventCacheService を使用）
          const monthResult =
            await this.eventCacheService.generateLocationMonthCache(
              locationId,
              year,
              month,
            );

          locationResults.push({
            locationId,
            locationName: location.name,
            events: monthResult.totalEvents,
            success: monthResult.success,
          });

          totalEvents += monthResult.totalEvents;
          processedLocations++;

          this.logger.debug("地点月間計算完了", {
            locationId,
            locationName: location.name,
            year,
            month,
            events: monthResult.totalEvents,
          });
        } catch (locationError) {
          const location = locationMap.get(locationId);

          locationResults.push({
            locationId,
            locationName: location?.name || `Unknown (${locationId})`,
            events: 0,
            success: false,
            error:
              locationError instanceof Error
                ? locationError.message
                : "Unknown error",
          });

          this.logger.error("地点月間計算エラー", locationError, {
            locationId,
            year,
            month,
          });
        }
      }

      const timeMs = Date.now() - startTime;

      this.logger.info("月間計算完了", {
        year,
        month,
        totalEvents,
        processedLocations,
        requestedLocations: locationIds.length,
        timeMs,
      });

      return {
        success: true,
        totalEvents,
        processedLocations,
        timeMs,
        locationResults,
      };
    } catch (error) {
      const timeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error("月間計算エラー", error, {
        year,
        month,
        locationIds,
      });

      return {
        success: false,
        totalEvents: 0,
        processedLocations: 0,
        timeMs,
        locationResults: [],
        error: errorMessage,
      };
    }
  }

  /**
   * 日別イベント計算（複数地点対応）
   */
  async calculateDayEvents(
    year: number,
    month: number,
    day: number,
    locationIds: number[],
  ): Promise<{
    success: boolean;
    totalEvents: number;
    processedLocations: number;
    timeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info("日別計算開始", {
        year,
        month,
        day,
        locationCount: locationIds.length,
      });

      const locations = await this.prisma.location.findMany({
        where: {
          id: { in: locationIds },
        },
      });

      let totalEvents = 0;

      // 各地点でその日のデータをデータベースに保存
      for (const location of locations) {
        const dayResult = await this.eventCacheService.generateLocationDayCache(
          location.id,
          year,
          month,
          day,
        );
        totalEvents += dayResult.totalEvents;

        this.logger.debug("地点日別計算完了", {
          locationId: location.id,
          locationName: location.name,
          year,
          month,
          day,
          totalEvents: dayResult.totalEvents,
          success: dayResult.success,
        });
      }

      const timeMs = Date.now() - startTime;

      this.logger.info("日別計算完了", {
        year,
        month,
        day,
        totalEvents,
        processedLocations: locations.length,
        timeMs,
      });

      return {
        success: true,
        totalEvents,
        processedLocations: locations.length,
        timeMs,
      };
    } catch (error) {
      const timeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.logger.error("日別計算エラー", error, {
        year,
        month,
        day,
        locationIds,
      });

      return {
        success: false,
        totalEvents: 0,
        processedLocations: 0,
        timeMs,
        error: errorMessage,
      };
    }
  }

  /**
   * バッチ計算の健康状態チェック
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    calculatorStatus: string;
    databaseStatus: string;
    cacheServiceStatus: string;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    let healthy = true;

    try {
      // AstronomicalCalculator テスト
      const testLocation: Location = {
        id: 999999,
        name: "Test Location",
        prefecture: "Test",
        latitude: 35.0,
        longitude: 139.0,
        elevation: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const testDate = new Date();
      const testSunPos = this.astronomicalCalculator.getSunPosition(
        testDate,
        testLocation.latitude,
        testLocation.longitude,
      );

      const calculatorStatus =
        testSunPos && testSunPos.azimuth >= 0 && testSunPos.azimuth <= 360
          ? "healthy"
          : "unhealthy";

      if (calculatorStatus === "unhealthy") {
        healthy = false;
        recommendations.push("AstronomicalCalculator の初期化に問題があります");
      }

      // データベース接続テスト
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseStatus = "healthy";

      // EventCacheService テスト
      const cacheServiceStatus = "healthy"; // TODO: 適切なヘルスチェック追加

      this.logger.info("バッチ計算健康チェック完了", {
        healthy,
        calculatorStatus,
        databaseStatus,
        cacheServiceStatus,
        recommendationCount: recommendations.length,
      });

      return {
        healthy,
        calculatorStatus,
        databaseStatus,
        cacheServiceStatus,
        recommendations,
      };
    } catch (error) {
      this.logger.error("バッチ計算健康チェックエラー", error);

      return {
        healthy: false,
        calculatorStatus: "error",
        databaseStatus: "error",
        cacheServiceStatus: "error",
        recommendations: [
          "バッチ計算システムに問題があります",
          "ログを確認してください",
        ],
      };
    }
  }

  /**
   * 計算統計の取得
   */
  async getCalculationStats(): Promise<{
    totalLocations: number;
    currentYear: number;
    monthlyProgress: Array<{
      month: number;
      completed: boolean;
      eventCount: number;
    }>;
    systemLoad: {
      cpu: string;
      memory: string;
    };
  }> {
    try {
      const currentYear = new Date().getFullYear();

      // 地点数を取得
      const totalLocations = await this.prisma.location.count();

      // 月別進捗を取得（簡易版）
      const monthlyProgress = [];
      for (let month = 1; month <= 12; month++) {
        const eventCount = await this.prisma.locationEvent.count({
          where: {
            calculationYear: currentYear,
            eventTime: {
              gte: new Date(currentYear, month - 1, 1),
              lt: new Date(currentYear, month, 1),
            },
          },
        });

        monthlyProgress.push({
          month,
          completed: eventCount > 0,
          eventCount,
        });
      }

      // システム負荷（簡易版）
      const memUsage = process.memoryUsage();
      const systemLoad = {
        cpu: "N/A", // Node.js で正確な CPU 使用率取得は複雑
        memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      };

      this.logger.debug("計算統計取得完了", {
        totalLocations,
        currentYear,
        completedMonths: monthlyProgress.filter((m) => m.completed).length,
      });

      return {
        totalLocations,
        currentYear,
        monthlyProgress,
        systemLoad,
      };
    } catch (error) {
      this.logger.error("計算統計取得エラー", error);
      throw error;
    }
  }
}

// DI コンテナから注入されるため、シングルトンインスタンスは削除
