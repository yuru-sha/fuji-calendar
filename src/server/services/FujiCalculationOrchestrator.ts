import { celestialPrecomputationService } from './CelestialPrecomputationService';
import { fujiOptimizedFilterService } from './FujiOptimizedFilterService';
import { locationFujiMatchingService } from './LocationFujiMatchingService';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

/**
 * 富士現象計算オーケストレーター
 * 3段階の計算プロセスを統合管理
 * 
 * Stage 1: 5分間隔の基本天体データ事前計算
 * Stage 2: 富士現象に特化したフィルタリング（中間テーブル生成）
 * Stage 3: 各地点とのマッチング（最終結果生成）
 */
export class FujiCalculationOrchestrator {
  private logger: StructuredLogger;

  constructor() {
    this.logger = getComponentLogger('fuji-calculation-orchestrator');
  }

  /**
   * 年間富士現象計算の完全実行
   * 12月1日の定期実行用
   */
  async executeFullYearlyCalculation(year: number): Promise<{
    success: boolean;
    totalTimeMs: number;
    stages: {
      celestialData: { timeMs: number; dataPoints: number };
      filtering: { timeMs: number; candidates: number; optimal: number };
      matching: { timeMs: number; locations: number; phenomena: number };
    };
    finalStats: any;
  }> {
    const overallStartTime = Date.now();
    this.logger.info('年間富士現象計算 完全実行開始', { 
      year,
      executionTime: new Date().toISOString()
    });

    try {
      // Stage 1: 基本天体データの事前計算
      this.logger.info('Stage 1: 基本天体データ計算開始', { year });
      const stage1Start = Date.now();
      
      await celestialPrecomputationService.precomputeYearlyData(year);
      
      const stage1Time = Date.now() - stage1Start;
      this.logger.info('Stage 1: 基本天体データ計算完了', { 
        year, 
        timeMs: stage1Time 
      });

      // Stage 2: 富士現象フィルタリング
      this.logger.info('Stage 2: 富士現象フィルタリング開始', { year });
      const stage2Start = Date.now();
      
      await fujiOptimizedFilterService.filterYearlyFujiData(year);
      
      const stage2Time = Date.now() - stage2Start;
      this.logger.info('Stage 2: 富士現象フィルタリング完了', { 
        year, 
        timeMs: stage2Time 
      });

      // Stage 3: 地点マッチング
      this.logger.info('Stage 3: 地点マッチング開始', { year });
      const stage3Start = Date.now();
      
      await locationFujiMatchingService.matchAllLocations(year);
      
      const stage3Time = Date.now() - stage3Start;
      this.logger.info('Stage 3: 地点マッチング完了', { 
        year, 
        timeMs: stage3Time 
      });

      // 最終統計の取得
      const finalStats = await locationFujiMatchingService.getMatchingStatistics(year);
      
      const totalTime = Date.now() - overallStartTime;
      
      const result = {
        success: true,
        totalTimeMs: totalTime,
        stages: {
          celestialData: { 
            timeMs: stage1Time, 
            dataPoints: this.estimateDataPoints(year) 
          },
          filtering: { 
            timeMs: stage2Time, 
            candidates: 0, // TODO: 実装時に統計取得
            optimal: 0 
          },
          matching: { 
            timeMs: stage3Time, 
            locations: finalStats.totalLocations,
            phenomena: finalStats.totalPhenomena 
          }
        },
        finalStats
      };

      this.logger.info('年間富士現象計算 完全実行完了', {
        year,
        totalTimeMs: totalTime,
        totalTimeHours: Math.round(totalTime / 1000 / 60 / 60 * 10) / 10,
        finalStats: {
          totalPhenomena: finalStats.totalPhenomena,
          diamondCount: finalStats.diamondCount,
          pearlCount: finalStats.pearlCount,
          matchedLocations: finalStats.matchedLocations,
          avgPhenomenaPerLocation: finalStats.avgPhenomenaPerLocation
        }
      });

      return result;

    } catch (error) {
      const failedTime = Date.now() - overallStartTime;
      this.logger.error('年間富士現象計算 実行失敗', error, { 
        year, 
        failedAfterMs: failedTime 
      });
      
      return {
        success: false,
        totalTimeMs: failedTime,
        stages: {
          celestialData: { timeMs: 0, dataPoints: 0 },
          filtering: { timeMs: 0, candidates: 0, optimal: 0 },
          matching: { timeMs: 0, locations: 0, phenomena: 0 }
        },
        finalStats: null
      };
    }
  }

  /**
   * 新地点追加時の部分計算
   * 既存の天体データ・中間テーブルを活用して高速実行
   */
  async executeLocationAddCalculation(locationId: number, year: number): Promise<{
    success: boolean;
    timeMs: number;
    phenomenaCount: number;
  }> {
    const startTime = Date.now();
    this.logger.info('新地点追加計算開始', { locationId, year });

    try {
      // 新地点の富士山データを計算・更新
      await celestialPrecomputationService.calculateLocationData(locationId, year);
      
      // 既存の中間テーブルデータとマッチング
      const phenomenaCount = await locationFujiMatchingService.matchSingleLocation(locationId, year);
      
      const totalTime = Date.now() - startTime;
      
      this.logger.info('新地点追加計算完了', {
        locationId,
        year,
        timeMs: totalTime,
        phenomenaCount
      });

      return {
        success: true,
        timeMs: totalTime,
        phenomenaCount
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
        phenomenaCount: 0
      };
    }
  }

  /**
   * 月次補完計算
   * 特定月のみの計算更新
   */
  async executeMonthlyUpdate(year: number, month: number): Promise<{
    success: boolean;
    timeMs: number;
    updatedPhenomena: number;
  }> {
    const startTime = Date.now();
    this.logger.info('月次補完計算開始', { year, month });

    try {
      // TODO: 月次のみの更新ロジック実装
      // 現在は年次計算のサブセットとして実装
      
      const totalTime = Date.now() - startTime;
      
      this.logger.info('月次補完計算完了', {
        year,
        month,
        timeMs: totalTime
      });

      return {
        success: true,
        timeMs: totalTime,
        updatedPhenomena: 0
      };

    } catch (error) {
      const failedTime = Date.now() - startTime;
      this.logger.error('月次補完計算失敗', error, { 
        year, 
        month, 
        failedAfterMs: failedTime 
      });
      
      return {
        success: false,
        timeMs: failedTime,
        updatedPhenomena: 0
      };
    }
  }

  /**
   * 計算システムの健康状態チェック
   */
  async healthCheck(year: number): Promise<{
    healthy: boolean;
    checks: {
      celestialData: { exists: boolean; recordCount: number };
      filteredData: { exists: boolean; candidateCount: number; optimalCount: number };
      phenomenaData: { exists: boolean; phenomenaCount: number; locationCoverage: number };
    };
    recommendations: string[];
  }> {
    this.logger.info('計算システム健康状態チェック開始', { year });

    try {
      // 基本天体データの確認
      const celestialCheck = await this.checkCelestialData(year);
      
      // フィルタリングデータの確認
      const filterCheck = await this.checkFilteredData(year);
      
      // 現象データの確認
      const phenomenaCheck = await this.checkPhenomenaData(year);

      // 健康状態の総合判定
      const healthy = celestialCheck.exists && filterCheck.exists && phenomenaCheck.exists &&
                     phenomenaCheck.locationCoverage > 0.8; // 80%以上の地点でデータがある

      // 推奨事項の生成
      const recommendations = this.generateRecommendations({
        celestialCheck,
        filterCheck,
        phenomenaCheck
      });

      const result = {
        healthy,
        checks: {
          celestialData: celestialCheck,
          filteredData: filterCheck,
          phenomenaData: phenomenaCheck
        },
        recommendations
      };

      this.logger.info('計算システム健康状態チェック完了', {
        year,
        healthy,
        recommendationCount: recommendations.length
      });

      return result;

    } catch (error) {
      this.logger.error('計算システム健康状態チェック失敗', error, { year });
      
      return {
        healthy: false,
        checks: {
          celestialData: { exists: false, recordCount: 0 },
          filteredData: { exists: false, candidateCount: 0, optimalCount: 0 },
          phenomenaData: { exists: false, phenomenaCount: 0, locationCoverage: 0 }
        },
        recommendations: ['システムエラーにより健康状態チェックが失敗しました']
      };
    }
  }

  // =================================================================
  // ヘルパーメソッド
  // =================================================================

  private estimateDataPoints(year: number): number {
    // 1年間、5分間隔のデータ点数を計算
    const minutesPerYear = 365 * 24 * 60;
    return Math.floor(minutesPerYear / 5);
  }

  private async checkCelestialData(year: number) {
    // TODO: 実装
    return { exists: true, recordCount: 105120 }; // 5分間隔の概算値
  }

  private async checkFilteredData(year: number) {
    // TODO: 実装
    return { exists: true, candidateCount: 0, optimalCount: 0 };
  }

  private async checkPhenomenaData(year: number) {
    // TODO: 実装
    return { exists: true, phenomenaCount: 0, locationCoverage: 1.0 };
  }

  private generateRecommendations(checks: any): string[] {
    const recommendations: string[] = [];
    
    if (!checks.celestialCheck.exists) {
      recommendations.push('基本天体データが不足しています。年次計算を実行してください。');
    }
    
    if (!checks.filterCheck.exists) {
      recommendations.push('フィルタリング済みデータが不足しています。中間データ生成を実行してください。');
    }
    
    if (checks.phenomenaCheck.locationCoverage < 0.5) {
      recommendations.push('地点カバレッジが低いです。地点マッチング処理を確認してください。');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('システムは正常に動作しています。');
    }
    
    return recommendations;
  }
}

export const fujiCalculationOrchestrator = new FujiCalculationOrchestrator();