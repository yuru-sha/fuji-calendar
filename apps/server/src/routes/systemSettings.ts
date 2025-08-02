import { Router, Request, Response } from "express";
import { DIContainer } from "../di/DIContainer";
import { SystemSettingsController } from "../controllers/SystemSettingsController";
import { SystemSettingsService } from "../services/SystemSettingsService";
import { authenticateAdmin } from "../middleware/auth";
import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("SystemSettingsRoutes");

/**
 * システム設定管理ルートファクトリ
 * 管理者のみアクセス可能
 */
export const createSystemSettingsRouter = (container: DIContainer): Router => {
  const router = Router();

  // 認証ミドルウェアを全ルートに適用
  router.use(authenticateAdmin);

  // GET /api/admin/system-settings - 全設定取得
  router.get("/", async (req: Request, res: Response) => {
    try {
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const controller = new SystemSettingsController(systemSettingsService);

      await controller.getAllSettings(req, res);
    } catch (error) {
      logger.error("システム設定取得ルートエラー", error);
      res.status(500).json({
        success: false,
        message: "システム設定の取得に失敗しました",
      });
    }
  });

  // PUT /api/admin/system-settings/:settingKey - 個別設定更新
  router.put("/:settingKey", async (req: Request, res: Response) => {
    try {
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const controller = new SystemSettingsController(systemSettingsService);

      await controller.updateSetting(req, res);
    } catch (error) {
      logger.error("システム設定更新ルートエラー", error, {
        settingKey: req.params.settingKey,
      });
      res.status(500).json({
        success: false,
        message: "システム設定の更新に失敗しました",
      });
    }
  });

  // PUT /api/admin/system-settings - 複数設定一括更新
  router.put("/", async (req: Request, res: Response) => {
    try {
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const controller = new SystemSettingsController(systemSettingsService);

      await controller.updateMultipleSettings(req, res);
    } catch (error) {
      logger.error("システム設定一括更新ルートエラー", error);
      res.status(500).json({
        success: false,
        message: "システム設定の一括更新に失敗しました",
      });
    }
  });

  // POST /api/admin/system-settings/reset - 設定初期化
  router.post("/reset", async (req: Request, res: Response) => {
    try {
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const controller = new SystemSettingsController(systemSettingsService);

      await controller.resetSettings(req, res);
    } catch (error) {
      logger.error("システム設定初期化ルートエラー", error);
      res.status(500).json({
        success: false,
        message: "システム設定の初期化に失敗しました",
      });
    }
  });

  // POST /api/admin/system-settings/clear-cache - キャッシュクリア
  router.post("/clear-cache", async (req: Request, res: Response) => {
    try {
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const controller = new SystemSettingsController(systemSettingsService);

      await controller.clearCache(req, res);
    } catch (error) {
      logger.error("システム設定キャッシュクリアルートエラー", error);
      res.status(500).json({
        success: false,
        message: "キャッシュクリアに失敗しました",
      });
    }
  });

  return router;
};
