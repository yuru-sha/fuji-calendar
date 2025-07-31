import { Express } from 'express';
import path from 'path';
import { getComponentLogger } from '@fuji-calendar/utils';
import { DIContainer } from './di/DIContainer';
import { QueueService } from './services/interfaces/QueueService';
import BackgroundJobSchedulerPrisma from './services/BackgroundJobSchedulerPrisma';

const logger = getComponentLogger('bootstrap');

// スケジューラーのインスタンス
let backgroundScheduler: BackgroundJobSchedulerPrisma | null = null;

export interface BootstrapConfig {
  app: Express;
  port: number;
}

export class Bootstrap {
  /**
   * アプリケーションの初期化
   */
  static async initialize(container: DIContainer): Promise<void> {
    logger.info('アプリケーション初期化開始');
    
    // QueueService の Redis 接続テスト
    try {
      const queueService = container.resolve<QueueService>('QueueService');
      const redisConnected = await queueService.testRedisConnection();
      if (redisConnected) {
        logger.info('QueueService Redis 接続成功');
      } else {
        logger.warn('QueueService Redis 接続失敗 - 直接実行モードで動作');
      }
    } catch (error) {
      logger.warn('QueueService 初期化エラー', error);
    }

    // BackgroundJobSchedulerPrisma の開始
    try {
      backgroundScheduler = new BackgroundJobSchedulerPrisma();
      backgroundScheduler.start();
      logger.info('BackgroundJobSchedulerPrisma 開始完了');
    } catch (error) {
      logger.warn('BackgroundJobSchedulerPrisma 開始エラー', error);
    }
    
    logger.info('アプリケーション初期化完了');
  }

  /**
   * サーバーの起動
   */
  static async startServer(config: BootstrapConfig, container: DIContainer): Promise<void> {
    const { app, port } = config;

    try {
      await this.initialize(container);

      app.listen(Number(port), () => {
        logger.info('サーバー起動完了', {
          port,
          environment: process.env.NODE_ENV || 'development',
          endpoint: `http://localhost:${port}/api`
        });
      });
    } catch (error) {
      logger.fatal('サーバー起動失敗', error);
      process.exit(1);
    }
  }

  /**
   * グレースフルシャットダウン
   */
  static async shutdown(container?: DIContainer): Promise<void> {
    logger.info('グレースフルシャットダウン開始');
    
    // QueueService の終了処理
    try {
      if (container) {
        const queueService = container.resolve<QueueService>('QueueService');
        await queueService.shutdown();
        logger.info('QueueService シャットダウン完了');
      }
    } catch (error) {
      logger.error('QueueService シャットダウンエラー', error);
    }

    // BackgroundJobSchedulerPrisma の停止
    try {
      if (backgroundScheduler) {
        backgroundScheduler.stop();
        logger.info('BackgroundJobSchedulerPrisma 停止完了');
      }
    } catch (error) {
      logger.error('BackgroundJobSchedulerPrisma 停止エラー', error);
    }
    
    logger.info('グレースフルシャットダウン完了');
  }

  /**
   * 静的ファイルのパスを取得
   */
  static getStaticPath(): string {
    return path.join(__dirname, '../../../apps/client/dist');
  }

  /**
   * フロントエンドの index.html パスを取得
   */
  static getIndexHtmlPath(): string {
    return path.join(__dirname, '../../../apps/client/dist/index.html');
  }
}