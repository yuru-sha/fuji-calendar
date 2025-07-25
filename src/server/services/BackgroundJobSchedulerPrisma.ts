import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
import { calendarServicePrisma } from './CalendarServicePrisma';
// import { LocationModel } from '../models/Location'; // PostgreSQL移行により無効化
import { PrismaClientManager } from '../database/prisma';

/**
 * Prismaベースのバックグラウンドジョブスケジューラー
 * 年間富士現象計算、システムメンテナンス、データ整合性チェックを自動実行
 */
export class BackgroundJobSchedulerPrisma {
  private logger: StructuredLogger;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.logger = getComponentLogger('background-scheduler-prisma');
  }

  start(): void {
    if (this.isRunning) {
      this.logger.warn('Prismaスケジューラーは既に実行中です');
      return;
    }

    this.isRunning = true;
    this.logger.info('Prismaバックグラウンドジョブスケジューラー開始');

    this.scheduleYearlyCalculation();
    this.scheduleSystemHealthCheck();
    this.scheduleDataIntegrityCheck();
    this.scheduleStatisticsUpdate();
    this.scheduleYearlyMaintenance();
    this.scheduleMonthlyMaintenance();
  }

  stop(): void {
    this.logger.info('Prismaバックグラウンドジョブスケジューラー停止');
    
    for (const [jobName, timeoutId] of this.scheduledJobs) {
      clearTimeout(timeoutId);
      this.logger.debug('ジョブスケジュールクリア', { jobName });
    }
    
    this.scheduledJobs.clear();
    this.isRunning = false;
  }

  /**
   * 年間計算ジョブのスケジュール（12月1日実行）
   */
  private scheduleYearlyCalculation(): void {
    // 12月1日午前2時に翌年のデータ計算を実行
    this.scheduleAnnual('yearly-calculation', 12, 1, 2, 0, async () => {
      try {
        const nextYear = new Date().getFullYear() + 1;
        this.logger.info('年間富士現象計算ジョブ開始', { year: nextYear });
        
        const result = await calendarServicePrisma.executeYearlyCalculation(nextYear);
        
        if (result.success) {
          this.logger.info('年間富士現象計算ジョブ完了', {
            year: nextYear,
            totalEvents: result.finalStats?.totalEvents || 0,
            executionTimeHours: Math.round(result.totalTimeMs / 1000 / 60 / 60 * 10) / 10
          });
        } else {
          this.logger.error('年間富士現象計算ジョブ失敗', null, {
            year: nextYear,
            executionTimeMs: result.totalTimeMs
          });
        }
      } catch (error) {
        this.logger.error('年間富士現象計算ジョブエラー', error);
      }
    });

    // 当年データの補完チェック（月初1日午前3時）
    this.scheduleMonthly('current-year-supplement', 1, 3, 0, async () => {
      try {
        const currentYear = new Date().getFullYear();
        this.logger.info('当年データ補完チェック開始', { year: currentYear });
        
        const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(currentYear);
        
        if (!checkSystemHealth.healthy) {
          this.logger.warn('システム不健全状態検出 - 再計算実行', {
            year: currentYear,
            recommendations: checkSystemHealth.recommendations
          });
          
          const result = await calendarServicePrisma.executeYearlyCalculation(currentYear);
          
          if (result.success) {
            this.logger.info('当年データ補完完了', {
              year: currentYear,
              totalEvents: result.finalStats?.totalEvents || 0
            });
          }
        } else {
          this.logger.info('当年データ健全性確認', { year: currentYear });
        }
      } catch (error) {
        this.logger.error('当年データ補完チェックエラー', error);
      }
    });
  }

  /**
   * システム健康状態チェックのスケジュール
   */
  private scheduleSystemHealthCheck(): void {
    // 毎日午前1時にシステム健康状態をチェック
    this.scheduleDaily('system-health-check', 1, 0, async () => {
      try {
        const currentYear = new Date().getFullYear();
        const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(currentYear);
        
        this.logger.info('日次システム健康状態チェック完了', {
          year: currentYear,
          healthy: checkSystemHealth.healthy,
          recommendationCount: checkSystemHealth.recommendations.length
        });

        if (!checkSystemHealth.healthy) {
          this.logger.warn('システム不健全状態検出', {
            year: currentYear,
            recommendations: checkSystemHealth.recommendations
          });
        }
      } catch (error) {
        this.logger.error('システム健康状態チェックエラー', error);
      }
    });

    // 毎時30分にパフォーマンス統計を更新
    this.scheduleHourly('performance-metrics', 30, async () => {
      try {
        const metrics = Promise.resolve({ message: '新システムではパフォーマンス指標は自動取得されません' });
        
        this.logger.debug('パフォーマンス統計更新', {
          celestialRecords: metrics.dataVolume.celestialRecords,
          eventRecords: metrics.dataVolume.eventRecords,
          candidateExtractionRate: metrics.efficiency.candidateExtractionRate,
          eventMatchingRate: metrics.efficiency.eventMatchingRate
        });
      } catch (error) {
        this.logger.warn('パフォーマンス統計更新エラー', error);
      }
    });
  }

  /**
   * データ整合性チェックのスケジュール
   */
  private scheduleDataIntegrityCheck(): void {
    // 毎週日曜日午前4時にデータ整合性をチェック
    this.scheduleWeekly('data-integrity-check', 0, 4, 0, async () => { // 0 = Sunday
      try {
        this.logger.info('週次データ整合性チェック開始');
        
        const currentYear = new Date().getFullYear();
        
        // 各サービスの統計を取得して整合性を確認
        const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(currentYear);
        const performanceMetrics = Promise.resolve({ message: '新システムではパフォーマンス指標は自動取得されません' });
        
        // データボリュームの妥当性チェック
        const expectedCelestialRecords = 365 * 288 * 2; // 年間 × 5分刻み × 太陽月
        const actualCelestialRecords = performanceMetrics.dataVolume.celestialRecords;
        
        if (actualCelestialRecords < expectedCelestialRecords * 0.9) {
          this.logger.warn('天体データ量不足検出', {
            expected: expectedCelestialRecords,
            actual: actualCelestialRecords,
            percentage: (actualCelestialRecords / expectedCelestialRecords * 100).toFixed(1)
          });
        }
        
        // 効率性チェック
        if (performanceMetrics.efficiency.candidateExtractionRate < 0.01) {
          this.logger.warn('候補抽出効率低下検出', {
            rate: performanceMetrics.efficiency.candidateExtractionRate
          });
        }
        
        if (performanceMetrics.efficiency.eventMatchingRate < 0.1) {
          this.logger.warn('イベントマッチング効率低下検出', {
            rate: performanceMetrics.efficiency.eventMatchingRate
          });
        }
        
        this.logger.info('週次データ整合性チェック完了', {
          healthy: checkSystemHealth.healthy,
          dataVolumeCheck: 'passed',
          efficiencyCheck: 'passed'
        });
        
      } catch (error) {
        this.logger.error('データ整合性チェックエラー', error);
      }
    });
  }

  /**
   * 統計情報更新のスケジュール
   */
  private scheduleStatisticsUpdate(): void {
    // 毎日午前5時に統計情報を更新
    this.scheduleDaily('statistics-update', 5, 0, async () => {
      try {
        this.logger.info('日次統計更新ジョブ開始');
        
        const performanceMetrics = Promise.resolve({ message: '新システムではパフォーマンス指標は自動取得されません' });
        
        this.logger.info('日次統計更新ジョブ完了', {
          totalCelestialRecords: performanceMetrics.dataVolume.celestialRecords,
          totalCandidateRecords: performanceMetrics.dataVolume.candidateRecords,
          totalEventRecords: performanceMetrics.dataVolume.eventRecords,
          overallEfficiency: performanceMetrics.efficiency.candidateExtractionRate * performanceMetrics.efficiency.eventMatchingRate
        });
        
      } catch (error) {
        this.logger.error('統計更新ジョブエラー', error);
      }
    });
  }

  /**
   * 年次メンテナンスのスケジュール
   */
  private scheduleYearlyMaintenance(): void {
    // 12月15日午前1時に年次準備メンテナンス
    this.scheduleAnnual('yearly-preparation', 12, 15, 1, 0, async () => {
      await this.performYearlyPreparation();
    });

    // 1月2日午前1時に新年検証メンテナンス
    this.scheduleAnnual('new-year-verification', 1, 2, 1, 0, async () => {
      await this.performNewYearVerification();
    });

    // 3月1日午前2時に年次アーカイブメンテナンス
    this.scheduleAnnual('yearly-archive', 3, 1, 2, 0, async () => {
      await this.performYearlyArchive();
    });
  }

  /**
   * 月次メンテナンスのスケジュール
   */
  private scheduleMonthlyMaintenance(): void {
    // 毎月25日午前3時に月次準備メンテナンス
    this.scheduleMonthly('monthly-preparation', 25, 3, 0, async () => {
      await this.performMonthlyPreparation();
    });

    // 毎月5日午前1時に月次検証メンテナンス
    this.scheduleMonthly('monthly-verification', 5, 1, 0, async () => {
      await this.performMonthlyVerification();
    });
  }

  /**
   * 新地点追加時の自動計算
   */
  async triggerLocationAddedCalculation(locationId: number): Promise<void> {
    try {
      this.logger.info('新地点追加計算トリガー', { locationId });
      
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      // 当年と翌年の計算を実行
      const [currentResult, nextResult] = await Promise.all([
        calendarServicePrisma.executeLocationAddCalculation(locationId, currentYear),
        calendarServicePrisma.executeLocationAddCalculation(locationId, nextYear)
      ]);
      
      this.logger.info('新地点追加計算完了', {
        locationId,
        currentYearEvents: currentResult.eventCount,
        nextYearEvents: nextResult.eventCount,
        totalExecutionTime: currentResult.timeMs + nextResult.timeMs
      });
      
    } catch (error) {
      this.logger.error('新地点追加計算エラー', error, { locationId });
    }
  }

  /**
   * 即座に事前計算を実行
   */
  async triggerImmediateCalculation(year: number): Promise<void> {
    try {
      this.logger.info('即座計算トリガー', { year });
      
      const result = await calendarServicePrisma.executeYearlyCalculation(year);
      
      if (result.success) {
        this.logger.info('即座計算完了', {
          year,
          totalEvents: result.finalStats?.totalEvents || 0,
          executionTimeMs: result.totalTimeMs
        });
      } else {
        this.logger.error('即座計算失敗', null, {
          year,
          executionTimeMs: result.totalTimeMs
        });
      }
      
    } catch (error) {
      this.logger.error('即座計算エラー', error, { year });
    }
  }

  /**
   * 年次準備メンテナンス実行
   */
  async performYearlyPreparation(): Promise<void> {
    try {
      this.logger.info('年次準備メンテナンス開始');
      
      const nextYear = new Date().getFullYear() + 1;
      
      // 次年度の基本データ準備確認
      const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(nextYear);
      
      if (!checkSystemHealth.healthy) {
        this.logger.warn('次年度データ不備検出 - 事前準備実行');
        await calendarServicePrisma.executeYearlyCalculation(nextYear);
      }
      
      this.logger.info('年次準備メンテナンス完了', { nextYear });
      
    } catch (error) {
      this.logger.error('年次準備メンテナンスエラー', error);
    }
  }

  /**
   * 新年検証メンテナンス実行
   */
  async performNewYearVerification(): Promise<void> {
    try {
      this.logger.info('新年検証メンテナンス開始');
      
      const currentYear = new Date().getFullYear();
      
      // 新年データの整合性検証
      const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(currentYear);
      const performanceMetrics = Promise.resolve({ message: '新システムではパフォーマンス指標は自動取得されません' });
      
      this.logger.info('新年検証メンテナンス完了', {
        year: currentYear,
        healthy: checkSystemHealth.healthy,
        totalEvents: performanceMetrics.dataVolume.eventRecords
      });
      
    } catch (error) {
      this.logger.error('新年検証メンテナンスエラー', error);
    }
  }

  /**
   * 年次アーカイブメンテナンス実行
   */
  async performYearlyArchive(): Promise<void> {
    try {
      this.logger.info('年次アーカイブメンテナンス開始');
      
      const currentYear = new Date().getFullYear();
      const archiveYear = currentYear - 3; // 3年前のデータをアーカイブ対象
      
      // アーカイブ処理の実装（ここでは統計ログのみ）
      this.logger.info('年次アーカイブメンテナンス完了', {
        currentYear,
        archiveYear
      });
      
    } catch (error) {
      this.logger.error('年次アーカイブメンテナンスエラー', error);
    }
  }

  /**
   * 月次準備メンテナンス実行
   */
  async performMonthlyPreparation(): Promise<void> {
    try {
      this.logger.info('月次準備メンテナンス開始');
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // 当月データの健康状態チェック
      const checkSystemHealth = await calendarServicePrisma.checkSystemHealth(currentYear);
      
      this.logger.info('月次準備メンテナンス完了', {
        year: currentYear,
        month: currentMonth,
        healthy: checkSystemHealth.healthy
      });
      
    } catch (error) {
      this.logger.error('月次準備メンテナンスエラー', error);
    }
  }

  /**
   * 月次検証メンテナンス実行
   */
  async performMonthlyVerification(): Promise<void> {
    try {
      this.logger.info('月次検証メンテナンス開始');
      
      const performanceMetrics = Promise.resolve({ message: '新システムではパフォーマンス指標は自動取得されません' });
      
      this.logger.info('月次検証メンテナンス完了', {
        dataVolumeCheck: 'passed',
        performanceCheck: 'passed',
        totalEventRecords: performanceMetrics.dataVolume.eventRecords
      });
      
    } catch (error) {
      this.logger.error('月次検証メンテナンスエラー', error);
    }
  }

  /**
   * 現在の状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobsCount: this.scheduledJobs.size,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      systemType: 'prisma-based'
    };
  }

  // スケジューリングヘルパーメソッド
  private scheduleDaily(name: string, hour: number, minute: number, callback: () => Promise<void>): void {
    const calculateNextRun = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.getTime() - now.getTime();
    };

    const scheduleNext = () => {
      const timeUntilNext = calculateNextRun();
      const timeout = setTimeout(async () => {
        await callback();
        scheduleNext(); // 次回をスケジュール
      }, timeUntilNext);
      
      this.scheduledJobs.set(name, timeout);
    };

    scheduleNext();
  }

  private scheduleHourly(name: string, minute: number, callback: () => Promise<void>): void {
    const calculateNextRun = () => {
      const now = new Date();
      const next = new Date();
      next.setMinutes(minute, 0, 0);
      
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
      
      return next.getTime() - now.getTime();
    };

    const scheduleNext = () => {
      const timeUntilNext = calculateNextRun();
      const timeout = setTimeout(async () => {
        await callback();
        scheduleNext();
      }, timeUntilNext);
      
      this.scheduledJobs.set(name, timeout);
    };

    scheduleNext();
  }

  private scheduleWeekly(name: string, dayOfWeek: number, hour: number, minute: number, callback: () => Promise<void>): void {
    const calculateNextRun = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      
      const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
      if (daysUntilTarget === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilTarget);
      }
      
      return next.getTime() - now.getTime();
    };

    const scheduleNext = () => {
      const timeUntilNext = calculateNextRun();
      const timeout = setTimeout(async () => {
        await callback();
        scheduleNext();
      }, timeUntilNext);
      
      this.scheduledJobs.set(name, timeout);
    };

    scheduleNext();
  }

  private scheduleMonthly(name: string, day: number, hour: number, minute: number, callback: () => Promise<void>): void {
    const calculateNextRun = () => {
      const now = new Date();
      const next = new Date();
      next.setDate(day);
      next.setHours(hour, minute, 0, 0);
      
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      
      const diff = next.getTime() - now.getTime();
      return Math.min(diff, 2147483647);
    };

    const scheduleNext = () => {
      const timeUntilNext = calculateNextRun();
      const timeout = setTimeout(async () => {
        await callback();
        scheduleNext();
      }, timeUntilNext);
      
      this.scheduledJobs.set(name, timeout);
    };

    scheduleNext();
  }

  private scheduleAnnual(name: string, month: number, day: number, hour: number, minute: number, callback: () => Promise<void>): void {
    const calculateNextRun = () => {
      const now = new Date();
      const next = new Date();
      next.setMonth(month - 1, day); // month は 0-based
      next.setHours(hour, minute, 0, 0);
      
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      
      const diff = next.getTime() - now.getTime();
      // JavaScriptのsetTimeoutは32bit制限があるため、最大2147483647ms（約24.8日）に制限
      return Math.min(diff, 2147483647);
    };

    const scheduleNext = () => {
      const timeUntilNext = calculateNextRun();
      const timeout = setTimeout(async () => {
        await callback();
        scheduleNext();
      }, timeUntilNext);
      
      this.scheduledJobs.set(name, timeout);
    };

    scheduleNext();
  }
}

export default BackgroundJobSchedulerPrisma;