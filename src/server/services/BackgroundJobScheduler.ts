import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

import { BatchCalculationService } from './BatchCalculationService';
import { queueService } from './QueueService';
import { fujiCalculationOrchestrator } from './FujiCalculationOrchestrator';
import { celestialOrbitDataService } from './CelestialOrbitDataService';

import { EventsCacheModel } from '../models/EventsCache';
import { LocationModel } from '../models/Location';
import { HistoricalEventsModel } from '../models/HistoricalEvents';

export class BackgroundJobScheduler {
  // setTimeout最大値（JavaScriptの32ビット制限: 約24.8日）
  private static readonly MAX_TIMEOUT_MS = 2147483647; // 2^31 - 1
  
  public readonly batchService: BatchCalculationService;
  private cacheModel: EventsCacheModel;
  private locationModel: LocationModel;
  private historicalModel: HistoricalEventsModel;
  private logger: StructuredLogger;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.batchService = new BatchCalculationService();
    this.cacheModel = new EventsCacheModel();
    this.locationModel = new LocationModel();
    this.historicalModel = new HistoricalEventsModel();
    this.logger = getComponentLogger('background-scheduler');
  }

  start(): void {
    if (this.isRunning) {
      this.logger.warn('スケジューラーは既に実行中です');
      return;
    }

    this.isRunning = true;
    this.logger.info('バックグラウンドジョブスケジューラー開始');

    this.schedulePrecomputation();
    this.scheduleCacheCleanup();
    this.scheduleStatisticsUpdate();
    this.scheduleYearlyMaintenance();
    this.scheduleMonthlyMaintenance();
    this.scheduleCelestialDataGeneration();
  }

  stop(): void {
    this.logger.info('バックグラウンドジョブスケジューラー停止');
    
    for (const [jobName, timeoutId] of this.scheduledJobs) {
      clearTimeout(timeoutId);
      this.logger.debug('ジョブスケジュールクリア', { jobName });
    }
    
    this.scheduledJobs.clear();
    this.isRunning = false;
  }

  /**
   * 安全なsetTimeoutラッパー（32ビット制限対応）
   */
  private safeSetTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    if (delay > BackgroundJobScheduler.MAX_TIMEOUT_MS) {
      this.logger.warn('タイムアウト値が制限を超えています。上限値を使用します', {
        requestedDelay: delay,
        maxDelay: BackgroundJobScheduler.MAX_TIMEOUT_MS,
        requestedDays: Math.round(delay / (24 * 60 * 60 * 1000)),
        maxDays: Math.round(BackgroundJobScheduler.MAX_TIMEOUT_MS / (24 * 60 * 60 * 1000))
      });
      delay = BackgroundJobScheduler.MAX_TIMEOUT_MS;
    }
    
    return setTimeout(callback, delay);
  }

  /**
   * 事前計算ジョブのスケジュール
   */
  private schedulePrecomputation(): void {
    // 毎日午前2時に次の3ヶ月分を事前計算
    this.scheduleDaily('precomputation', 2, 0, async () => {
      try {
        this.logger.info('定期事前計算ジョブ開始');
        await this.batchService.precomputeUpcomingMonths(3);
        this.logger.info('定期事前計算ジョブ完了');
      } catch (error) {
        this.logger.error('定期事前計算ジョブエラー', error);
      }
    });

    // 毎時0分に当月の不足分を補完
    this.scheduleHourly('monthly-補完', 0, async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        await this.batchService.calculateMonthlyEvents(year, month, undefined, 'medium');
        this.logger.debug('当月補完ジョブ完了', { year, month });
      } catch (error) {
        this.logger.warn('当月補完ジョブエラー', error);
      }
    });
  }

  /**
   * キャッシュクリーンアップのスケジュール
   */
  private scheduleCacheCleanup(): void {
    // 毎日午前3時にキャッシュクリーンアップ
    this.scheduleDaily('cache-cleanup', 3, 0, async () => {
      try {
        this.logger.info('キャッシュクリーンアップジョブ開始');
        const deletedCount = await this.cacheModel.cleanupExpiredCache();
        this.logger.info('キャッシュクリーンアップジョブ完了', { deletedEntries: deletedCount });
      } catch (error) {
        this.logger.error('キャッシュクリーンアップジョブエラー', error);
      }
    });
  }

  /**
   * 統計更新のスケジュール
   */
  private scheduleStatisticsUpdate(): void {
    // 6時間ごとにキャッシュ統計を更新
    this.scheduleInterval('statistics-update', 6 * 60 * 60 * 1000, async () => {
      try {
        const stats = await this.cacheModel.getCacheStats();
        this.logger.info('キャッシュ統計更新', {
          totalEntries: stats.totalEntries,
          validEntries: stats.validEntries,
          diskUsageMB: stats.diskUsageMB.toFixed(2)
        });
      } catch (error) {
        this.logger.warn('統計更新エラー', error);
      }
    });
  }

  /**
   * 年次メンテナンスのスケジュール
   */
  private scheduleYearlyMaintenance(): void {
    // 毎年12月1日 午前0時に年間富士現象計算実行（新アーキテクチャ）
    this.scheduleYearly('fuji-yearly-calculation', 12, 1, 0, 0, async () => {
      try {
        this.logger.info('年間富士現象計算ジョブ開始（3段階アーキテクチャ）');
        await this.performYearlyFujiCalculation();
        this.logger.info('年間富士現象計算ジョブ完了');
      } catch (error) {
        this.logger.error('年間富士現象計算ジョブエラー', error);
      }
    });

    // 毎年12月15日 午前1時に翌年のデータ準備開始（従来システム）
    this.scheduleYearly('yearly-preparation', 12, 15, 1, 0, async () => {
      try {
        this.logger.info('年次データ準備ジョブ開始');
        await this.performYearlyPreparation();
        this.logger.info('年次データ準備ジョブ完了');
      } catch (error) {
        this.logger.error('年次データ準備ジョブエラー', error);
      }
    });

    // 毎年1月1日 午前0時30分に新年データ最終確認
    this.scheduleYearly('new-year-verification', 1, 1, 0, 30, async () => {
      try {
        this.logger.info('新年データ検証ジョブ開始');
        await this.performNewYearVerification();
        this.logger.info('新年データ検証ジョブ完了');
      } catch (error) {
        this.logger.error('新年データ検証ジョブエラー', error);
      }
    });

    // 毎年12月31日 午後11時に古いデータのアーカイブ
    this.scheduleYearly('yearly-archive', 12, 31, 23, 0, async () => {
      try {
        this.logger.info('年次アーカイブジョブ開始');
        await this.performYearlyArchive();
        this.logger.info('年次アーカイブジョブ完了');
      } catch (error) {
        this.logger.error('年次アーカイブジョブエラー', error);
      }
    });
  }

  /**
   * 天体軌道データ生成のスケジュール
   */
  private scheduleCelestialDataGeneration(): void {
    // サーバー起動5分後に今年の天体データ生成を開始
    const fiveMinutesLater = 5 * 60 * 1000; // 5分 = 300,000ms
    
    const timeoutId = this.safeSetTimeout(async () => {
      try {
        const currentYear = new Date().getFullYear();
        this.logger.info('天体軌道データ生成ジョブ開始（起動時）', { year: currentYear });
        
        const result = await celestialOrbitDataService.generateYearlyData(currentYear);
        
        if (result.success) {
          this.logger.info('天体軌道データ生成ジョブ完了', {
            year: currentYear,
            totalDataPoints: result.totalDataPoints,
            timeMs: result.timeMs
          });
        } else {
          this.logger.error('天体軌道データ生成ジョブ失敗', null, { year: currentYear });
        }
        
      } catch (error) {
        this.logger.error('天体軌道データ生成ジョブエラー', error);
      }
    }, fiveMinutesLater);
    
    this.scheduledJobs.set('celestial-data-generation', timeoutId);
    
    this.logger.info('天体軌道データ生成スケジュール', {
      delayMinutes: 5,
      scheduledTime: new Date(Date.now() + fiveMinutesLater).toISOString()
    });

    // 年次で天体データを再生成（毎年12月1日 午前3時）
    this.scheduleYearly('celestial-yearly-generation', 12, 1, 3, 0, async () => {
      try {
        const currentYear = new Date().getFullYear();
        this.logger.info('年次天体軌道データ生成ジョブ開始', { year: currentYear });
        
        const result = await celestialOrbitDataService.generateYearlyData(currentYear);
        
        if (result.success) {
          this.logger.info('年次天体軌道データ生成ジョブ完了', {
            year: currentYear,
            totalDataPoints: result.totalDataPoints,
            timeMs: result.timeMs
          });
        } else {
          this.logger.error('年次天体軌道データ生成ジョブ失敗', null, { year: currentYear });
        }
        
      } catch (error) {
        this.logger.error('年次天体軌道データ生成ジョブエラー', error);
      }
    });
  }

  /**
   * 月次メンテナンスのスケジュール
   */
  private scheduleMonthlyMaintenance(): void {
    // 毎月1日 午前1時に3ヶ月先までの計算準備
    this.scheduleMonthly('monthly-preparation', 1, 1, 0, async () => {
      try {
        this.logger.info('月次準備ジョブ開始');
        await this.performMonthlyPreparation();
        this.logger.info('月次準備ジョブ完了');
      } catch (error) {
        this.logger.error('月次準備ジョブエラー', error);
      }
    });

    // 毎月15日 午前2時にデータ整合性チェック
    this.scheduleMonthly('monthly-verification', 15, 2, 0, async () => {
      try {
        this.logger.info('月次検証ジョブ開始');
        await this.performMonthlyVerification();
        this.logger.info('月次検証ジョブ完了');
      } catch (error) {
        this.logger.error('月次検証ジョブエラー', error);
      }
    });
  }

  /**
   * 日次スケジューリング（特定の時刻に実行）
   */
  private scheduleDaily(
    jobName: string, 
    hour: number, 
    minute: number, 
    job: () => Promise<void>
  ): void {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // 今日の指定時刻が過去の場合は明日にスケジュール
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    const timeoutId = this.safeSetTimeout(() => {
      job().finally(() => {
        // 次の実行をスケジュール（24時間後）
        this.scheduleDaily(jobName, hour, minute, job);
      });
    }, timeUntilExecution);

    this.scheduledJobs.set(jobName, timeoutId);

    this.logger.info('日次ジョブスケジュール', {
      jobName,
      scheduledTime: scheduledTime.toISOString(),
      timeUntilExecutionMs: timeUntilExecution
    });
  }

  /**
   * 時間ごとのスケジューリング（毎時指定分に実行）
   */
  private scheduleHourly(
    jobName: string, 
    minute: number, 
    job: () => Promise<void>
  ): void {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setMinutes(minute, 0, 0);

    // 今時間の指定分が過去の場合は次の時間にスケジュール
    if (scheduledTime <= now) {
      scheduledTime.setHours(scheduledTime.getHours() + 1);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    const timeoutId = this.safeSetTimeout(() => {
      job().finally(() => {
        // 次の実行をスケジュール（1時間後）
        this.scheduleHourly(jobName, minute, job);
      });
    }, timeUntilExecution);

    this.scheduledJobs.set(jobName, timeoutId);

    this.logger.debug('時間ジョブスケジュール', {
      jobName,
      scheduledTime: scheduledTime.toISOString(),
      timeUntilExecutionMs: timeUntilExecution
    });
  }

  /**
   * インターバルスケジューリング（一定間隔で実行）
   */
  private scheduleInterval(
    jobName: string, 
    intervalMs: number, 
    job: () => Promise<void>
  ): void {
    const execute = async () => {
      try {
        await job();
      } catch (error) {
        this.logger.error('インターバルジョブエラー', error, { jobName });
      } finally {
        // 次の実行をスケジュール
        const timeoutId = this.safeSetTimeout(execute, intervalMs);
        this.scheduledJobs.set(jobName, timeoutId);
      }
    };

    // 初回実行は少し遅らせる（起動直後の負荷軽減）
    const timeoutId = this.safeSetTimeout(execute, 30000); // 30秒後に初回実行
    this.scheduledJobs.set(jobName, timeoutId);

    this.logger.info('インターバルジョブスケジュール', {
      jobName,
      intervalMs,
      intervalMinutes: (intervalMs / (1000 * 60)).toFixed(1)
    });
  }

  /**
   * 年次スケジューリング（毎年特定の日時に実行）
   */
  private scheduleYearly(
    jobName: string,
    month: number,
    day: number,
    hour: number,
    minute: number,
    job: () => Promise<void>
  ): void {
    const now = new Date();
    const scheduledTime = new Date();
    
    scheduledTime.setMonth(month - 1, day); // monthは0ベース
    scheduledTime.setHours(hour, minute, 0, 0);

    // 今年の指定日時が過去の場合は来年にスケジュール
    if (scheduledTime <= now) {
      scheduledTime.setFullYear(scheduledTime.getFullYear() + 1);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    const timeoutId = this.safeSetTimeout(() => {
      job().finally(() => {
        // 次の実行をスケジュール（1年後）
        this.scheduleYearly(jobName, month, day, hour, minute, job);
      });
    }, timeUntilExecution);

    this.scheduledJobs.set(jobName, timeoutId);

    this.logger.info('年次ジョブスケジュール', {
      jobName,
      scheduledTime: scheduledTime.toISOString(),
      timeUntilExecutionMs: timeUntilExecution,
      timeUntilExecutionDays: Math.floor(timeUntilExecution / (1000 * 60 * 60 * 24))
    });
  }

  /**
   * 月次スケジューリング（毎月特定の日時に実行）
   */
  private scheduleMonthly(
    jobName: string,
    day: number,
    hour: number,
    minute: number,
    job: () => Promise<void>
  ): void {
    const now = new Date();
    const scheduledTime = new Date();
    
    scheduledTime.setDate(day);
    scheduledTime.setHours(hour, minute, 0, 0);

    // 今月の指定日時が過去の場合は来月にスケジュール
    if (scheduledTime <= now) {
      scheduledTime.setMonth(scheduledTime.getMonth() + 1);
    }

    const timeUntilExecution = scheduledTime.getTime() - now.getTime();

    const timeoutId = this.safeSetTimeout(() => {
      job().finally(() => {
        // 次の実行をスケジュール（1ヶ月後）
        this.scheduleMonthly(jobName, day, hour, minute, job);
      });
    }, timeUntilExecution);

    this.scheduledJobs.set(jobName, timeoutId);

    this.logger.info('月次ジョブスケジュール', {
      jobName,
      scheduledTime: scheduledTime.toISOString(),
      timeUntilExecutionMs: timeUntilExecution,
      timeUntilExecutionDays: Math.floor(timeUntilExecution / (1000 * 60 * 60 * 24))
    });
  }

  /**
   * 即座に事前計算を実行（手動トリガー用）
   */
  async triggerImmediatePrecomputation(monthsAhead: number = 2): Promise<void> {
    this.logger.info('手動事前計算開始', { monthsAhead });
    
    try {
      const jobs = await this.batchService.precomputeUpcomingMonths(monthsAhead);
      this.logger.info('手動事前計算完了', { 
        jobCount: jobs.length,
        monthsAhead 
      });
    } catch (error) {
      this.logger.error('手動事前計算エラー', error);
      throw error;
    }
  }

  /**
   * 手動での年間富士現象計算実行（テスト・メンテナンス用）
   */
  async triggerYearlyFujiCalculation(year: number): Promise<{
    success: boolean;
    result?: any;
    error?: Error;
  }> {
    this.logger.info('手動年間富士現象計算開始', { year });
    
    try {
      const result = await fujiCalculationOrchestrator.executeFullYearlyCalculation(year);
      
      this.logger.info('手動年間富士現象計算完了', {
        year,
        success: result.success,
        totalTimeMs: result.totalTimeMs,
        phenomenaCount: result.finalStats?.totalPhenomena || 0
      });

      return { success: true, result };
      
    } catch (error) {
      this.logger.error('手動年間富士現象計算エラー', error, { year });
      return { success: false, error: error as Error };
    }
  }

  /**
   * 手動での天体軌道データ生成実行
   */
  async triggerCelestialDataGeneration(year: number): Promise<{
    success: boolean;
    totalDataPoints: number;
    timeMs: number;
  }> {
    this.logger.info('手動天体軌道データ生成開始', { year });
    
    try {
      const result = await celestialOrbitDataService.generateYearlyData(year);
      
      this.logger.info('手動天体軌道データ生成完了', {
        year,
        success: result.success,
        totalDataPoints: result.totalDataPoints,
        timeMs: result.timeMs
      });

      return result;
      
    } catch (error) {
      this.logger.error('手動天体軌道データ生成エラー', error, { year });
      return {
        success: false,
        totalDataPoints: 0,
        timeMs: 0
      };
    }
  }

  /**
   * 計算システムの健康状態チェック（手動実行用）
   */  
  async checkFujiCalculationSystemHealth(year: number): Promise<any> {
    this.logger.info('富士計算システム健康チェック開始', { year });
    
    try {
      const healthCheck = await fujiCalculationOrchestrator.healthCheck(year);
      
      this.logger.info('富士計算システム健康チェック完了', {
        year,
        healthy: healthCheck.healthy,
        recommendationCount: healthCheck.recommendations.length
      });

      return healthCheck;
      
    } catch (error) {
      this.logger.error('富士計算システム健康チェックエラー', error, { year });
      throw error;
    }
  }

  /**
   * スケジューラーの状態取得
   */
  getStatus(): {
    isRunning: boolean;
    scheduledJobCount: number;
    jobNames: string[];
  } {
    return {
      isRunning: this.isRunning,
      scheduledJobCount: this.scheduledJobs.size,
      jobNames: Array.from(this.scheduledJobs.keys())
    };
  }

  /**
   * 年間富士現象計算処理（12月1日実行）
   * 新しい3段階アーキテクチャによる翌年の事前計算
   */
  async performYearlyFujiCalculation(): Promise<void> {
    const nextYear = new Date().getFullYear() + 1;
    this.logger.info('年間富士現象計算開始（3段階アーキテクチャ）', { targetYear: nextYear });

    try {
      // 1. オーケストレーターによる年間計算実行
      const result = await fujiCalculationOrchestrator.executeFullYearlyCalculation(nextYear);
      
      if (result.success) {
        this.logger.info('年間富士現象計算完了', {
          targetYear: nextYear,
          totalTimeMs: result.totalTimeMs,
          totalTimeHours: Math.round(result.totalTimeMs / 1000 / 60 / 60 * 10) / 10,
          stages: result.stages,
          finalStats: result.finalStats
        });

        // 2. 計算システムの健康状態チェック
        const healthCheck = await fujiCalculationOrchestrator.healthCheck(nextYear);
        
        if (!healthCheck.healthy) {
          this.logger.warn('年間計算後の健康状態警告', {
            targetYear: nextYear,
            recommendations: healthCheck.recommendations
          });
        }

        // 3. 成功通知（将来的にはSlackやメール通知）
        this.logger.info('年間富士現象計算成功通知', {
          targetYear: nextYear,
          phenomenaCount: result.finalStats.totalPhenomena,
          locationCoverage: result.finalStats.matchedLocations,
          qualityDistribution: result.finalStats
        });

      } else {
        throw new Error('年間富士現象計算が失敗しました');
      }

    } catch (error) {
      this.logger.error('年間富士現象計算エラー', error, { targetYear: nextYear });
      
      // エラー通知とフォールバック処理
      await this.handleYearlyCalculationFailure(nextYear, error);
      throw error;
    }
  }

  /**
   * 年間計算失敗時のフォールバック処理
   */
  private async handleYearlyCalculationFailure(year: number, error: Error): Promise<void> {
    this.logger.warn('年間計算失敗 - フォールバック処理開始', { year });

    try {
      // 1. 従来システムによる部分的な計算をスケジュール
      const locations = await this.locationModel.findAll();
      
      for (const location of locations) {
        await queueService.scheduleLocationCalculation(
          location.id,
          year,
          year,
          'high', // 高優先度
          `fallback-yearly-${year}`
        );
      }

      this.logger.info('フォールバック処理完了', {
        year,
        locationCount: locations.length,
        method: '従来システム'
      });

    } catch (fallbackError) {
      this.logger.error('フォールバック処理も失敗', fallbackError, { year });
    }
  }

  /**
   * 年次データ準備処理（従来システム）
   */
  async performYearlyPreparation(): Promise<void> {
    const nextYear = new Date().getFullYear() + 1;
    this.logger.info('年次準備開始', { targetYear: nextYear });

    try {
      // 全地点の翌年データを事前計算
      const locations = await this.locationModel.findAll();
      
      for (const location of locations) {
        await queueService.scheduleLocationCalculation(
          location.id,
          nextYear,
          nextYear,
          'medium',
          `yearly-prep-${nextYear}`
        );
        
        this.logger.debug('翌年計算スケジュール', {
          locationId: location.id,
          locationName: location.name,
          year: nextYear
        });
      }

      this.logger.info('年次準備完了', {
        targetYear: nextYear,
        locationCount: locations.length
      });

    } catch (error) {
      this.logger.error('年次準備エラー', error, { targetYear: nextYear });
      throw error;
    }
  }

  /**
   * 新年データ検証処理
   */
  async performNewYearVerification(): Promise<void> {
    const currentYear = new Date().getFullYear();
    this.logger.info('新年検証開始', { year: currentYear });

    try {
      const locations = await this.locationModel.findAll();
      const verificationResults = [];

      for (const location of locations) {
        // 最初の3ヶ月分のデータが存在するかチェック
        for (let month = 1; month <= 3; month++) {
          const cacheExists = await this.cacheModel.exists({
            locationId: location.id,
            year: currentYear,
            month
          });

          verificationResults.push({
            locationId: location.id,
            locationName: location.name,
            year: currentYear,
            month,
            cacheExists
          });

          // データが不足している場合は緊急計算をスケジュール
          if (!cacheExists) {
            await queueService.scheduleMonthlyCalculation(
              location.id,
              currentYear,
              month,
              'high',
              `new-year-urgent-${currentYear}`
            );

            this.logger.warn('新年データ不足 - 緊急計算開始', {
              locationId: location.id,
              year: currentYear,
              month
            });
          }
        }
      }

      const missingDataCount = verificationResults.filter(r => !r.cacheExists).length;
      
      this.logger.info('新年検証完了', {
        year: currentYear,
        totalChecks: verificationResults.length,
        missingDataCount,
        successRate: ((verificationResults.length - missingDataCount) / verificationResults.length * 100).toFixed(1) + '%'
      });

    } catch (error) {
      this.logger.error('新年検証エラー', error, { year: currentYear });
      throw error;
    }
  }

  /**
   * 年次アーカイブ処理
   */
  async performYearlyArchive(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const archiveYear = currentYear - 3; // 3年前のデータをアーカイブ対象
    const deleteYear = currentYear - 10; // 10年前のデータを削除
    
    this.logger.info('年次アーカイブ開始', { archiveYear, deleteYear });

    try {
      // 1. 3年前のキャッシュデータを過去データテーブルに移行
      const archivedCount = await this.historicalModel.archiveEventsFromCache(archiveYear);
      this.logger.info('過去データテーブルへの移行完了', {
        archiveYear,
        archivedEntries: archivedCount
      });

      // 2. アーカイブ済みキャッシュデータの削除
      const deletedCacheCount = await this.cacheModel.deleteByYear(archiveYear);
      this.logger.info('アーカイブ済みキャッシュ削除完了', {
        archiveYear,
        deletedCacheEntries: deletedCacheCount
      });

      // 3. 10年以上前の過去データを削除
      if (deleteYear > 0) {
        const deletedHistoricalCount = await this.historicalModel.deleteOldData(10);
        this.logger.info('古い過去データ削除完了', {
          deleteYear,
          deletedHistoricalEntries: deletedHistoricalCount
        });
      }

      // 4. アーカイブ統計の取得
      const dataCount = await this.historicalModel.getDataCount();
      
      this.logger.info('年次アーカイブ完了', {
        archiveYear,
        deleteYear,
        archivedEntries: archivedCount,
        deletedCacheEntries: deletedCacheCount,
        retentionPolicy: '10年',
        historicalDataStats: dataCount
      });

    } catch (error) {
      this.logger.error('年次アーカイブエラー', error, { archiveYear, deleteYear });
      throw error;
    }
  }

  /**
   * 月次準備処理
   */
  async performMonthlyPreparation(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    this.logger.info('月次準備開始', { year: currentYear, month: currentMonth });

    try {
      const locations = await this.locationModel.findAll();

      // 3ヶ月先までのデータを準備
      for (let monthOffset = 1; monthOffset <= 3; monthOffset++) {
        const targetDate = new Date(currentYear, currentMonth - 1 + monthOffset, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth() + 1;

        for (const location of locations) {
          // データが既に存在するかチェック
          const cacheExists = await this.cacheModel.exists({
            locationId: location.id,
            year: targetYear,
            month: targetMonth
          });

          if (!cacheExists) {
            await queueService.scheduleMonthlyCalculation(
              location.id,
              targetYear,
              targetMonth,
              'low',
              `monthly-prep-${targetYear}-${targetMonth}`
            );

            this.logger.debug('月次準備計算スケジュール', {
              locationId: location.id,
              year: targetYear,
              month: targetMonth
            });
          }
        }
      }

      this.logger.info('月次準備完了', {
        year: currentYear,
        month: currentMonth,
        locationCount: locations.length
      });

    } catch (error) {
      this.logger.error('月次準備エラー', error, { year: currentYear, month: currentMonth });
      throw error;
    }
  }

  /**
   * 月次検証処理
   */
  async performMonthlyVerification(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    this.logger.info('月次検証開始', { year: currentYear, month: currentMonth });

    try {
      const locations = await this.locationModel.findAll();
      const stats = await this.cacheModel.getCacheStats();

      // データ整合性チェック
      let totalEvents = 0;
      let missingDataCount = 0;

      for (const location of locations) {
        // 当月から3ヶ月先までのデータをチェック
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
          const targetDate = new Date(currentYear, currentMonth - 1 + monthOffset, 1);
          const targetYear = targetDate.getFullYear();
          const targetMonth = targetDate.getMonth() + 1;

          const events = await this.cacheModel.findByLocationAndMonth(
            location.id,
            targetYear,
            targetMonth
          );

          if (events.length === 0) {
            missingDataCount++;
            this.logger.warn('データ不足検出', {
              locationId: location.id,
              year: targetYear,
              month: targetMonth
            });
          } else {
            totalEvents += events.length;
          }
        }
      }

      const integrityScore = ((locations.length * 3 - missingDataCount) / (locations.length * 3) * 100);

      this.logger.info('月次検証完了', {
        year: currentYear,
        month: currentMonth,
        totalEvents,
        missingDataCount,
        integrityScore: integrityScore.toFixed(1) + '%',
        diskUsageMB: stats.diskUsageMB.toFixed(2)
      });

      // 整合性スコアが85%未満の場合は警告
      if (integrityScore < 85) {
        this.logger.warn('データ整合性警告', {
          integrityScore: integrityScore.toFixed(1) + '%',
          threshold: '85%',
          missingDataCount
        });
      }

    } catch (error) {
      this.logger.error('月次検証エラー', error, { year: currentYear, month: currentMonth });
      throw error;
    }
  }

  /**
   * 特定ジョブの再スケジュール
   */
  rescheduleJob(jobName: string): void {
    const timeoutId = this.scheduledJobs.get(jobName);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledJobs.delete(jobName);
      this.logger.info('ジョブ再スケジュール', { jobName });
      
      // ジョブタイプに応じて再スケジュール
      if (jobName === 'precomputation') {
        this.schedulePrecomputation();
      } else if (jobName === 'cache-cleanup') {
        this.scheduleCacheCleanup();
      } else if (jobName === 'statistics-update') {
        this.scheduleStatisticsUpdate();
      } else if (jobName.includes('yearly')) {
        this.scheduleYearlyMaintenance();
      } else if (jobName.includes('monthly')) {
        this.scheduleMonthlyMaintenance();
      }
    }
  }
}

export default BackgroundJobScheduler;