import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { getComponentLogger } from "@fuji-calendar/utils";
import { EventService } from "./interfaces/EventService";
import { QueueService as IQueueService } from "./interfaces/QueueService";

const logger = getComponentLogger("queue-service");

/**
 * リファクタリング後の QueueService
 * 依存注入パターンを使用して循環依存を解消
 */
export class QueueService implements IQueueService {
  private redis: IORedis | null = null;
  private eventCalculationQueue: Queue | null = null;
  private worker: Worker | null = null;
  private eventService: EventService | null = null;

  constructor(eventService: EventService | null = null) {
    this.eventService = eventService;
    this.initializeRedis();
  }

  /**
   * EventService を後から注入（循環依存対策）
   */
  setEventService(eventService: EventService): void {
    this.eventService = eventService;
    logger.info("EventService 注入完了", {
      hasEventService: !!eventService,
    });
  }

  /**
   * Redis 接続の初期化
   */
  private initializeRedis(): void {
    // Redis 無効化フラグをチェック
    if (process.env.DISABLE_REDIS === "true") {
      logger.info("Redis 無効化モード: キューシステムは無効化されます");
      return;
    }

    const redisConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      lazyConnect: false, // 即座に接続を確立
    };

    this.redis = new IORedis(redisConfig);

    // Redis 接続エラーハンドリング
    this.redis.on("error", (error) => {
      logger.error("Redis 接続エラー", error);
    });

    this.redis.on("connect", () => {
      logger.info("Redis 接続成功", {
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    this.redis.on("ready", () => {
      logger.info("Redis 準備完了 - キューシステム初期化開始");
      // Redis 準備完了後にキューを初期化
      this.initializeQueue();
    });
  }

  /**
   * キューの初期化
   */
  private initializeQueue(): void {
    if (!this.redis) {
      logger.warn("Redis が無効のため、キューシステムを初期化しません");
      return;
    }

    try {
      // イベント計算キューを作成
      this.eventCalculationQueue = new Queue("event-calculation", {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100, // 完了したジョブを 100 個まで保持
          removeOnFail: 50, // 失敗したジョブを 50 個まで保持
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      // ワーカーを作成
      this.worker = new Worker(
        "event-calculation",
        this.processJob.bind(this),
        {
          connection: this.redis,
          concurrency: parseInt(process.env.WORKER_CONCURRENCY || "3"), // 重い計算のため同時実行数を削減
          stalledInterval: 20 * 60 * 1000, // 20 分で stalled 判定（15 分の計算+バッファ）
          maxStalledCount: 2, // 最大 2 回まで再試行
        },
      );

      const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "3");
      logger.info("ワーカー作成完了", {
        queueName: "event-calculation",
        concurrency,
        stalledInterval: "20 分",
        maxStalledCount: 2,
      });

      // イベントハンドラーをセットアップ
      this.setupWorkerEventHandlers();

      logger.info("キューシステム初期化完了");
    } catch (error) {
      logger.error("キューシステム初期化エラー", error);
    }
  }

  /**
   * 月間天体計算をスケジュール
   */
  async scheduleMonthlyCalculation(
    year: number,
    month: number,
    locationIds: number[],
    priority: "low" | "normal" | "high" = "normal",
  ): Promise<string | null> {
    if (!this.eventCalculationQueue) {
      logger.warn("キューが無効のため、月間計算をスケジュールできません", {
        year,
        month,
      });
      return null;
    }

    try {
      const job = await this.eventCalculationQueue.add(
        "monthly-calculation",
        {
          type: "monthly-calculation",
          year,
          month,
          locationIds,
          timestamp: new Date().toISOString(),
        },
        {
          priority: priority === "high" ? 10 : priority === "normal" ? 5 : 1,
          jobId: `monthly-${year}-${month}`,
          delay: 0,
        },
      );

      logger.info("月間計算ジョブ登録", {
        jobId: job.id,
        year,
        month,
        locationCount: locationIds.length,
        priority,
      });

      return job.id || null;
    } catch (error) {
      logger.error("月間計算ジョブ登録エラー", error, { year, month });
      return null;
    }
  }

  /**
   * キューのジョブを処理
   */
  private async processJob(job: Job): Promise<any> {
    const { type, ...data } = job.data;

    logger.info("ジョブ処理開始", {
      jobId: job.id,
      jobName: job.name,
      type,
      data,
      hasEventService: !!this.eventService,
    });

    try {
      switch (type) {
        case "location":
        case "location-calculation":
          return await this.processLocationCalculation(data);

        case "monthly":
        case "monthly-calculation":
          return await this.processMonthlyCalculation(data);

        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error("ジョブ処理エラー", error, {
        jobId: job.id,
        type,
        data,
      });
      throw error;
    }
  }

  /**
   * 地点計算ジョブの処理
   */
  private async processLocationCalculation(data: {
    locationId: number;
    startYear: number;
    endYear: number;
  }): Promise<any> {
    const { locationId, startYear, endYear } = data;
    logger.info("地点計算処理開始", { locationId, startYear, endYear });

    // 遅延解決で EventService を取得
    const eventService = this.eventService;
    if (!eventService) {
      logger.error("EventService が設定されていません", {
        locationId,
        startYear,
        endYear,
      });
      throw new Error("EventService is not available");
    }

    const results = [];

    for (let year = startYear; year <= endYear; year++) {
      logger.info("年間計算開始", { locationId, year });
      const result = await eventService!.generateLocationCache(
        locationId,
        year,
      );
      logger.info("年間計算完了", {
        locationId,
        year,
        success: result.success,
      });
      results.push(result);
    }

    return {
      success: results.every((r) => r.success),
      results,
      totalEvents: results.reduce((sum, r) => sum + r.eventsGenerated, 0),
    };
  }

  /**
   * 月間計算ジョブの処理
   */
  private async processMonthlyCalculation(data: {
    year: number;
    month: number;
    locationIds: number[];
  }): Promise<any> {
    const { year, month, locationIds } = data;

    // 遅延解決で EventService を取得
    const eventService = this.eventService;
    if (!eventService) {
      logger.error("EventService が設定されていません", {
        year,
        month,
        locationIds,
      });
      throw new Error("EventService is not available");
    }

    const result = await eventService!.calculateMonthlyEvents(
      year,
      month,
      locationIds,
    );

    return {
      success: result.success,
      eventsGenerated: result.eventsGenerated,
      processingTime: result.processingTime,
      errors: result.errors,
    };
  }

  /**
   * キューの統計情報を取得
   */
  async getQueueStats(): Promise<any> {
    if (!this.eventCalculationQueue) {
      return {
        enabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        failedJobs: [],
        message:
          "Redis キューが初期化されていません。Redis サーバーが起動していることを確認してください。",
      };
    }

    try {
      const waiting = await this.eventCalculationQueue.getWaiting();
      const active = await this.eventCalculationQueue.getActive();
      const completed = await this.eventCalculationQueue.getCompleted();
      const failed = await this.eventCalculationQueue.getFailed();

      // 失敗したジョブの詳細を取得
      const failedJobDetails = failed.slice(0, 5).map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      }));

      return {
        enabled: true,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        failedJobs: failedJobDetails,
      };
    } catch (error) {
      logger.error("キュー統計取得エラー", error);
      return {
        enabled: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        failedJobs: [],
        error:
          "Redis 接続エラー。Redis サーバーが起動していることを確認してください。",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Redis 接続テスト
   */
  async testRedisConnection(): Promise<boolean> {
    if (!this.redis) {
      logger.warn("Redis が無効化されています");
      return false;
    }

    try {
      await this.redis.ping();
      logger.debug("Redis ping 成功");
      return true;
    } catch (error) {
      logger.error("Redis ping 失敗", error);
      return false;
    }
  }

  /**
   * 地点計算ジョブをスケジュール
   */
  async scheduleLocationCalculation(
    locationId: number,
    startYear: number,
    endYear: number,
    priority: "low" | "normal" | "high" = "normal",
  ): Promise<string | null> {
    if (!this.eventCalculationQueue) {
      logger.warn(
        "キューが初期化されていません - ジョブをスケジュールできません",
      );
      return null;
    }

    try {
      const jobData = {
        type: "location",
        locationId,
        startYear,
        endYear,
      };

      const job = await this.eventCalculationQueue.add(
        "calculate-location-events",
        jobData,
        {
          priority: this.getPriority(priority),
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      logger.info("地点計算ジョブ追加成功", {
        jobId: job.id,
        locationId,
        years: `${startYear}-${endYear}`,
        priority,
      });

      return job.id?.toString() || null;
    } catch (error) {
      logger.error("地点計算ジョブ追加エラー", {
        locationId,
        years: `${startYear}-${endYear}`,
        error,
      });
      return null;
    }
  }

  /**
   * 優先度を数値に変換
   */
  private getPriority(priority: "low" | "normal" | "high"): number {
    switch (priority) {
      case "high":
        return 10;
      case "normal":
        return 5;
      case "low":
        return 1;
      default:
        return 5;
    }
  }

  /**
   * 失敗したジョブをクリア
   */
  async cleanFailedJobs(olderThanDays: number = 1): Promise<number> {
    if (!this.eventCalculationQueue) {
      return 0;
    }

    try {
      const failed = await this.eventCalculationQueue.getFailed();
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      let cleanedCount = 0;
      for (const job of failed) {
        if (job.timestamp < cutoffTime) {
          await job.remove();
          cleanedCount++;
        }
      }

      logger.info("失敗したジョブをクリア", {
        olderThanDays,
        cleanedCount,
        totalFailed: failed.length,
      });

      return cleanedCount;
    } catch (error) {
      logger.error("失敗したジョブのクリアエラー", error);
      return 0;
    }
  }

  /**
   * ワーカーの同時実行数をリアルタイムで変更
   */
  async updateConcurrency(newConcurrency: number): Promise<boolean> {
    if (!this.worker) {
      logger.warn("ワーカーが初期化されていません");
      return false;
    }

    if (newConcurrency < 1 || newConcurrency > 10) {
      logger.warn("同時実行数は 1-10 の範囲で設定してください", {
        newConcurrency,
      });
      return false;
    }

    try {
      // 現在の設定を記録
      const oldConcurrency = this.worker.opts.concurrency;

      // ワーカーを一時停止
      await this.worker.pause();
      logger.info("ワーカー一時停止完了");

      // 新しいワーカーを作成（古いワーカーは後で削除）
      const oldWorker = this.worker;
      this.worker = new Worker(
        "event-calculation",
        this.processJob.bind(this),
        {
          connection: this.redis!,
          concurrency: newConcurrency,
          stalledInterval: 20 * 60 * 1000, // 20 分で stalled 判定
          maxStalledCount: 2,
        },
      );

      // イベントハンドラーを再設定
      this.setupWorkerEventHandlers();

      // 古いワーカーを閉じる
      await oldWorker.close();

      logger.info("同時実行数変更完了", {
        oldConcurrency,
        newConcurrency,
        queueName: "event-calculation",
      });

      return true;
    } catch (error) {
      logger.error("同時実行数変更エラー", error);
      return false;
    }
  }

  /**
   * 現在の同時実行数を取得
   */
  getCurrentConcurrency(): number {
    return this.worker?.opts.concurrency || 0;
  }

  /**
   * ワーカーイベントハンドラーをセットアップ（共通化）
   */
  private setupWorkerEventHandlers(): void {
    if (!this.worker) return;

    this.worker.on("active", (job: Job) => {
      logger.info("ジョブアクティブ", {
        jobId: job.id,
        jobName: job.name,
        jobData: job.data,
      });
    });

    this.worker.on("completed", (job: Job) => {
      logger.info("ジョブ完了", {
        jobId: job.id,
        jobName: job.name,
        processingTime: job.processedOn
          ? Date.now() - job.processedOn
          : undefined,
      });
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error("ジョブ失敗", error, {
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
      });
    });

    this.worker.on("ready", () => {
      logger.info("ワーカー準備完了", {
        queueName: "event-calculation",
        concurrency: this.worker?.opts.concurrency,
        hasEventService: !!this.eventService,
      });
    });

    this.worker.on("error", (error: Error) => {
      logger.error("ワーカーエラー", error);
    });
  }

  /**
   * リソースの解放
   */
  async shutdown(): Promise<void> {
    logger.info("QueueService シャットダウン開始");

    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    if (this.eventCalculationQueue) {
      await this.eventCalculationQueue.close();
      this.eventCalculationQueue = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    logger.info("QueueService シャットダウン完了");
  }
}
