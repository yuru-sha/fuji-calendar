import { EventsCacheModel } from '../models/EventsCache';
import { LocationModel } from '../models/Location';
import { AstronomicalCalculatorImpl } from './NewAstronomicalCalculator';

const astronomicalCalculator = new AstronomicalCalculatorImpl();
import { 
  BatchCalculationJob, 
  CacheKeyOptions 
} from '../../shared/types/cache';
import { FujiEvent, Location } from '../../shared/types';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

/**
 * バッチ計算サービス
 * 重い天体計算を事前に実行してキャッシュに保存
 */
export class BatchCalculationService {
  private cacheModel: EventsCacheModel;
  private locationModel: LocationModel;
  private logger: StructuredLogger;
  private isRunning: boolean = false;
  private currentJob?: BatchCalculationJob;

  constructor() {
    this.cacheModel = new EventsCacheModel();
    this.locationModel = new LocationModel();
    this.logger = getComponentLogger('batch-calculation');
  }

  /**
   * 月間イベントの事前計算
   */
  async calculateMonthlyEvents(
    year: number, 
    month: number, 
    locationIds?: number[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<BatchCalculationJob> {
    
    // 対象地点の取得
    const allLocations = await this.locationModel.findAll();
    const targetLocations = locationIds 
      ? allLocations.filter(loc => locationIds.includes(loc.id))
      : allLocations;

    if (targetLocations.length === 0) {
      throw new Error('計算対象の地点が見つかりません');
    }

    // ジョブの作成
    const job: BatchCalculationJob = {
      id: `monthly_${year}_${month}_${Date.now()}`,
      type: 'monthly',
      year,
      month,
      locationIds: targetLocations.map(loc => loc.id),
      priority,
      status: 'pending',
      createdAt: new Date(),
      progress: {
        total: targetLocations.length,
        completed: 0,
        percentage: 0
      }
    };

    this.logger.info('月間バッチ計算ジョブ開始', {
      jobId: job.id,
      year,
      month,
      locationCount: targetLocations.length,
      priority
    });

    // 非同期でバッチ処理を実行
    this.executeMonthlyBatch(job, targetLocations).catch(error => {
      this.logger.error('月間バッチ計算エラー', error, { jobId: job.id });
    });

    return job;
  }

  /**
   * 月間バッチ処理の実行
   */
  private async executeMonthlyBatch(job: BatchCalculationJob, locations: Location[]): Promise<void> {
    this.currentJob = job;
    this.isRunning = true;
    job.status = 'running';
    job.startedAt = new Date();

    try {
      const startTime = Date.now();
      
      this.logger.info('月間バッチ処理実行開始', {
        jobId: job.id,
        year: job.year,
        month: job.month,
        locationCount: locations.length
      });

      // 各地点について月間計算を実行
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        try {
          await this.calculateAndCacheMonthlyLocation(job.year!, job.month!, location);
          
          // 進捗更新
          job.progress.completed = i + 1;
          job.progress.percentage = Math.round((job.progress.completed / job.progress.total) * 100);
          
          this.logger.debug('地点別月間計算完了', {
            jobId: job.id,
            locationId: location.id,
            locationName: location.name,
            progress: `${job.progress.completed}/${job.progress.total}`
          });
          
        } catch (locationError) {
          this.logger.error('地点別計算エラー', locationError, {
            jobId: job.id,
            locationId: location.id,
            locationName: location.name
          });
          // 個別地点のエラーは継続
        }
      }

      // ジョブ完了
      job.status = 'completed';
      job.completedAt = new Date();
      
      const totalTime = Date.now() - startTime;
      this.logger.info('月間バッチ処理完了', {
        jobId: job.id,
        year: job.year,
        month: job.month,
        locationCount: locations.length,
        totalTimeMs: totalTime,
        avgTimePerLocation: Math.round(totalTime / locations.length)
      });

    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      
      this.logger.error('月間バッチ処理失敗', error, {
        jobId: job.id,
        year: job.year,
        month: job.month
      });
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentJob = undefined;
    }
  }

  /**
   * 特定地点の月間イベント計算とキャッシュ
   */
  private async calculateAndCacheMonthlyLocation(
    year: number, 
    month: number, 
    location: Location
  ): Promise<void> {
    const startTime = Date.now();
    
    // 既存キャッシュの確認
    const cacheOptions: CacheKeyOptions = {
      year,
      month,
      locationId: location.id
    };
    
    const existingCache = await this.cacheModel.getCache(cacheOptions);
    if (existingCache.hit) {
      this.logger.debug('キャッシュ済みのためスキップ', {
        year,
        month,
        locationId: location.id,
        locationName: location.name
      });
      return;
    }

    // 月間イベント計算実行
    const events = await astronomicalCalculator.calculateMonthlyEvents(year, month, [location]);
    const calculationTime = Date.now() - startTime;

    // キャッシュに保存
    await this.cacheModel.setCache(
      cacheOptions,
      events,
      calculationTime,
      60 // 60日間有効
    );

    this.logger.info('地点別月間計算・キャッシュ完了', {
      year,
      month,
      locationId: location.id,
      locationName: location.name,
      eventCount: events.length,
      calculationTimeMs: calculationTime
    });
  }

  /**
   * 複数月の事前計算（次の3ヶ月分など）
   */
  async precomputeUpcomingMonths(monthsAhead: number = 3): Promise<BatchCalculationJob[]> {
    const jobs: BatchCalculationJob[] = [];
    const currentDate = new Date();
    
    for (let i = 0; i <= monthsAhead; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() + i);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      try {
        const job = await this.calculateMonthlyEvents(year, month, undefined, 'low');
        jobs.push(job);
        
        // バッチ間の間隔を空ける（システム負荷軽減）
        if (i < monthsAhead) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        this.logger.error('先行計算エラー', error, { year, month });
      }
    }

    this.logger.info('先行計算ジョブ作成完了', {
      monthsAhead,
      jobCount: jobs.length
    });

    return jobs;
  }

  /**
   * 特定日のイベント計算（高優先度）
   */
  async calculateDayEvents(
    year: number, 
    month: number, 
    day: number, 
    locationIds?: number[]
  ): Promise<FujiEvent[]> {
    
    const targetDate = new Date(year, month - 1, day);
    const allLocations = await this.locationModel.findAll();
    const targetLocations = locationIds 
      ? allLocations.filter(loc => locationIds.includes(loc.id))
      : allLocations;

    const allEvents: FujiEvent[] = [];

    for (const location of targetLocations) {
      const cacheOptions: CacheKeyOptions = {
        year,
        month,
        day,
        locationId: location.id
      };

      // キャッシュ確認
      const cached = await this.cacheModel.getCache(cacheOptions);
      if (cached.hit && cached.data) {
        allEvents.push(...cached.data);
        continue;
      }

      // キャッシュがない場合は計算
      const startTime = Date.now();
      const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(targetDate, location);
      const pearlEvents = await astronomicalCalculator.calculatePearlFuji(targetDate, location);
      const dayEvents = [...diamondEvents, ...pearlEvents];
      const calculationTime = Date.now() - startTime;

      // 日次キャッシュに保存
      await this.cacheModel.setCache(
        cacheOptions,
        dayEvents,
        calculationTime,
        30 // 30日間有効
      );

      allEvents.push(...dayEvents);
    }

    return allEvents;
  }

  /**
   * キャッシュクリーンアップ
   */
  async cleanupCache(): Promise<void> {
    this.logger.info('キャッシュクリーンアップ開始');
    
    const deletedCount = await this.cacheModel.cleanupExpiredCache();
    
    this.logger.info('キャッシュクリーンアップ完了', {
      deletedEntries: deletedCount
    });
  }

  /**
   * バッチ処理の状態取得
   */
  getStatus(): {
    isRunning: boolean;
    currentJob?: BatchCalculationJob;
  } {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob
    };
  }

  /**
   * 緊急時のバッチ処理停止
   */
  async stop(): Promise<void> {
    if (this.isRunning && this.currentJob) {
      this.currentJob.status = 'failed';
      this.currentJob.errorMessage = 'Manually stopped';
      this.currentJob.completedAt = new Date();
      
      this.logger.warn('バッチ処理を手動停止', {
        jobId: this.currentJob.id
      });
    }
    
    this.isRunning = false;
    this.currentJob = undefined;
  }

  /**
   * キャッシュ統計の取得
   */
  async getCacheStatistics() {
    return await this.cacheModel.getCacheStats();
  }
}