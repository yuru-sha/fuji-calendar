#!/usr/bin/env node

/**
 * 富士カレンダー キューワーカープロセス
 * 
 * このファイルは独立したワーカープロセスとして実行され、
 * BullMQキューから天体計算ジョブを取得して処理します。
 * 
 * 使用方法:
 * npm run worker
 * または
 * node dist/server/worker.js
 */

import { queueService } from './services/QueueService';
import { getComponentLogger } from '../shared/utils/logger';

const logger = getComponentLogger('queue-worker');

// プロセス終了時のクリーンアップ
const cleanup = async (signal: string) => {
  logger.info(`${signal} シグナル受信 - ワーカーを安全に終了中...`);
  
  try {
    await queueService.shutdown();
    logger.info('キューサービス終了完了');
    process.exit(0);
  } catch (error) {
    logger.error('キューサービス終了エラー', error);
    process.exit(1);
  }
};

// シグナルハンドラーの登録
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));

// 未処理の例外とPromise拒否のハンドリング
process.on('uncaughtException', (error) => {
  logger.error('未処理の例外が発生しました', error);
  cleanup('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否が発生しました', {
    reason,
    promise: promise.toString()
  });
  cleanup('UNHANDLED_REJECTION');
});

// メイン処理
async function main() {
  try {
    logger.info('富士カレンダー キューワーカー開始', {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memory: process.memoryUsage()
    });

    // 環境変数チェック
    const requiredEnvVars = ['REDIS_HOST', 'REDIS_PORT'];
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`必要な環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
    }

    logger.info('環境設定確認完了', {
      redisHost: process.env.REDIS_HOST,
      redisPort: process.env.REDIS_PORT,
      nodeEnv: process.env.NODE_ENV || 'development'
    });

    // キューサービスは constructor で自動的にワーカーを開始
    logger.info('キューワーカーが正常に開始されました');
    
    // 定期的なヘルスチェック（5分ごと）
    const healthCheckInterval = setInterval(async () => {
      try {
        const stats = await queueService.getQueueStats();
        logger.info('ワーカーヘルスチェック', {
          locationQueue: stats.location,
          monthlyQueue: stats.monthly,
          dailyQueue: stats.daily,
          historicalQueue: stats.historical,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        });
      } catch (error) {
        logger.error('ヘルスチェックエラー', error);
      }
    }, 5 * 60 * 1000); // 5分

    // プロセス終了時にインターバルをクリア
    process.on('exit', () => {
      clearInterval(healthCheckInterval);
    });

    // ワーカーを無限に実行（シグナルで終了するまで）
    await new Promise((resolve) => {
      // プロセスが終了するまで待機
      process.on('exit', resolve);
    });

  } catch (error) {
    logger.error('ワーカー初期化エラー', error);
    process.exit(1);
  }
}

// プロセス開始
if (require.main === module) {
  main().catch((error) => {
    logger.error('ワーカーでUnexpectedエラーが発生しました', error);
    process.exit(1);
  });
}

export default main;