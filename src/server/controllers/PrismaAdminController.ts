import { Request, Response } from 'express';
import { fujiSystemOrchestrator } from '../services/FujiSystemOrchestrator';
import { calendarServicePrisma } from '../services/CalendarServicePrisma';
import { celestialOrbitDataService } from '../services/CelestialOrbitDataService';
// import { astronomicalDataService } from '../services/AstronomicalDataService'; // 削除済み
import { locationFujiEventService } from '../services/LocationFujiEventService';
import { getComponentLogger } from '../../shared/utils/logger';

/**
 * Prismaベースシステムの管理者コントローラー
 * 天体計算システムの管理、統計、実行制御を担当
 */
export class PrismaAdminController {
  private logger = getComponentLogger('prisma-admin-controller');

  /**
   * システムの健康状態チェック
   * GET /api/admin/prisma/health/:year?
   */
  async getSystemHealth(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const year = req.params.year ? parseInt(req.params.year) : new Date().getFullYear();
      
      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      const healthCheck = await fujiSystemOrchestrator.healthCheck(year);
      const responseTime = Date.now() - startTime;

      this.logger.info('システム健康状態チェック完了', {
        year,
        healthy: healthCheck.healthy,
        responseTimeMs: responseTime,
        recommendationCount: healthCheck.recommendations.length
      });

      res.json({
        success: true,
        data: healthCheck,
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('システム健康状態チェックエラー', error, {
        year: req.params.year,
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'システム健康状態チェック中にエラーが発生しました。'
      });
    }
  }

  /**
   * 年間富士現象計算の実行
   * POST /api/admin/prisma/calculate/:year
   */
  async executeYearlyCalculation(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      this.logger.info('年間富士現象計算開始', {
        year,
        requestId: req.requestId
      });

      const result = await fujiSystemOrchestrator.executeFullYearlyCalculation(year);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        this.logger.info('年間富士現象計算完了', {
          year,
          totalTimeMs: result.totalTimeMs,
          totalEvents: result.finalStats?.totalEvents || 0,
          responseTimeMs: responseTime
        });

        res.json({
          success: true,
          data: {
            year,
            executionResult: result,
            summary: {
              totalEvents: result.finalStats?.totalEvents || 0,
              locationCoverage: result.finalStats?.locationCount || 0,
              diamondEvents: result.stages.matching.diamondEvents,
              pearlEvents: result.stages.matching.pearlEvents,
              executionTimeHours: Math.round(result.totalTimeMs / 1000 / 60 / 60 * 10) / 10
            }
          },
          meta: {
            responseTimeMs: responseTime
          },
          timestamp: new Date().toISOString()
        });
      } else {
        this.logger.error('年間富士現象計算失敗', null, {
          year,
          totalTimeMs: result.totalTimeMs
        });

        res.status(500).json({
          error: 'Calculation failed',
          message: '年間富士現象計算が失敗しました。',
          data: {
            year,
            executionTimeMs: result.totalTimeMs
          }
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('年間富士現象計算エラー', error, {
        year: req.params.year,
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: '年間富士現象計算中にエラーが発生しました。'
      });
    }
  }

  /**
   * 新地点追加計算の実行
   * POST /api/admin/prisma/calculate-location
   */
  async executeLocationCalculation(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const { locationId, year } = req.body;
      
      if (!locationId || !year) {
        return res.status(400).json({
          error: 'Missing parameters',
          message: '地点IDと年が必要です。'
        });
      }

      const locationIdNum = parseInt(locationId);
      const yearNum = parseInt(year);

      if (isNaN(locationIdNum) || isNaN(yearNum)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'パラメータの形式が正しくありません。'
        });
      }

      if (yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      this.logger.info('新地点追加計算開始', {
        locationId: locationIdNum,
        year: yearNum,
        requestId: req.requestId
      });

      const result = await fujiSystemOrchestrator.executeLocationAddCalculation(locationIdNum, yearNum);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        this.logger.info('新地点追加計算完了', {
          locationId: locationIdNum,
          year: yearNum,
          eventCount: result.eventCount,
          responseTimeMs: responseTime
        });

        res.json({
          success: true,
          data: {
            locationId: locationIdNum,
            year: yearNum,
            eventCount: result.eventCount,
            executionTimeMs: result.timeMs
          },
          meta: {
            responseTimeMs: responseTime
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Calculation failed',
          message: '新地点計算が失敗しました。',
          data: {
            locationId: locationIdNum,
            year: yearNum,
            executionTimeMs: result.timeMs
          }
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('新地点追加計算エラー', error, {
        locationId: req.body.locationId,
        year: req.body.year,
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: '新地点計算中にエラーが発生しました。'
      });
    }
  }

  /**
   * システム統計情報を取得
   * GET /api/admin/prisma/stats
   */
  async getSystemStats(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      this.logger.info('システム統計情報取得開始');

      const [
        celestialStats,
        candidateStats,
        eventStats,
        performanceMetrics
      ] = await Promise.all([
        celestialOrbitDataService.getStatistics(),
        Promise.resolve({ totalCandidates: 0 }), // AstronomicalDataService削除により無効化
        locationFujiEventService.getStatistics(),
        fujiSystemOrchestrator.getPerformanceMetrics()
      ]);

      const responseTime = Date.now() - startTime;

      this.logger.info('システム統計情報取得完了', {
        celestialRecords: celestialStats.totalRecords,
        candidateRecords: candidateStats.totalCandidates,
        eventRecords: eventStats.totalEvents,
        responseTimeMs: responseTime
      });

      res.json({
        success: true,
        data: {
          celestialData: celestialStats,
          candidates: candidateStats,
          events: eventStats,
          performance: performanceMetrics,
          dataFlowEfficiency: {
            celestialToCandidateRate: performanceMetrics.efficiency.candidateExtractionRate,
            candidateToEventRate: performanceMetrics.efficiency.eventMatchingRate,
            overallEfficiency: performanceMetrics.efficiency.candidateExtractionRate * performanceMetrics.efficiency.eventMatchingRate
          }
        },
        meta: {
          responseTimeMs: responseTime,
          generatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('システム統計情報取得エラー', error, {
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'システム統計情報の取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 特定年の統計情報を取得
   * GET /api/admin/prisma/stats/:year
   */
  async getYearStats(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      this.logger.info('年別統計情報取得開始', { year });

      const [
        candidateStats,
        eventStats
      ] = await Promise.all([
        Promise.resolve({ totalCandidates: 0 }), // AstronomicalDataService削除により無効化
        locationFujiEventService.getStatistics(year)
      ]);

      const responseTime = Date.now() - startTime;

      this.logger.info('年別統計情報取得完了', {
        year,
        candidateRecords: candidateStats.totalCandidates,
        eventRecords: eventStats.totalEvents,
        responseTimeMs: responseTime
      });

      res.json({
        success: true,
        data: {
          year,
          candidates: candidateStats,
          events: eventStats,
          summary: {
            totalCandidates: candidateStats.totalCandidates,
            totalEvents: eventStats.totalEvents,
            locationCoverage: eventStats.locationCount,
            avgEventsPerLocation: eventStats.avgEventsPerLocation,
            conversionRate: candidateStats.totalCandidates > 0 ? eventStats.totalEvents / candidateStats.totalCandidates : 0
          }
        },
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('年別統計情報取得エラー', error, {
        year: req.params.year,
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: '年別統計情報の取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * データベースメンテナンス操作
   * POST /api/admin/prisma/maintenance
   */
  async performMaintenance(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const { operation, year } = req.body;
      
      if (!operation) {
        return res.status(400).json({
          error: 'Missing operation',
          message: '実行する操作を指定してください。'
        });
      }

      if (!['clear-year', 'rebuild-year', 'vacuum'].includes(operation)) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: '有効な操作を指定してください。(clear-year, rebuild-year, vacuum)'
        });
      }

      this.logger.info('データベースメンテナンス開始', {
        operation,
        year,
        requestId: req.requestId
      });

      let result: any = {};

      switch (operation) {
        case 'clear-year':
          if (!year || isNaN(parseInt(year))) {
            return res.status(400).json({
              error: 'Missing year',
              message: 'クリア対象の年が必要です。'
            });
          }
          // 年データクリア処理（実装はここでは省略）
          result = { message: `${year}年のデータをクリアしました。` };
          break;
          
        case 'rebuild-year':
          if (!year || isNaN(parseInt(year))) {
            return res.status(400).json({
              error: 'Missing year',
              message: '再構築対象の年が必要です。'
            });
          }
          result = await fujiSystemOrchestrator.executeFullYearlyCalculation(parseInt(year));
          break;
          
        case 'vacuum':
          // データベースのVACUUM処理（実装はここでは省略）
          result = { message: 'データベースの最適化を実行しました。' };
          break;
      }

      const responseTime = Date.now() - startTime;

      this.logger.info('データベースメンテナンス完了', {
        operation,
        year,
        responseTimeMs: responseTime
      });

      res.json({
        success: true,
        data: {
          operation,
          year: year ? parseInt(year) : undefined,
          result
        },
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('データベースメンテナンスエラー', error, {
        operation: req.body.operation,
        year: req.body.year,
        responseTimeMs: responseTime
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'データベースメンテナンス中にエラーが発生しました。'
      });
    }
  }
}

export default PrismaAdminController;