import { PrismaClient } from '@prisma/client';
import { getComponentLogger } from '../../shared/utils/logger';

const logger = getComponentLogger('prisma');

/**
 * Prisma クライアントのシングルトンインスタンス
 * データベース接続を一元管理
 */
class PrismaClientManager {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaClientManager.instance) {
      try {
        PrismaClientManager.instance = new PrismaClient({
          log: ['query', 'error', 'info', 'warn'],
          // 🔧 接続プール最適化設定
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
          // Prisma 接続プール設定は環境変数で管理
        });
      } catch (error) {
        logger.error('Prisma クライアント初期化エラー', error);
        throw error;
      }

      // ログイベントのハンドリングは簡略化
      // 詳細なログが必要な場合は後で追加

      // タイムゾーンを JST に設定
      PrismaClientManager.instance.$executeRaw`SET timezone = 'Asia/Tokyo'`.catch((error: any) => {
        logger.warn('PostgreSQL タイムゾーン設定に失敗しました', { error: error.message });
      });

      // 接続プール統計ログ
      logger.info('Prisma クライアント初期化完了', {
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
        poolTimeout: `${parseInt(process.env.DB_POOL_TIMEOUT || '20')}s`,
        databaseUrl: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@') // パスワードをマスク
      });
    }

    return PrismaClientManager.instance;
  }

  /**
   * データベース接続を閉じる
   */
  static async disconnect(): Promise<void> {
    if (PrismaClientManager.instance) {
      await PrismaClientManager.instance.$disconnect();
      logger.info('Prisma クライアント接続切断完了');
    }
  }

  /**
   * データベース接続をテスト
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = PrismaClientManager.getInstance();

      // 基本的な接続テスト
      await client.$queryRaw`SELECT 1 as test`;

      // タイムゾーン確認
      const timezoneResult = await client.$queryRaw`SHOW timezone` as any[];
      const currentTimezone = timezoneResult[0]?.TimeZone || 'unknown';
      
      // 接続プール統計取得
      const connectionStats = await client.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];

      logger.info('データベース接続テスト成功', { 
        timezone: currentTimezone,
        connectionStats: connectionStats[0] || {}
      });

      if (currentTimezone !== 'Asia/Tokyo') {
        logger.warn('データベースタイムゾーンが JST ではありません', {
          expected: 'Asia/Tokyo',
          actual: currentTimezone
        });
      }

      return true;
    } catch (error) {
      logger.error('データベース接続テスト失敗', error);
      return false;
    }
  }

  /**
   * 接続プール統計を取得
   */
  static async getConnectionPoolStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  }> {
    try {
      const client = PrismaClientManager.getInstance();
      
      const [poolStats, settings] = await Promise.all([
        client.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        ` as Promise<any[]>,
        client.$queryRaw`SHOW max_connections` as Promise<any[]>
      ]);

      const stats = poolStats[0] || {};
      const maxConnections = parseInt(settings[0]?.max_connections || '100');

      return {
        totalConnections: parseInt(stats.total_connections || '0'),
        activeConnections: parseInt(stats.active_connections || '0'),
        idleConnections: parseInt(stats.idle_connections || '0'),
        maxConnections
      };
    } catch (error) {
      logger.error('接続プール統計取得エラー', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        maxConnections: 0
      };
    }
  }

  /**
   * トランザクション実行ヘルパー
   */
  static async transaction<T>(
    callback: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    const client = PrismaClientManager.getInstance();
    return await client.$transaction(callback, {
      // トランザクションタイムアウト設定
      timeout: 30000, // 30 秒
      maxWait: 5000,   // 5 秒
    });
  }

  /**
   * 定期的なヘルスチェック
   */
  static async healthCheck(): Promise<{
    isHealthy: boolean;
    connectionPool: any;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      const [isConnected, poolStats] = await Promise.all([
        this.testConnection(),
        this.getConnectionPoolStats()
      ]);

      const latency = Date.now() - startTime;

      return {
        isHealthy: isConnected,
        connectionPool: poolStats,
        latency
      };
    } catch (error) {
      logger.error('データベースヘルスチェック失敗', error);
      return {
        isHealthy: false,
        connectionPool: null,
        latency: Date.now() - startTime
      };
    }
  }
}

// デフォルトエクスポート（既存コードとの互換性のため）
export const prisma = PrismaClientManager.getInstance();

// 管理用エクスポート
export { PrismaClientManager };

// アプリケーション終了時のクリーンアップ設定
process.on('beforeExit', async () => {
  await PrismaClientManager.disconnect();
});

process.on('SIGINT', async () => {
  await PrismaClientManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await PrismaClientManager.disconnect();
  process.exit(0);
});