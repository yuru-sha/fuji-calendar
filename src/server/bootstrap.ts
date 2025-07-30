import { Express } from 'express';
import path from 'path';
import { getComponentLogger } from '../shared/utils/logger';
import BackgroundJobSchedulerPrisma from './services/BackgroundJobSchedulerPrisma';
import { queueService } from './services/QueueService';

const logger = getComponentLogger('bootstrap');

export interface BootstrapConfig {
  app: Express;
  port: number;
}

export class Bootstrap {
  private static backgroundScheduler: BackgroundJobSchedulerPrisma;

  /**
   * アプリケーションの初期化
   */
  static async initialize(): Promise<void> {
    logger.info('アプリケーション初期化開始');

    // データベース接続
    await this.initializeDatabase();

    // キューサービスの初期化
    await this.initializeQueueService();

    // バックグラウンドジョブスケジューラー
    await this.initializeBackgroundJobs();

    logger.info('アプリケーション初期化完了');
  }

  /**
   * データベース接続の初期化
   */
  private static async initializeDatabase(): Promise<void> {
    logger.info('データベース初期化開始');
    
    const { PrismaClientManager } = await import('./database/prisma');
    const isConnected = await PrismaClientManager.testConnection();
    
    if (!isConnected) {
      throw new Error('Prisma database connection failed');
    }
    
    logger.info('Prisma データベース接続完了');
  }

  /**
   * キューサービスの初期化
   */
  private static async initializeQueueService(): Promise<void> {
    logger.info('キューサービス初期化開始');
    
    try {
      // Redis 接続をテスト
      const isRedisAvailable = await queueService.testRedisConnection();
      
      if (isRedisAvailable) {
        const stats = await queueService.getQueueStats();
        logger.info('キューサービス初期化完了（Redis 利用可能）', {
          status: 'ready',
          redisHost: process.env.REDIS_HOST || 'localhost',
          redisPort: process.env.REDIS_PORT || '6379',
          queueStats: stats
        });
      } else {
        logger.warn('キューサービス初期化完了（Redis 利用不可、直接実行モード）', {
          status: 'fallback',
          redisHost: process.env.REDIS_HOST || 'localhost',
          redisPort: process.env.REDIS_PORT || '6379',
          message: 'バックグラウンド計算は直接実行されます'
        });
      }
    } catch (error) {
      logger.error('キューサービス初期化エラー', error);
      // Redis 利用不可でもアプリケーションは継続
      logger.warn('Redis 利用不可のため、直接実行モードで継続します');
    }
  }

  /**
   * バックグラウンドジョブの初期化
   */
  private static async initializeBackgroundJobs(): Promise<void> {
    this.backgroundScheduler = new BackgroundJobSchedulerPrisma();
    this.backgroundScheduler.start();
    
    logger.info('バックグラウンドジョブスケジューラー開始', {
      activeJobs: ['cache-cleanup', 'statistics-update', 'yearly-maintenance', 'monthly-maintenance'],
      status: this.backgroundScheduler.getStatus()
    });
  }

  /**
   * サーバーの起動
   */
  static async startServer(config: BootstrapConfig): Promise<void> {
    const { app, port } = config;

    try {
      await this.initialize();

      app.listen(Number(port), () => {
        logger.info('サーバー起動完了', {
          port,
          environment: process.env.NODE_ENV || 'development',
          endpoint: `http://localhost:${port}/api`,
          logLevel: process.env.LOG_LEVEL || 'info',
          fileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
          backgroundJobs: this.backgroundScheduler.getStatus()
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
  static async shutdown(): Promise<void> {
    logger.info('グレースフルシャットダウン開始');
    
    if (this.backgroundScheduler) {
      this.backgroundScheduler.stop();
    }
    
    // キューサービスのシャットダウン
    try {
      await queueService.shutdown();
      logger.info('キューサービスシャットダウン完了');
    } catch (error) {
      logger.error('キューサービスシャットダウンエラー', error);
    }
    
    // Prisma 接続のクリーンアップ
    const { PrismaClientManager } = await import('./database/prisma');
    await PrismaClientManager.getInstance().$disconnect();
    
    logger.info('グレースフルシャットダウン完了');
  }

  /**
   * 静的ファイルのパスを取得
   */
  static getStaticPath(): string {
    return path.join(__dirname, '../../dist/client');
  }

  /**
   * フロントエンドの index.html パスを取得
   */
  static getIndexHtmlPath(): string {
    return path.join(__dirname, '../../dist/client/index.html');
  }
}