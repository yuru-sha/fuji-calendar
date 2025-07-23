import { PrismaClient } from '@prisma/client';
import { getComponentLogger } from '../../shared/utils/logger';

const logger = getComponentLogger('prisma');

/**
 * Prismaクライアントのシングルトンインスタンス
 * データベース接続を一元管理
 */
class PrismaClientManager {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaClientManager.instance) {
      PrismaClientManager.instance = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ] as any,
      });

      // ログイベントのハンドリング
      PrismaClientManager.instance.$on('query', (e: any) => {
        logger.debug('Prisma Query', {
          query: e.query,
          params: e.params,
          duration: e.duration,
          target: e.target,
        });
      });

      PrismaClientManager.instance.$on('error', (e: any) => {
        logger.error('Prisma Error', e, {
          target: e.target,
        });
      });

      PrismaClientManager.instance.$on('info', (e: any) => {
        logger.info('Prisma Info', {
          message: e.message,
          target: e.target,
        });
      });

      PrismaClientManager.instance.$on('warn', (e: any) => {
        logger.warn('Prisma Warning', {
          message: e.message,
          target: e.target,
        });
      });

      // タイムゾーンをJSTに設定
      PrismaClientManager.instance.$executeRaw`SET timezone = 'Asia/Tokyo'`.catch((error: any) => {
        logger.warn('PostgreSQLタイムゾーン設定に失敗しました', { error: error.message });
      });
      
      logger.info('Prismaクライアント初期化完了');
    }

    return PrismaClientManager.instance;
  }

  /**
   * データベース接続を閉じる
   */
  static async disconnect(): Promise<void> {
    if (PrismaClientManager.instance) {
      await PrismaClientManager.instance.$disconnect();
      logger.info('Prismaクライアント接続切断完了');
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
      logger.info('データベースタイムゾーン確認', { timezone: currentTimezone });
      
      if (currentTimezone !== 'Asia/Tokyo') {
        logger.warn('データベースタイムゾーンがJSTではありません', { 
          expected: 'Asia/Tokyo', 
          actual: currentTimezone 
        });
      }
      
      logger.info('データベース接続テスト成功');
      return true;
    } catch (error) {
      logger.error('データベース接続テスト失敗', error);
      return false;
    }
  }

  /**
   * トランザクション実行ヘルパー
   */
  static async transaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = PrismaClientManager.getInstance();
    return await client.$transaction(callback as any);
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