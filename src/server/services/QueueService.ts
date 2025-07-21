import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

import { getComponentLogger } from '../../shared/utils/logger';

import { BatchCalculationService } from './BatchCalculationService';

import { HistoricalEventsModel } from '../models/HistoricalEvents';

const logger = getComponentLogger('queue-service');

// Redis接続設定
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Redis接続インスタンス
const redisConnection = new IORedis(redisConfig);

export interface LocationCalculationJob {
  locationId: number;
  startYear: number;
  endYear: number;
  priority: 'high' | 'medium' | 'low';
  requestId?: string;
}

export interface MonthlyCalculationJob {
  locationId: number;
  year: number;
  month: number;
  priority: 'high' | 'medium' | 'low';
  requestId?: string;
}

export interface DailyCalculationJob {
  locationId: number;
  year: number;
  month: number;
  day: number;
  priority: 'high' | 'medium' | 'low';
  requestId?: string;
}

export interface HistoricalCalculationJob {
  locationId: number;
  startYear: number;
  endYear: number;
  priority: 'high' | 'medium' | 'low';
  requestId?: string;
}

export class QueueService {
  private locationQueue: Queue<LocationCalculationJob>;
  private monthlyQueue: Queue<MonthlyCalculationJob>;
  private dailyQueue: Queue<DailyCalculationJob>;
  private historicalQueue: Queue<HistoricalCalculationJob>;
  private batchService: BatchCalculationService;
  private historicalModel: HistoricalEventsModel;
  private workers: Worker[] = [];

  constructor() {
    // キューの初期化
    this.locationQueue = new Queue('location-calculation', { connection: redisConnection });
    this.monthlyQueue = new Queue('monthly-calculation', { connection: redisConnection });
    this.dailyQueue = new Queue('daily-calculation', { connection: redisConnection });
    this.historicalQueue = new Queue('historical-calculation', { connection: redisConnection });
    
    this.batchService = new BatchCalculationService();
    this.historicalModel = new HistoricalEventsModel();
    
    this.initializeWorkers();
    
    logger.info('Queue service initialized', {
      queues: ['location-calculation', 'monthly-calculation', 'daily-calculation', 'historical-calculation']
    });
  }

  private initializeWorkers(): void {
    // 地点全体計算ワーカー（低並行度）
    const locationWorker = new Worker(
      'location-calculation',
      this.processLocationCalculation.bind(this),
      {
        connection: redisConnection,
        concurrency: 1, // 同時実行1件のみ
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      }
    );

    // 月間計算ワーカー（中並行度）
    const monthlyWorker = new Worker(
      'monthly-calculation',
      this.processMonthlyCalculation.bind(this),
      {
        connection: redisConnection,
        concurrency: 2, // 同時実行2件
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

    // 日別計算ワーカー（高並行度）
    const dailyWorker = new Worker(
      'daily-calculation',
      this.processDailyCalculation.bind(this),
      {
        connection: redisConnection,
        concurrency: 4, // 同時実行4件
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      }
    );

    // 過去データ計算ワーカー（低並行度、長時間ジョブ）
    const historicalWorker = new Worker(
      'historical-calculation',
      this.processHistoricalCalculation.bind(this),
      {
        connection: redisConnection,
        concurrency: 1, // 同時実行1件のみ
        removeOnComplete: { count: 5 },
        removeOnFail: { count: 20 },
      }
    );

    this.workers = [locationWorker, monthlyWorker, dailyWorker, historicalWorker];

    // ワーカーイベントリスナー
    this.workers.forEach((worker) => {
      worker.on('completed', (job) => {
        logger.info('Job completed', {
          jobId: job.id,
          queue: worker.name,
          duration: job.finishedOn! - job.processedOn!,
        });
      });

      worker.on('failed', (job, err) => {
        logger.error('Job failed', err, {
          jobId: job?.id,
          queue: worker.name,
          attempts: job?.attemptsMade,
        });
      });

      worker.on('stalled', (jobId) => {
        logger.warn('Job stalled', {
          jobId,
          queue: worker.name,
        });
      });
    });
  }

  /**
   * 新しい地点の全期間計算をキューに追加
   */
  async scheduleLocationCalculation(
    locationId: number,
    startYear: number = new Date().getFullYear(),
    endYear: number = new Date().getFullYear() + 2,
    priority: 'high' | 'medium' | 'low' = 'medium',
    requestId?: string
  ): Promise<string> {
    const job = await this.locationQueue.add(
      'calculate-location',
      {
        locationId,
        startYear,
        endYear,
        priority,
        requestId,
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 5 },
        removeOnFail: { count: 10 },
      }
    );

    logger.info('Location calculation job scheduled', {
      jobId: job.id,
      locationId,
      startYear,
      endYear,
      priority,
      requestId,
    });

    return job.id!;
  }

  /**
   * 月間計算をキューに追加
   */
  async scheduleMonthlyCalculation(
    locationId: number,
    year: number,
    month: number,
    priority: 'high' | 'medium' | 'low' = 'high',
    requestId?: string
  ): Promise<string> {
    const job = await this.monthlyQueue.add(
      'calculate-monthly',
      {
        locationId,
        year,
        month,
        priority,
        requestId,
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 20 },
      }
    );

    logger.info('Monthly calculation job scheduled', {
      jobId: job.id,
      locationId,
      year,
      month,
      priority,
      requestId,
    });

    return job.id!;
  }

  /**
   * 日別計算をキューに追加
   */
  async scheduleDailyCalculation(
    locationId: number,
    year: number,
    month: number,
    day: number,
    priority: 'high' | 'medium' | 'low' = 'high',
    requestId?: string
  ): Promise<string> {
    const job = await this.dailyQueue.add(
      'calculate-daily',
      {
        locationId,
        year,
        month,
        day,
        priority,
        requestId,
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: 50,
      }
    );

    logger.info('Daily calculation job scheduled', {
      jobId: job.id,
      locationId,
      year,
      month,
      day,
      priority,
      requestId,
    });

    return job.id!;
  }

  /**
   * 地点計算ジョブの処理
   */
  private async processLocationCalculation(job: Job<LocationCalculationJob>): Promise<void> {
    const { locationId, startYear, endYear, requestId } = job.data;
    
    logger.info('Starting location calculation', {
      jobId: job.id,
      locationId,
      startYear,
      endYear,
      requestId,
    });

    try {
      // 年毎に分割して実行
      for (let year = startYear; year <= endYear; year++) {
        await job.updateProgress({
          currentYear: year,
          totalYears: endYear - startYear + 1,
          completedYears: year - startYear,
        });

        // 年間計算（月ごとに分割）
        for (let month = 1; month <= 12; month++) {
          await this.batchService.calculateMonthlyEvents(year, month, [locationId]);
        }
        
        logger.info('Year calculation completed', {
          jobId: job.id,
          locationId,
          year,
          progress: `${year - startYear + 1}/${endYear - startYear + 1}`,
        });
      }

      logger.info('Location calculation completed', {
        jobId: job.id,
        locationId,
        totalYears: endYear - startYear + 1,
      });

    } catch (error) {
      logger.error('Location calculation failed', error, {
        jobId: job.id,
        locationId,
        startYear,
        endYear,
      });
      throw error;
    }
  }

  /**
   * 月間計算ジョブの処理
   */
  private async processMonthlyCalculation(job: Job<MonthlyCalculationJob>): Promise<void> {
    const { locationId, year, month, requestId } = job.data;
    
    logger.info('Starting monthly calculation', {
      jobId: job.id,
      locationId,
      year,
      month,
      requestId,
    });

    try {
      await this.batchService.calculateMonthlyEvents(year, month, [locationId]);
      
      logger.info('Monthly calculation completed', {
        jobId: job.id,
        locationId,
        year,
        month,
      });

    } catch (error) {
      logger.error('Monthly calculation failed', error, {
        jobId: job.id,
        locationId,
        year,
        month,
      });
      throw error;
    }
  }

  /**
   * 日別計算ジョブの処理
   */
  private async processDailyCalculation(job: Job<DailyCalculationJob>): Promise<void> {
    const { locationId, year, month, day, requestId } = job.data;
    
    logger.info('Starting daily calculation', {
      jobId: job.id,
      locationId,
      year,
      month,
      day,
      requestId,
    });

    try {
      await this.batchService.calculateDayEvents(year, month, day, [locationId]);
      
      logger.info('Daily calculation completed', {
        jobId: job.id,
        locationId,
        year,
        month,
        day,
      });

    } catch (error) {
      logger.error('Daily calculation failed', error, {
        jobId: job.id,
        locationId,
        year,
        month,
        day,
      });
      throw error;
    }
  }

  /**
   * 過去データ計算ジョブの処理
   */
  private async processHistoricalCalculation(job: Job<HistoricalCalculationJob>): Promise<void> {
    const { locationId, startYear, endYear, requestId } = job.data;
    
    logger.info('Starting historical calculation', {
      jobId: job.id,
      locationId,
      startYear,
      endYear,
      yearSpan: endYear - startYear + 1,
      requestId,
    });

    try {
      let processedYears = 0;
      const totalYears = endYear - startYear + 1;

      // 年毎に分割して実行（古い年から新しい年へ）
      for (let year = startYear; year <= endYear; year++) {
        await job.updateProgress({
          currentYear: year,
          totalYears,
          processedYears,
          phase: 'calculating'
        });

        // その年のデータを計算
        // 年間計算（月ごとに分割）
        for (let month = 1; month <= 12; month++) {
          await this.batchService.calculateMonthlyEvents(year, month, [locationId]);
        }

        // 計算結果をhistoricalテーブルに保存
        await this.historicalModel.archiveEventsFromCache(year);

        processedYears++;

        logger.info('Historical year calculation completed', {
          jobId: job.id,
          locationId,
          year,
          progress: `${processedYears}/${totalYears}`,
        });

        // 進捗更新
        await job.updateProgress({
          currentYear: year,
          totalYears,
          processedYears,
          phase: 'archived'
        });
      }

      logger.info('Historical calculation completed', {
        jobId: job.id,
        locationId,
        startYear,
        endYear,
        totalYears,
      });

    } catch (error) {
      logger.error('Historical calculation failed', error, {
        jobId: job.id,
        locationId,
        startYear,
        endYear,
      });
      throw error;
    }
  }

  /**
   * 過去データ計算をキューに追加
   */
  async scheduleHistoricalCalculation(
    locationId: number,
    startYear: number,
    endYear: number,
    priority: 'high' | 'medium' | 'low' = 'low',
    requestId?: string
  ): Promise<string> {
    const job = await this.historicalQueue.add(
      'calculate-historical',
      {
        locationId,
        startYear,
        endYear,
        priority,
        requestId,
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: { count: 3 },
        removeOnFail: { count: 10 },
        // 長時間ジョブのためタイムアウトを長く設定
        jobId: `historical-${locationId}-${startYear}-${endYear}`,
      }
    );

    logger.info('Historical calculation job scheduled', {
      jobId: job.id,
      locationId,
      startYear,
      endYear,
      yearSpan: endYear - startYear + 1,
      priority,
      requestId,
    });

    return job.id!;
  }

  /**
   * 優先度を数値に変換
   */
  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  /**
   * キューの状態を取得
   */
  async getQueueStats(): Promise<{
    location: any;
    monthly: any;
    daily: any;
    historical: any;
  }> {
    const [locationStats, monthlyStats, dailyStats, historicalStats] = await Promise.all([
      this.locationQueue.getJobCounts(),
      this.monthlyQueue.getJobCounts(),
      this.dailyQueue.getJobCounts(),
      this.historicalQueue.getJobCounts(),
    ]);

    return {
      location: locationStats,
      monthly: monthlyStats,
      daily: dailyStats,
      historical: historicalStats,
    };
  }

  /**
   * 特定ジョブの進捗を取得
   */
  async getJobProgress(jobId: string, queueType: 'location' | 'monthly' | 'daily' | 'historical'): Promise<any> {
    let queue: Queue;
    switch (queueType) {
      case 'location': queue = this.locationQueue; break;
      case 'monthly': queue = this.monthlyQueue; break;
      case 'daily': queue = this.dailyQueue; break;
      case 'historical': queue = this.historicalQueue; break;
      default: throw new Error(`Unknown queue type: ${queueType}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      progress: job.progress,
      state: await job.getState(),
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }

  /**
   * サービス終了時のクリーンアップ
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue service');
    
    // ワーカーの停止
    await Promise.all(this.workers.map(worker => worker.close()));
    
    // キューの停止
    await Promise.all([
      this.locationQueue.close(),
      this.monthlyQueue.close(),
      this.dailyQueue.close(),
      this.historicalQueue.close(),
    ]);

    // Redis接続の切断
    await redisConnection.quit();
    
    logger.info('Queue service shutdown completed');
  }
}

// シングルトンインスタンス
export const queueService = new QueueService();