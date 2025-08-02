import { Express } from "express";
import path from "path";
import { getComponentLogger } from "@fuji-calendar/utils";
import { DIContainer } from "./di/DIContainer";
import { QueueService } from "./services/interfaces/QueueService";
const logger = getComponentLogger("bootstrap");

export interface BootstrapConfig {
  app: Express;
  port: number;
}

export class Bootstrap {
  /**
   * アプリケーションの初期化
   */
  static async initialize(container: DIContainer): Promise<void> {
    logger.info("アプリケーション初期化開始");

    // QueueService の Redis 接続テスト
    try {
      const queueService = container.resolve<QueueService>("QueueService");
      const redisConnected = await queueService.testRedisConnection();
      if (redisConnected) {
        logger.info("QueueService Redis 接続成功");
      } else {
        logger.warn("QueueService Redis 接続失敗 - 直接実行モードで動作");
      }
    } catch (error) {
      logger.warn("QueueService 初期化エラー", error);
    }

    // BackgroundJobScheduler を初期化（本番環境でのみ開始）
    try {
      const { BackgroundJobScheduler } = await import(
        "./services/BackgroundJobScheduler"
      );
      const backgroundJobScheduler = new BackgroundJobScheduler(container);
      
      // 環境変数 ENABLE_BACKGROUND_SCHEDULER で制御（デフォルト: false）
      const enableScheduler = process.env.ENABLE_BACKGROUND_SCHEDULER === 'true';
      if (enableScheduler) {
        backgroundJobScheduler.start();
        logger.info("BackgroundJobScheduler 開始", {
          enableScheduler,
          nodeEnv: process.env.NODE_ENV,
        });
      } else {
        logger.info("BackgroundJobScheduler 初期化のみ（ENABLE_BACKGROUND_SCHEDULER により無効）", {
          enableScheduler,
          nodeEnv: process.env.NODE_ENV,
        });
      }

      // ファクトリー関数として登録
      container.register(
        "BackgroundJobScheduler",
        () => backgroundJobScheduler,
      );
      logger.info("BackgroundJobScheduler 初期化完了");
    } catch (error) {
      logger.warn("BackgroundJobScheduler 初期化エラー", error);
    }

    logger.info("アプリケーション初期化完了");
  }

  /**
   * サーバーの起動
   */
  static async startServer(
    config: BootstrapConfig,
    container: DIContainer,
  ): Promise<void> {
    const { app, port } = config;

    try {
      await this.initialize(container);

      app.listen(Number(port), () => {
        logger.info("サーバー起動完了", {
          port,
          environment: process.env.NODE_ENV || "development",
          endpoint: `http://localhost:${port}/api`,
        });
      });
    } catch (error) {
      logger.fatal("サーバー起動失敗", error);
      process.exit(1);
    }
  }

  /**
   * グレースフルシャットダウン
   */
  static async shutdown(container?: DIContainer): Promise<void> {
    logger.info("グレースフルシャットダウン開始");

    // QueueService の終了処理
    try {
      if (container) {
        const queueService = container.resolve<QueueService>("QueueService");
        await queueService.shutdown();
        logger.info("QueueService シャットダウン完了");
      }
    } catch (error) {
      logger.error("QueueService シャットダウンエラー", error);
    }

    // BackgroundJobScheduler の終了処理
    try {
      if (container) {
        const backgroundJobScheduler = container.resolve(
          "BackgroundJobScheduler",
        ) as any;
        if (
          backgroundJobScheduler &&
          typeof backgroundJobScheduler.stop === "function"
        ) {
          backgroundJobScheduler.stop();
          logger.info("BackgroundJobScheduler シャットダウン完了");
        }
      }
    } catch (error) {
      logger.error("BackgroundJobScheduler シャットダウンエラー", error);
    }

    logger.info("グレースフルシャットダウン完了");
  }

  /**
   * 静的ファイルのパスを取得
   */
  static getStaticPath(): string {
    return path.join(__dirname, "../../../apps/client/dist");
  }

  /**
   * フロントエンドの index.html パスを取得
   */
  static getIndexHtmlPath(): string {
    return path.join(__dirname, "../../../apps/client/dist/index.html");
  }
}
