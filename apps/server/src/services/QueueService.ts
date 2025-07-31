import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getComponentLogger } from '@fuji-calendar/utils';
import { EventService } from './interfaces/EventService';
import { QueueService as IQueueService } from './interfaces/QueueService';

const logger = getComponentLogger('queue-service');

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
    logger.info('EventService 注入完了', {
      hasEventService: !!eventService
    });
  }

  /**
   * Redis 接続の初期化
   */
  private initializeRedis(): void {
    // Redis 無効化フラグをチェック
    if (process.env.DISABLE_REDIS === 'true') {
      logger.info('Redis 無効化モード: キューシステムは無効化されます');
      return;
    }

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      lazyConnect: false  // 即座に接続を確立
    };

    this.redis = new IORedis(redisConfig);

    // Redis 接続エラーハンドリング
    this.redis.on('error', (error) => {
      logger.error('Redis 接続エラー', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis 接続成功', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    this.redis.on('ready', () => {
      logger.info('Redis 準備完了 - キューシステム初期化開始');
      // Redis 準備完了後にキューを初期化
      this.initializeQueue();
    });
  }

  /**
   * キューの初期化
   */
  private initializeQueue(): void {
    if (!this.redis) {
      logger.warn('Redis が無効のため、キューシステムを初期化しません');
      return;
    }

    try {
      // イベント計算キューを作成
      this.eventCalculationQueue = new Queue('event-calculation', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // ワーカーを作成
      this.worker = new Worker(
        'event-calculation',
        this.processJob.bind(this),
        { 
          connection: this.redis,
          concurrency: 2 // 同時実行数を制限
        }
      );

      logger.info('ワーカー作成完了', { queueName: 'event-calculation', concurrency: 2 });

      // ワーカーイベントハンドラー
      this.worker.on('active', (job: Job) => {
        logger.info('ジョブアクティブ', {
          jobId: job.id,
          jobName: job.name,
          jobData: job.data
        });
      });
      
      this.worker.on('completed', (job: Job) => {
        logger.info('ジョブ完了', {
          jobId: job.id,
          jobName: job.name,
          processingTime: job.processedOn ? Date.now() - job.processedOn : undefined
        });
      });

      this.worker.on('failed', (job: Job | undefined, error: Error) => {
        logger.error('ジョブ失敗', error, {
          jobId: job?.id,
          jobName: job?.name,
          attemptsMade: job?.attemptsMade,
          maxAttempts: job?.opts.attempts
        });
      });

      this.worker.on('ready', () => {
        logger.info('ワーカー準備完了', { 
          queueName: 'event-calculation',
          hasEventService: !!this.eventService
        });
      });

      this.worker.on('error', (error: Error) => {
        logger.error('ワーカーエラー', error);
      });

      logger.info('キューシステム初期化完了');
    } catch (error) {
      logger.error('キューシステム初期化エラー', error);
    }
  }


  /**
   * 月間天体計算をスケジュール
   */
  async scheduleMonthlyCalculation(
    year: number,
    month: number,
    locationIds: number[],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string | null> {
    if (!this.eventCalculationQueue) {
      logger.warn('キューが無効のため、月間計算をスケジュールできません', { year, month });
      return null;
    }

    try {
      const job = await this.eventCalculationQueue.add(
        'monthly-calculation',
        {
          type: 'monthly-calculation',
          year,
          month,
          locationIds,
          timestamp: new Date().toISOString()
        },
        {
          priority: priority === 'high' ? 10 : priority === 'normal' ? 5 : 1,
          jobId: `monthly-${year}-${month}`,
          delay: 0
        }
      );

      logger.info('月間計算ジョブ登録', {
        jobId: job.id,
        year,
        month,
        locationCount: locationIds.length,
        priority
      });

      return job.id || null;
    } catch (error) {
      logger.error('月間計算ジョブ登録エラー', error, { year, month });
      return null;
    }
  }

  /**
   * キューのジョブを処理
   */
  private async processJob(job: Job): Promise<any> {
    const { type, ...data } = job.data;

    logger.info('ジョブ処理開始', {
      jobId: job.id,
      jobName: job.name,
      type,
      data,
      hasEventService: !!this.eventService
    });

    try {
      switch (type) {
        case 'location':
        case 'location-calculation':
          return await this.processLocationCalculation(data);
        
        case 'monthly':
        case 'monthly-calculation':
          return await this.processMonthlyCalculation(data);
        
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error('ジョブ処理エラー', error, {
        jobId: job.id,
        type,
        data
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
    logger.info('地点計算処理開始', { locationId, startYear, endYear });
    
    if (!this.eventService) {
      logger.error('EventService が注入されていません', {
        locationId,
        startYear,
        endYear
      });
      throw new Error('EventService is not injected');
    }
    
    const results = [];

    for (let year = startYear; year <= endYear; year++) {
      logger.info('年間計算開始', { locationId, year });
      const result = await this.eventService.generateLocationCache(locationId, year);
      logger.info('年間計算完了', { locationId, year, success: result.success });
      results.push(result);
    }

    return {
      success: results.every(r => r.success),
      results,
      totalEvents: results.reduce((sum, r) => sum + r.eventsGenerated, 0)
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
    
    if (!this.eventService) {
      logger.error('EventService が注入されていません', {
        year,
        month,
        locationIds
      });
      throw new Error('EventService is not injected');
    }
    
    const result = await this.eventService.calculateMonthlyEvents(year, month, locationIds);
    
    return {
      success: result.success,
      eventsGenerated: result.eventsGenerated,
      processingTime: result.processingTime,
      errors: result.errors
    };
  }

  /**
   * キューの統計情報を取得
   */
  async getQueueStats(): Promise<any> {
    if (!this.eventCalculationQueue) {
      return { enabled: false };
    }

    try {
      const waiting = await this.eventCalculationQueue.getWaiting();
      const active = await this.eventCalculationQueue.getActive();
      const completed = await this.eventCalculationQueue.getCompleted();
      const failed = await this.eventCalculationQueue.getFailed();

      return {
        enabled: true,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      logger.error('キュー統計取得エラー', error);
      return { enabled: true, error: 'Failed to get stats' };
    }
  }

  /**
   * Redis 接続テスト
   */
  async testRedisConnection(): Promise<boolean> {
    if (!this.redis) {
      logger.warn('Redis が無効化されています');
      return false;
    }

    try {
      await this.redis.ping();
      logger.debug('Redis ping 成功');
      return true;
    } catch (error) {
      logger.error('Redis ping 失敗', error);
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
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string | null> {
    if (!this.eventCalculationQueue) {
      logger.warn('キューが初期化されていません - ジョブをスケジュールできません');
      return null;
    }

    try {
      const jobData = {
        type: 'location',
        locationId,
        startYear,
        endYear
      };

      const job = await this.eventCalculationQueue.add(
        'calculate-location-events',
        jobData,
        {
          priority: this.getPriority(priority),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );

      logger.info('地点計算ジョブ追加成功', {
        jobId: job.id,
        locationId,
        years: `${startYear}-${endYear}`,
        priority
      });

      return job.id?.toString() || null;
    } catch (error) {
      logger.error('地点計算ジョブ追加エラー', {
        locationId,
        years: `${startYear}-${endYear}`,
        error
      });
      return null;
    }
  }

  /**
   * 優先度を数値に変換
   */
  private getPriority(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 10;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  /**
   * リソースの解放
   */
  async shutdown(): Promise<void> {
    logger.info('QueueService シャットダウン開始');

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

    logger.info('QueueService シャットダウン完了');
  }
}

