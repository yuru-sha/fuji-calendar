import { Request, Response } from "express";
import { getComponentLogger } from "@fuji-calendar/utils";
import { PrismaClient } from "@prisma/client";
import { QueueService } from "../services/interfaces/QueueService";
import { BackgroundJobScheduler } from "../services/BackgroundJobScheduler";
import { injectable, inject } from "tsyringe";

const logger = getComponentLogger("BackgroundJobController");

@injectable()
export class BackgroundJobController {
  constructor(
    @inject("PrismaClient") private prisma: PrismaClient,
    @inject("QueueService") private queueService: QueueService,
    @inject(BackgroundJobScheduler)
    private backgroundJobScheduler: BackgroundJobScheduler,
  ) {}

  /**
   * バックグラウンドジョブ一覧を取得
   */
  async getBackgroundJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await this.prisma.backgroundJobConfig.findMany({
        orderBy: { id: "asc" },
      });

      const jobsWithStatus = jobs.map((job: any) => ({
        id: job.id,
        name: job.name,
        description: job.description,
        schedule: job.schedule,
        enabled: job.enabled,
        lastRun: job.lastRun?.toISOString(),
        nextRun: job.nextRun?.toISOString(),
        status: this.determineJobStatus(job),
      }));

      res.json({
        enabled: true,
        jobs: jobsWithStatus,
      });

      logger.info("バックグラウンドジョブ一覧取得完了", {
        jobCount: jobs.length,
      });
    } catch (error) {
      logger.error("バックグラウンドジョブ一覧取得エラー", error);
      res.status(500).json({
        enabled: false,
        jobs: [],
        error: "バックグラウンドジョブ情報の取得に失敗しました。",
      });
    }
  }

  /**
   * バックグラウンドジョブの有効/無効を切り替え
   */
  async toggleBackgroundJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        res
          .status(400)
          .json({
            error: "enabled フィールドは boolean である必要があります。",
          });
        return;
      }

      const job = await this.prisma.backgroundJobConfig.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        res.status(404).json({ error: "ジョブが見つかりません。" });
        return;
      }

      await this.prisma.backgroundJobConfig.update({
        where: { id: jobId },
        data: {
          enabled,
          updatedAt: new Date(),
        },
      });

      logger.info("バックグラウンドジョブ設定更新", {
        jobId,
        jobName: job.name,
        enabled,
      });

      res.json({
        success: true,
        message: `${job.name}を${enabled ? "有効" : "無効"}にしました。`,
      });
    } catch (error) {
      logger.error("バックグラウンドジョブ設定更新エラー", error);
      res.status(500).json({ error: "設定の更新に失敗しました。" });
    }
  }

  /**
   * バックグラウンドジョブを手動実行
   */
  async triggerBackgroundJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await this.prisma.backgroundJobConfig.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        res.status(404).json({ error: "ジョブが見つかりません。" });
        return;
      }

      if (!job.enabled) {
        res.status(400).json({ error: "ジョブが無効化されています。" });
        return;
      }

      let success = false;
      let message = "";

      switch (jobId) {
        case "yearly-data-generation":
          await this.backgroundJobScheduler.triggerYearlyDataGeneration();
          success = true;
          message = "年次データ生成ジョブを実行しました。";
          break;

        case "daily-maintenance":
          await this.triggerDailyMaintenance();
          success = true;
          message = "日次メンテナンスを実行しました。";
          break;

        case "weekly-maintenance":
          await this.triggerWeeklyMaintenance();
          success = true;
          message = "週次メンテナンスを実行しました。";
          break;

        case "monthly-maintenance":
          await this.triggerMonthlyMaintenance();
          success = true;
          message = "月次メンテナンスを実行しました。";
          break;

        default:
          res.status(400).json({ error: "不明なジョブタイプです。" });
          return;
      }

      if (success) {
        // ジョブ実行記録を更新
        await this.prisma.backgroundJobConfig.update({
          where: { id: jobId },
          data: {
            lastRun: new Date(),
            runCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        logger.info("バックグラウンドジョブ手動実行完了", {
          jobId,
          jobName: job.name,
        });

        res.json({ success: true, message });
      }
    } catch (error) {
      logger.error("バックグラウンドジョブ手動実行エラー", error);

      // エラー記録を更新
      try {
        await this.prisma.backgroundJobConfig.update({
          where: { id: req.params.jobId },
          data: {
            errorCount: { increment: 1 },
            lastError: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          },
        });
      } catch (updateError) {
        logger.error("エラー記録更新失敗", updateError);
      }

      res.status(500).json({
        success: false,
        error: "ジョブの実行に失敗しました。",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * ジョブの状態を判定
   */
  private determineJobStatus(job: any): "idle" | "running" | "error" {
    // 簡単な判定ロジック（実際のジョブ実行状態は複雑になる可能性がある）
    if (job.lastError && job.errorCount > 0) {
      const errorTime = new Date(job.updatedAt).getTime();
      const now = Date.now();
      // 24 時間以内にエラーがあれば error 状態
      if (now - errorTime < 24 * 60 * 60 * 1000) {
        return "error";
      }
    }

    return "idle"; // 基本的には待機中
  }

  /**
   * 日次メンテナンスを手動実行
   */
  private async triggerDailyMaintenance(): Promise<void> {
    const queueStats = await this.queueService.getQueueStats();
    logger.info("手動日次メンテナンス - キュー統計", queueStats);

    const cleanedJobs = await this.queueService.cleanFailedJobs(7);
    logger.info("手動日次メンテナンス完了", { cleanedFailedJobs: cleanedJobs });
  }

  /**
   * 週次メンテナンスを手動実行
   */
  private async triggerWeeklyMaintenance(): Promise<void> {
    logger.info("手動週次メンテナンス開始");
    // PostgreSQL の ANALYZE を実行（パフォーマンス向上）
    // 実際の実装は必要に応じて追加
    logger.info("手動週次メンテナンス完了");
  }

  /**
   * 月次メンテナンスを手動実行
   */
  private async triggerMonthlyMaintenance(): Promise<void> {
    logger.info("手動月次メンテナンス開始");

    const currentDate = new Date();
    const threeYearsAgo = new Date(currentDate.getFullYear() - 3, 0, 1);

    const cleanupJobId = await (this.queueService as any).scheduleDataCleanup?.(
      threeYearsAgo,
      "low",
    );

    logger.info("手動月次メンテナンス完了", {
      cleanupJobId,
      cutoffDate: threeYearsAgo.toISOString(),
    });
  }
}
