import * as cron from "node-cron";
import { getComponentLogger } from "@fuji-calendar/utils";
import type { DIContainer } from "../di/DIContainer";

/**
 * バックグラウンドジョブスケジューラー
 * 年次データ更新などの定期実行を管理
 */
export class BackgroundJobScheduler {
  private logger = getComponentLogger("BackgroundJobScheduler");
  private container: DIContainer;
  private scheduledJobs: cron.ScheduledTask[] = [];

  constructor(container: DIContainer) {
    this.container = container;
  }

  /**
   * スケジューラーを開始
   * 注意: この関数は bootstrap.ts で環境変数チェック後に呼ばれる前提
   */
  start(): void {
    this.scheduleYearlyDataGeneration();
    this.scheduleMaintenanceTasks();
    this.logger.info("バックグラウンドジョブスケジューラー開始", {
      nodeEnv: process.env.NODE_ENV,
      enableBackgroundScheduler: process.env.ENABLE_BACKGROUND_SCHEDULER,
    });
  }

  /**
   * 年次データ生成ジョブをスケジュール
   * 毎年 12 月 1 日 AM 2:00 に翌年のデータを生成
   */
  private scheduleYearlyDataGeneration(): void {
    const yearlyJob = cron.schedule(
      "0 2 1 12 *", // 毎年 12 月 1 日 AM 2:00
      async () => {
        await this.executeYearlyDataGeneration();
      },
      {
        timezone: "Asia/Tokyo",
      },
    );

    yearlyJob.start();
    this.scheduledJobs.push(yearlyJob);

    this.logger.info("年次データ生成ジョブをスケジュール", {
      schedule: "毎年 12 月 1 日 AM 2:00 JST",
      timezone: "Asia/Tokyo",
    });
  }

  /**
   * 年次データ生成を実行
   */
  private async executeYearlyDataGeneration(): Promise<void> {
    try {
      const nextYear = new Date().getFullYear() + 1;

      this.logger.info("年次データ生成開始", { targetYear: nextYear });

      const queueService = this.container.resolve("QueueService") as any;
      const locationRepository = this.container.resolve(
        "LocationRepository",
      ) as any;

      // 全地点を取得
      const locations = await locationRepository.findAll();

      let totalJobsScheduled = 0;
      const jobIds = [];

      // 各地点に翌年のデータ生成ジョブを登録
      for (const location of locations) {
        const jobId = await queueService.scheduleLocationCalculation(
          location.id,
          nextYear,
          nextYear,
          "low", // 年次更新は低優先度
        );

        if (jobId) {
          jobIds.push(jobId);
          totalJobsScheduled++;
        }
      }

      this.logger.info("年次データ生成ジョブ登録完了", {
        targetYear: nextYear,
        totalLocations: locations.length,
        totalJobsScheduled,
        estimatedProcessingTime: `約${Math.ceil(totalJobsScheduled / 5)}分`,
      });
    } catch (error) {
      this.logger.error("年次データ生成エラー", error);
    }
  }

  /**
   * メンテナンスタスクをスケジュール
   */
  private scheduleMaintenanceTasks(): void {
    // 毎日 AM 3:00 - データベースクリーンアップ
    const dailyMaintenanceJob = cron.schedule(
      "0 3 * * *", // 毎日 AM 3:00
      async () => {
        await this.executeDailyMaintenance();
      },
      {
        timezone: "Asia/Tokyo",
      },
    );

    // 毎週日曜日 AM 4:00 - 統計情報更新
    const weeklyMaintenanceJob = cron.schedule(
      "0 4 * * 0", // 毎週日曜日 AM 4:00
      async () => {
        await this.executeWeeklyMaintenance();
      },
      {
        timezone: "Asia/Tokyo",
      },
    );

    // 毎月 1 日 AM 5:00 - 古いデータクリーンアップ
    const monthlyMaintenanceJob = cron.schedule(
      "0 5 1 * *", // 毎月 1 日 AM 5:00
      async () => {
        await this.executeMonthlyMaintenance();
      },
      {
        timezone: "Asia/Tokyo",
      },
    );

    dailyMaintenanceJob.start();
    weeklyMaintenanceJob.start();
    monthlyMaintenanceJob.start();

    this.scheduledJobs.push(
      dailyMaintenanceJob,
      weeklyMaintenanceJob,
      monthlyMaintenanceJob,
    );

    this.logger.info("メンテナンスタスクをスケジュール", {
      daily: "毎日 AM 3:00 JST - データベースクリーンアップ",
      weekly: "毎週日曜日 AM 4:00 JST - 統計情報更新",
      monthly: "毎月 1 日 AM 5:00 JST - 古いデータクリーンアップ",
    });
  }

  /**
   * 日次メンテナンス処理
   */
  private async executeDailyMaintenance(): Promise<void> {
    try {
      this.logger.info("日次メンテナンス開始");

      // キューの統計情報をログ出力
      const queueService = this.container.resolve("QueueService") as any;
      const queueStats = await queueService.getQueueStats();

      this.logger.info("キュー統計情報", queueStats);

      // 失敗したジョブのクリーンアップ（7 日以上前）
      const cleanedJobs = await queueService.cleanFailedJobs(7);

      this.logger.info("日次メンテナンス完了", {
        cleanedFailedJobs: cleanedJobs,
      });
    } catch (error) {
      this.logger.error("日次メンテナンスエラー", error);
    }
  }

  /**
   * 週次メンテナンス処理
   */
  private async executeWeeklyMaintenance(): Promise<void> {
    try {
      this.logger.info("週次メンテナンス開始");

      // データベース統計情報の更新
      // PostgreSQL の ANALYZE を実行（パフォーマンス向上）
      // 注: Prisma では直接 SQL を実行

      this.logger.info("週次メンテナンス完了");
    } catch (error) {
      this.logger.error("週次メンテナンスエラー", error);
    }
  }

  /**
   * 月次メンテナンス処理
   */
  private async executeMonthlyMaintenance(): Promise<void> {
    try {
      this.logger.info("月次メンテナンス開始");

      // 3 年以上前の古いイベントデータを削除
      const currentDate = new Date();
      const threeYearsAgo = new Date(currentDate.getFullYear() - 3, 0, 1);

      // 古いデータの削除処理をキューに登録
      const queueService = this.container.resolve("QueueService") as any;

      // 低優先度でデータクリーンアップジョブを登録
      const cleanupJobId = await queueService.scheduleDataCleanup(
        threeYearsAgo,
        "low",
      );

      this.logger.info("月次メンテナンス完了", {
        cleanupJobId,
        cutoffDate: threeYearsAgo.toISOString(),
      });
    } catch (error) {
      this.logger.error("月次メンテナンスエラー", error);
    }
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    this.scheduledJobs.forEach((job) => {
      job.stop();
      job.destroy();
    });
    this.scheduledJobs = [];
    this.logger.info("バックグラウンドジョブスケジューラー停止");
  }

  /**
   * 手動で年次データ生成を実行（テスト用）
   */
  async triggerYearlyDataGeneration(): Promise<void> {
    this.logger.info("手動年次データ生成トリガー");
    await this.executeYearlyDataGeneration();
  }
}
