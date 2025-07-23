import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
import { celestialOrbitDataService } from './CelestialOrbitDataService';
import { astronomicalDataService } from './AstronomicalDataService';
import { locationFujiEventService } from './LocationFujiEventService';
import { PrismaClientManager } from '../database/prisma';

/**
 * 富士現象計算システムオーケストレーター（Prismaベース）
 * 3段階の処理を統合管理：
 * Stage 1: 5分刻みの基本天体データ生成 (CelestialOrbitData)
 * Stage 2: 富士現象候補の抽出・中間データ生成 (AstronomicalData)
 * Stage 3: 地点マッチング・最終結果生成 (LocationFujiEvent)
 */
export class FujiSystemOrchestrator {
  private logger: StructuredLogger;

  constructor() {
    this.logger = getComponentLogger('fuji-system-orchestrator');
  }

  /**
   * 年間富士現象計算の完全実行（12月1日定期実行用）
   */
  async executeFullYearlyCalculation(year: number): Promise<{
    success: boolean;
    totalTimeMs: number;
    stages: {
      celestialData: { timeMs: number; dataPoints: number };
      candidates: { timeMs: number; totalCandidates: number; diamondCandidates: number; pearlCandidates: number };
      matching: { timeMs: number; totalEvents: number; locationCount: number; diamondEvents: number; pearlEvents: number };
    };
    finalStats: any;
  }> {
    const overallStartTime = Date.now();
    this.logger.info('富士現象計算システム完全実行開始', {
      year,
      executionTime: new Date().toISOString()
    });

    try {
      // Stage 1: 基本天体データの生成
      this.logger.info('Stage 1: 基本天体データ生成開始', { year });
      const stage1Start = Date.now();
      
      const celestialResult = await celestialOrbitDataService.generateYearlyData(year);
      
      if (!celestialResult.success) {
        throw new Error('基本天体データ生成に失敗しました');
      }

      const stage1Time = Date.now() - stage1Start;
      this.logger.info('Stage 1: 基本天体データ生成完了', {
        year,
        timeMs: stage1Time,
        dataPoints: celestialResult.totalDataPoints
      });

      // Stage 2: 富士現象候補の抽出
      this.logger.info('Stage 2: 富士現象候補抽出開始', { year });
      const stage2Start = Date.now();
      
      const candidatesResult = await astronomicalDataService.generateYearlyCandidates(year);
      
      if (!candidatesResult.success) {
        throw new Error('富士現象候補抽出に失敗しました');
      }

      const stage2Time = Date.now() - stage2Start;
      this.logger.info('Stage 2: 富士現象候補抽出完了', {
        year,
        timeMs: stage2Time,
        totalCandidates: candidatesResult.totalCandidates,
        diamondCandidates: candidatesResult.diamondCandidates,
        pearlCandidates: candidatesResult.pearlCandidates
      });

      // Stage 3: 地点マッチング
      this.logger.info('Stage 3: 地点マッチング開始', { year });
      const stage3Start = Date.now();
      
      const matchingResult = await locationFujiEventService.matchAllLocations(year);
      
      if (!matchingResult.success) {
        throw new Error('地点マッチングに失敗しました');
      }

      const stage3Time = Date.now() - stage3Start;
      this.logger.info('Stage 3: 地点マッチング完了', {
        year,
        timeMs: stage3Time,
        totalEvents: matchingResult.totalEvents,
        locationCount: matchingResult.locationCount
      });

      // 最終統計の取得
      const finalStats = await this.getFinalStatistics(year);
      
      const totalTime = Date.now() - overallStartTime;
      
      const result = {
        success: true,
        totalTimeMs: totalTime,
        stages: {
          celestialData: {
            timeMs: stage1Time,
            dataPoints: celestialResult.totalDataPoints
          },
          candidates: {
            timeMs: stage2Time,
            totalCandidates: candidatesResult.totalCandidates,
            diamondCandidates: candidatesResult.diamondCandidates,
            pearlCandidates: candidatesResult.pearlCandidates
          },
          matching: {
            timeMs: stage3Time,
            totalEvents: matchingResult.totalEvents,
            locationCount: matchingResult.locationCount,
            diamondEvents: matchingResult.diamondEvents,
            pearlEvents: matchingResult.pearlEvents
          }
        },
        finalStats
      };

      this.logger.info('富士現象計算システム完全実行完了', {
        year,
        totalTimeMs: totalTime,
        totalTimeHours: Math.round(totalTime / 1000 / 60 / 60 * 10) / 10,
        finalStats: {
          totalEvents: finalStats.totalEvents,
          locationCoverage: finalStats.locationCount,
          diamondEvents: finalStats.eventTypeDistribution.diamond_sunrise + finalStats.eventTypeDistribution.diamond_sunset,
          pearlEvents: finalStats.eventTypeDistribution.pearl_moonrise + finalStats.eventTypeDistribution.pearl_moonset
        }
      });

      return result;

    } catch (error) {
      const failedTime = Date.now() - overallStartTime;
      this.logger.error('富士現象計算システム実行失敗', error, {
        year,
        failedAfterMs: failedTime
      });
      
      return {
        success: false,
        totalTimeMs: failedTime,
        stages: {
          celestialData: { timeMs: 0, dataPoints: 0 },
          candidates: { timeMs: 0, totalCandidates: 0, diamondCandidates: 0, pearlCandidates: 0 },
          matching: { timeMs: 0, totalEvents: 0, locationCount: 0, diamondEvents: 0, pearlEvents: 0 }
        },
        finalStats: null
      };
    }
  }

  /**
   * Stage 2からの実行（Stage 1のデータが既に存在する場合）
   */
  async executeFromStage2(year: number): Promise<{
    success: boolean;
    totalTimeMs: number;
    stages: {
      candidates: {
        timeMs: number;
        totalCandidates: number;
        diamondCandidates: number;
        pearlCandidates: number;
      };
      matching: {
        timeMs: number;
        totalEvents: number;
        locationCount: number;
        diamondEvents: number;
        pearlEvents: number;
      };
    };
    finalStats: any;
  }> {
    const overallStartTime = Date.now();
    this.logger.info('Stage 2からの富士現象計算系統実行開始', { year });
    
    try {
      console.log('🚀 Stage 2: 天体データから富士現象の候補を抽出...');
      const stage2StartTime = Date.now();
      const candidatesResult = await this.astronomicalDataService.extractAllCandidates(year);
      const stage2Time = Date.now() - stage2StartTime;
      
      this.logger.info('Stage 2完了', {
        year,
        timeMs: stage2Time,
        totalCandidates: candidatesResult?.totalCandidates || 0
      });
      
      console.log('🚀 Stage 3: 各地点での富士現象イベントをマッチング...');
      const stage3StartTime = Date.now();
      const matchingResult = await this.locationFujiEventService.matchAllLocationEvents(year);
      const stage3Time = Date.now() - stage3StartTime;
      
      this.logger.info('Stage 3完了', {
        year,
        timeMs: stage3Time,
        totalEvents: matchingResult.totalEvents,
        locationCount: matchingResult.locationCount
      });
      
      // 最終統計の取得
      const finalStats = await this.getFinalStatistics(year);
      
      const totalTime = Date.now() - overallStartTime;
      
      const result = {
        success: true,
        totalTimeMs: totalTime,
        stages: {
          candidates: {
            timeMs: stage2Time,
            totalCandidates: candidatesResult.totalCandidates,
            diamondCandidates: candidatesResult.diamondCandidates,
            pearlCandidates: candidatesResult.pearlCandidates
          },
          matching: {
            timeMs: stage3Time,
            totalEvents: matchingResult.totalEvents,
            locationCount: matchingResult.locationCount,
            diamondEvents: matchingResult.diamondEvents,
            pearlEvents: matchingResult.pearlEvents
          }
        },
        finalStats: {
          totalEvents: finalStats.totalEvents,
          locationCoverage: finalStats.locationCount,
          diamondEvents: finalStats.eventTypeDistribution.diamond_sunrise + finalStats.eventTypeDistribution.diamond_sunset,
          pearlEvents: finalStats.eventTypeDistribution.pearl_moonrise + finalStats.eventTypeDistribution.pearl_moonset
        }
      };
      
      this.logger.info('Stage 2からの富士現象計算系統実行完了', {
        year,
        totalTimeMs: totalTime,
        totalEvents: finalStats.totalEvents
      });
      
      return result;
      
    } catch (error) {
      const failedTime = Date.now() - overallStartTime;
      this.logger.error('Stage 2からの富士現象計算系統実行失敗', error, {
        year,
        failedAfterMs: failedTime
      });
      
      return {
        success: false,
        totalTimeMs: failedTime,
        stages: {
          candidates: {
            timeMs: 0,
            totalCandidates: 0,
            diamondCandidates: 0,
            pearlCandidates: 0
          },
          matching: {
            timeMs: 0,
            totalEvents: 0,
            locationCount: 0,
            diamondEvents: 0,
            pearlEvents: 0
          }
        },
        finalStats: null
      };
    }
  }

  /**
   * 新地点追加時の部分計算
   * 既存の天体データ・中間データを活用して高速実行
   */
  async executeLocationAddCalculation(locationId: number, year: number): Promise<{
    success: boolean;
    timeMs: number;
    eventCount: number;
  }> {
    const startTime = Date.now();
    this.logger.info('新地点追加計算開始', { locationId, year });

    try {
      // 既存の中間データとマッチング
      const result = await locationFujiEventService.matchSingleLocation(locationId, year);
      
      if (!result.success) {
        throw new Error('新地点計算に失敗しました');
      }

      const totalTime = Date.now() - startTime;
      
      this.logger.info('新地点追加計算完了', {
        locationId,
        year,
        timeMs: totalTime,
        eventCount: result.eventCount
      });

      return {
        success: true,
        timeMs: totalTime,
        eventCount: result.eventCount
      };

    } catch (error) {
      const failedTime = Date.now() - startTime;
      this.logger.error('新地点追加計算失敗', error, {
        locationId,
        year,
        failedAfterMs: failedTime
      });
      
      return {
        success: false,
        timeMs: failedTime,
        eventCount: 0
      };
    }
  }

  /**
   * システムの健康状態チェック
   */
  async healthCheck(year: number): Promise<{
    healthy: boolean;
    checks: {
      database: { connected: boolean };
      celestialData: { exists: boolean; recordCount: number };
      candidateData: { exists: boolean; candidateCount: number };
      eventData: { exists: boolean; eventCount: number; locationCoverage: number };
    };
    recommendations: string[];
  }> {
    this.logger.info('システム健康状態チェック開始', { year });

    try {
      // データベース接続チェック
      const dbConnected = await PrismaClientManager.testConnection();

      // 基本天体データの確認
      const celestialCount = await celestialOrbitDataService.getDataPointCount(year);
      const celestialExists = celestialCount > 0;

      // 候補データの確認
      const candidateStats = await astronomicalDataService.getStatistics(year);
      const candidateExists = candidateStats.totalCandidates > 0;

      // イベントデータの確認
      const eventStats = await locationFujiEventService.getStatistics(year);
      const eventExists = eventStats.totalEvents > 0;
      const locationCoverage = eventStats.locationCount > 0 ? eventStats.avgEventsPerLocation / 50 : 0; // 50イベント/地点を目安

      // 健康状態の総合判定
      const healthy = dbConnected && celestialExists && candidateExists && eventExists && locationCoverage > 0.5;

      // 推奨事項の生成
      const recommendations = this.generateRecommendations({
        dbConnected,
        celestialExists,
        candidateExists,
        eventExists,
        locationCoverage
      });

      const result = {
        healthy,
        checks: {
          database: { connected: dbConnected },
          celestialData: { exists: celestialExists, recordCount: celestialCount },
          candidateData: { exists: candidateExists, candidateCount: candidateStats.totalCandidates },
          eventData: { exists: eventExists, eventCount: eventStats.totalEvents, locationCoverage }
        },
        recommendations
      };

      this.logger.info('システム健康状態チェック完了', {
        year,
        healthy,
        recommendationCount: recommendations.length
      });

      return result;

    } catch (error) {
      this.logger.error('システム健康状態チェック失敗', error, { year });
      
      return {
        healthy: false,
        checks: {
          database: { connected: false },
          celestialData: { exists: false, recordCount: 0 },
          candidateData: { exists: false, candidateCount: 0 },
          eventData: { exists: false, eventCount: 0, locationCoverage: 0 }
        },
        recommendations: ['システムエラーにより健康状態チェックが失敗しました']
      };
    }
  }

  /**
   * 最終統計情報を取得
   */
  private async getFinalStatistics(year: number): Promise<any> {
    const [
      celestialStats,
      candidateStats,
      eventStats
    ] = await Promise.all([
      celestialOrbitDataService.getStatistics(),
      astronomicalDataService.getStatistics(year),
      locationFujiEventService.getStatistics(year)
    ]);

    return {
      celestialData: celestialStats,
      candidates: candidateStats,
      events: eventStats,
      totalEvents: eventStats.totalEvents,
      locationCount: eventStats.locationCount,
      eventTypeDistribution: eventStats.eventTypeDistribution,
      accuracyDistribution: eventStats.accuracyDistribution,
      avgEventsPerLocation: eventStats.avgEventsPerLocation
    };
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(checks: {
    dbConnected: boolean;
    celestialExists: boolean;
    candidateExists: boolean;
    eventExists: boolean;
    locationCoverage: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (!checks.dbConnected) {
      recommendations.push('データベース接続が失敗しています。接続設定を確認してください。');
    }
    
    if (!checks.celestialExists) {
      recommendations.push('基本天体データが不足しています。CelestialOrbitDataService.generateYearlyData()を実行してください。');
    }
    
    if (!checks.candidateExists) {
      recommendations.push('富士現象候補データが不足しています。AstronomicalDataService.generateYearlyCandidates()を実行してください。');
    }
    
    if (!checks.eventExists) {
      recommendations.push('地点別イベントデータが不足しています。LocationFujiEventService.matchAllLocations()を実行してください。');
    }
    
    if (checks.locationCoverage < 0.5) {
      recommendations.push('地点カバレッジが低いです。地点の富士山データ設定を確認してください。');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('システムは正常に動作しています。');
    }
    
    return recommendations;
  }

  /**
   * パフォーマンス統計を取得
   */
  async getPerformanceMetrics(): Promise<{
    dataVolume: {
      celestialRecords: number;
      candidateRecords: number;
      eventRecords: number;
    };
    efficiency: {
      candidateExtractionRate: number; // 候補/天体データ比率
      eventMatchingRate: number;       // イベント/候補比率
    };
    systemLoad: {
      averageEventCalculationTime: number;
      recommendedBatchSize: number;
    };
  }> {
    const [
      celestialStats,
      candidateStats,
      eventStats
    ] = await Promise.all([
      celestialOrbitDataService.getStatistics(),
      astronomicalDataService.getStatistics(),
      locationFujiEventService.getStatistics()
    ]);

    const candidateExtractionRate = celestialStats.totalRecords > 0 ? 
      candidateStats.totalCandidates / celestialStats.totalRecords : 0;
    
    const eventMatchingRate = candidateStats.totalCandidates > 0 ? 
      eventStats.totalEvents / candidateStats.totalCandidates : 0;

    return {
      dataVolume: {
        celestialRecords: celestialStats.totalRecords,
        candidateRecords: candidateStats.totalCandidates,
        eventRecords: eventStats.totalEvents
      },
      efficiency: {
        candidateExtractionRate,
        eventMatchingRate
      },
      systemLoad: {
        averageEventCalculationTime: 50, // ms（実測値に基づいて調整）
        recommendedBatchSize: Math.max(100, Math.floor(candidateStats.totalCandidates / 100))
      }
    };
  }
}

export const fujiSystemOrchestrator = new FujiSystemOrchestrator();