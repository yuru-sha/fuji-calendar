import { Express, Request, Response } from "express";
import path from "path";
import { getComponentLogger } from "../shared";
import LocationController from "../controllers/LocationController";
import { CalendarController } from "../controllers/CalendarController";
import { AuthController } from "../controllers/AuthController";
import { BackgroundJobController } from "../controllers/BackgroundJobController";
import {
  authenticateAdmin,
  authRateLimit,
  adminApiRateLimit,
} from "../middleware/auth";
import { DIContainer } from "../di/DIContainer";
import { createSystemSettingsRouter } from "./systemSettings";

const serverLogger = getComponentLogger("server");

export function setupRoutes(app: Express, container: DIContainer): void {
  // コントローラーのインスタンス化（DI コンテナから取得）
  const locationController = container.resolve(
    "LocationController",
  ) as LocationController;
  const calendarController = container.resolve(
    "CalendarController",
  ) as CalendarController;
  const authController = container.resolve(
    "AuthController",
  ) as AuthController;
  const backgroundJobController = new BackgroundJobController(container);

  // ヘルスチェック
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.2.0",
    });
  });

  // キュー統計情報
  app.get("/api/queue/stats", async (req: Request, res: Response) => {
    try {
      const queueService = container.resolve("QueueService") as any;
      const stats = await queueService.getQueueStats();
      res.json(stats);
    } catch (error) {
      serverLogger.error("キュー統計取得エラー", error);
      res.status(500).json({ error: "Failed to get queue stats" });
    }
  });

  // 管理者向けキュー管理 API
  app.get(
    "/api/admin/queue/stats",
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const stats = await queueService.getQueueStats();
        res.json(stats);
      } catch (error) {
        serverLogger.error("管理者キュー統計取得エラー", error);
        res.status(500).json({ error: "Failed to get queue stats" });
      }
    },
  );

  // 同時実行数の取得
  app.get(
    "/api/admin/queue/concurrency",
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const currentConcurrency = queueService.getCurrentConcurrency();

        res.json({
          success: true,
          data: {
            concurrency: currentConcurrency,
            maxConcurrency: 10,
            minConcurrency: 1,
          },
        });
      } catch (error) {
        serverLogger.error("同時実行数取得エラー", error);
        res.status(500).json({ error: "Failed to get concurrency" });
      }
    },
  );

  // 同時実行数のリアルタイム変更
  app.put(
    "/api/admin/queue/concurrency",
    authenticateAdmin,
    adminApiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const { concurrency } = req.body;

        if (!concurrency || typeof concurrency !== "number") {
          return res.status(400).json({
            success: false,
            message: "同時実行数は数値で指定してください",
          });
        }

        if (concurrency < 1 || concurrency > 10) {
          return res.status(400).json({
            success: false,
            message: "同時実行数は 1-10 の範囲で指定してください",
          });
        }

        const oldConcurrency = queueService.getCurrentConcurrency();
        const success = await queueService.updateConcurrency(concurrency);

        if (success) {
          serverLogger.info("同時実行数変更成功", {
            oldConcurrency,
            newConcurrency: concurrency,
            requestedBy: (req as any).admin?.username,
          });

          res.json({
            success: true,
            message: "同時実行数を変更しました",
            data: {
              oldConcurrency,
              newConcurrency: concurrency,
            },
          });
        } else {
          res.status(500).json({
            success: false,
            message: "同時実行数の変更に失敗しました",
          });
        }
      } catch (error) {
        serverLogger.error("同時実行数変更エラー", error);
        res.status(500).json({ error: "Failed to update concurrency" });
      }
    },
  );

  // バックグラウンドジョブ管理 API
  app.get(
    "/api/admin/background-jobs",
    authenticateAdmin,
    backgroundJobController.getBackgroundJobs.bind(backgroundJobController),
  );
  app.post(
    "/api/admin/background-jobs/:jobId/toggle",
    authenticateAdmin,
    adminApiRateLimit,
    backgroundJobController.toggleBackgroundJob.bind(backgroundJobController),
  );
  app.post(
    "/api/admin/background-jobs/:jobId/trigger",
    authenticateAdmin,
    adminApiRateLimit,
    backgroundJobController.triggerBackgroundJob.bind(backgroundJobController),
  );

  // 失敗したジョブをクリア
  app.post(
    "/api/admin/queue/clear-failed",
    authenticateAdmin,
    adminApiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const { olderThanDays = 0 } = req.body; // デフォルト 0 で全ての失敗ジョブをクリア

        const cleanedCount = await queueService.cleanFailedJobs(olderThanDays);

        serverLogger.info("管理者による失敗ジョブクリア", {
          cleanedCount,
          olderThanDays,
          requestedBy: (req as any).admin?.username,
        });

        res.json({
          success: true,
          message: `${cleanedCount} 個の失敗したジョブをクリアしました`,
          cleanedCount,
        });
      } catch (error) {
        serverLogger.error("失敗ジョブクリアエラー", error);
        res.status(500).json({ error: "Failed to clean failed jobs" });
      }
    },
  );

  // 地点の再計算ジョブを手動で追加
  app.post(
    "/api/admin/queue/recalculate-location",
    authenticateAdmin,
    adminApiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const { locationId, startYear, endYear, priority = "high" } = req.body;

        if (!locationId || !startYear || !endYear) {
          return res
            .status(400)
            .json({ error: "locationId, startYear, endYear are required" });
        }

        const jobId = await queueService.scheduleLocationCalculation(
          locationId,
          startYear,
          endYear,
          priority,
        );

        serverLogger.info("管理者による地点再計算ジョブ追加", {
          locationId,
          startYear,
          endYear,
          priority,
          jobId,
          requestedBy: (req as any).admin?.username,
        });

        res.json({
          success: true,
          message: `地点${locationId}の${startYear}-${endYear}年の再計算ジョブを追加しました`,
          jobId,
        });
      } catch (error) {
        serverLogger.error("地点再計算ジョブ追加エラー", error);
        res
          .status(500)
          .json({ error: "Failed to schedule location calculation" });
      }
    },
  );

  // 撮影地点 API
  app.get(
    "/api/locations",
    locationController.getLocations.bind(locationController),
  );
  app.get(
    "/api/locations/:id",
    locationController.getLocation.bind(locationController),
  );
  app.post(
    "/api/locations",
    locationController.createLocation.bind(locationController),
  );
  app.put(
    "/api/locations/:id",
    locationController.updateLocation.bind(locationController),
  );
  app.delete(
    "/api/locations/:id",
    locationController.deleteLocation.bind(locationController),
  );

  // イベント API
  app.get(
    "/api/calendar/:year/:month",
    calendarController.getMonthlyCalendar.bind(calendarController),
  );
  app.get(
    "/api/events/:date",
    calendarController.getDayEvents.bind(calendarController),
  );
  app.get(
    "/api/events/upcoming",
    calendarController.getUpcomingEvents.bind(calendarController),
  );
  app.get(
    "/api/calendar/location/:locationId/:year",
    calendarController.getLocationYearlyEvents.bind(calendarController),
  );
  app.get(
    "/api/calendar/stats/:year",
    calendarController.getCalendarStats.bind(calendarController),
  );

  // 認証 API
  app.post(
    "/api/auth/login",
    authRateLimit,
    authController.login.bind(authController),
  );
  app.post(
    "/api/auth/logout",
    authRateLimit,
    authController.logout.bind(authController),
  );
  app.get(
    "/api/auth/verify",
    authRateLimit,
    authController.verifyToken.bind(authController),
  );
  app.post(
    "/api/auth/change-password",
    authRateLimit,
    authenticateAdmin,
    authController.changePassword.bind(authController),
  );

  // 管理者向け一括再計算（キューベース処理）
  app.post(
    "/api/admin/regenerate-all",
    authenticateAdmin,
    adminApiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const locationRepository = container.resolve(
          "LocationRepository",
        ) as any;
        const { years } = req.body;

        // デフォルトで 2024-2026 年を対象
        const targetYears = years || [2024, 2025, 2026];

        serverLogger.info("キューベース一括再計算開始", {
          targetYears,
          requestedBy: (req as any).admin?.username,
        });

        // 全地点を取得
        const locations = await locationRepository.findAll();

        // 各地点・各年をキューに登録（並列実行）
        const jobPromises = [];
        for (const location of locations) {
          for (const year of targetYears) {
            jobPromises.push(
              queueService.scheduleLocationCalculation(
                location.id,
                year,
                year,
                "high", // 管理者による一括処理は高優先度
              )
            );
          }
        }

        // 並列でジョブを登録
        const jobIds = await Promise.all(jobPromises);
        const totalJobsScheduled = jobIds.filter(id => id !== null).length;

        serverLogger.info("キューベース一括再計算ジョブ登録完了", {
          targetYears,
          totalLocations: locations.length,
          totalJobsScheduled,
          estimatedProcessingTime: `約${Math.ceil(totalJobsScheduled / 5)}分`,
        });

        res.json({
          success: true,
          message: `全${locations.length}地点・${targetYears.length}年分の計算ジョブをキューに登録しました`,
          totalLocations: locations.length,
          totalJobsScheduled,
          targetYears,
          jobIds: jobIds.slice(0, 10), // 最初の 10 件のみ表示
          estimatedProcessingTime: `約${Math.ceil(totalJobsScheduled / 5)}分`,
        });
      } catch (error) {
        serverLogger.error("キューベース一括再計算エラー", error);
        res.status(500).json({
          error: "キューベース一括再計算中にエラーが発生しました",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // 初期セットアップ用（本番環境では無効化推奨）
  if (process.env.NODE_ENV === "development") {
    // app.post('/api/auth/create-admin', authController.createAdmin.bind(authController)); // TODO: createAdmin メソッドを実装
  }

  // 管理者用 API（認証必須）
  app.post(
    "/api/admin/locations",
    adminApiRateLimit,
    authenticateAdmin,
    locationController.createLocation.bind(locationController),
  );
  app.put(
    "/api/admin/locations/:id",
    adminApiRateLimit,
    authenticateAdmin,
    locationController.updateLocation.bind(locationController),
  );
  app.delete(
    "/api/admin/locations/:id",
    adminApiRateLimit,
    authenticateAdmin,
    locationController.deleteLocation.bind(locationController),
  );
  // Export/Import 機能
  app.get(
    "/api/admin/locations/export",
    adminApiRateLimit,
    authenticateAdmin,
    locationController.exportLocations.bind(locationController),
  );
  app.post(
    "/api/admin/locations/import",
    adminApiRateLimit,
    authenticateAdmin,
    locationController.importLocations.bind(locationController),
  );

  // システム設定管理 API
  app.use(
    "/api/admin/system-settings",
    adminApiRateLimit,
    createSystemSettingsRouter(container),
  );

  // パフォーマンス設定 API
  app.get(
    "/api/admin/performance-settings",
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const currentConcurrency = queueService.getCurrentConcurrency();

        res.json({
          success: true,
          settings: {
            concurrency: currentConcurrency,
            maxConcurrency: 10,
            minConcurrency: 1,
            cacheEnabled: true,
            batchSize: 100,
          },
        });
      } catch (error) {
        serverLogger.error("パフォーマンス設定取得エラー", error);
        res.status(500).json({ error: "Failed to get performance settings" });
      }
    },
  );

  // キュー統計 API
  app.get(
    "/api/admin/queue-stats",
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const queueService = container.resolve("QueueService") as any;
        const stats = await queueService.getQueueStats();
        res.json(stats);
      } catch (error) {
        serverLogger.error("キュー統計取得エラー", error);
        res.status(500).json({ error: "Failed to get queue stats" });
      }
    },
  );

  // SPA 用のフォールバック（本番環境）
  if (process.env.NODE_ENV === "production") {
    app.get("*", (req: Request, res: Response) => {
      const indexPath = path.join(
        __dirname,
        "../../../apps/client/dist/index.html",
      );
      res.sendFile(indexPath);
    });
  }

  // 404 ハンドリング
  app.use((req: Request, res: Response) => {
    serverLogger.warn("404 - ページが見つかりません", {
      url: req.url,
      method: req.method,
    });
    res.status(404).json({ error: "Not Found" });
  });
}
