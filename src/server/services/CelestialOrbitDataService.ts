import { prisma } from '../database/prisma';
import { CelestialOrbitData, Prisma } from '@prisma/client';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
import { astronomicalCalculator } from './AstronomicalCalculatorAstronomyEngine';

interface CelestialDataPoint {
  date: Date;
  time: Date;
  hour: number;
  minute: number;
  celestialType: 'sun' | 'moon';
  azimuth: number;
  elevation: number;
  visible: boolean;
  moonPhase?: number;
  moonIllumination?: number;
  season?: string;
  timeOfDay?: string;
}

/**
 * 天体軌道データサービス（5分刻み基本データ）
 * CelestialOrbitDataテーブルの管理を担当
 */
export class CelestialOrbitDataService {
  private logger: StructuredLogger;

  constructor() {
    this.logger = getComponentLogger('celestial-orbit-data');
  }

  /**
   * 年間の天体軌道データを生成・保存
   * 太陽と月の5分刻みデータを計算
   */
  async generateYearlyData(year: number): Promise<{
    success: boolean;
    totalDataPoints: number;
    timeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.info('年間天体軌道データ生成開始', { year });

    try {
      // 既存データを削除
      await this.clearYearData(year);

      // 2週間ごとに処理してスクリプトの安定性を向上（途中で落ちても復旧しやすく）
      const startDate = new Date(year, 0, 1); // 年始
      const endDate = new Date(year + 1, 0, 0); // 年末
      let currentPeriodStart = new Date(startDate);
      let periodCount = 0;
      
      while (currentPeriodStart < endDate) {
        periodCount++;
        
        // 2週間後の日付を計算（ただし年末は超えない）
        const currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 13); // 14日間（2週間）
        if (currentPeriodEnd > endDate) {
          currentPeriodEnd.setTime(endDate.getTime());
        }
        
        console.log(`\n📅 ${year}年 第${periodCount}期間の天体データ生成開始...`);
        console.log(`   📆 ${currentPeriodStart.toISOString().split('T')[0]} ～ ${currentPeriodEnd.toISOString().split('T')[0]}`);
        
        this.logger.info('期間別天体データ生成開始', {
          year,
          period: periodCount,
          startDate: currentPeriodStart.toISOString().split('T')[0],
          endDate: currentPeriodEnd.toISOString().split('T')[0]
        });
        
        const periodDataPoints: CelestialDataPoint[] = [];
        let currentDate = new Date(currentPeriodStart);
        let dayCount = 0;
        
        while (currentDate <= currentPeriodEnd) {
          dayCount++;
          
          try {
            // 1日分のデータを生成
            const dailyData = await this.generateDailyData(currentDate);
            periodDataPoints.push(...dailyData);
            
            // 3日ごとにプログレス表示（より細かく監視）
            if (dayCount % 3 === 0) {
              const memUsage = process.memoryUsage();
              const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
              const totalProgress = Math.round(((currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100);
              console.log(`  📊 ${currentDate.toISOString().split('T')[0]} - データ: ${periodDataPoints.length}件, メモリ: ${heapUsed}MB (全体: ${totalProgress}%)`);
            }
            
          } catch (dayError) {
            this.logger.error('日次データ生成エラー', {
              year,
              period: periodCount,
              date: currentDate.toISOString().split('T')[0],
              error: dayError.message
            });
            console.warn(`⚠️  ${currentDate.toISOString().split('T')[0]} のデータ生成をスキップ: ${dayError.message}`);
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 2週間分のデータを一括保存（バッチ処理で動作を安定化）
        if (periodDataPoints.length > 0) {
          try {
            const batchSize = 200; // さらに小さなバッチサイズで最大限の安定性を確保
            const totalBatches = Math.ceil(periodDataPoints.length / batchSize);
            
            console.log(`  💾 第${periodCount}期間データ保存中: ${periodDataPoints.length}件 (${totalBatches}バッチ)`);
            
            for (let i = 0; i < periodDataPoints.length; i += batchSize) {
              const batch = periodDataPoints.slice(i, i + batchSize);
              await this.insertDataPointsBatch(batch);
              
              const batchNum = Math.floor(i / batchSize) + 1;
              // より頻繁なプログレス表示で進捗を可視化
              if (batchNum % 3 === 0 || batchNum === totalBatches) {
                const batchProgress = Math.round((batchNum / totalBatches) * 100);
                const memUsage = process.memoryUsage();
                const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
                console.log(`    • バッチ ${batchNum}/${totalBatches} 完了 (${batchProgress}%) - メモリ: ${heapUsed}MB`);
              }
            }
            
            const totalProgress = Math.round(((currentPeriodEnd.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100);
            console.log(`✅ ${year}年 第${periodCount}期間完了! (全体進捗: ${totalProgress}%)`);
            
            this.logger.info('期間別天体データ生成完了', {
              year,
              period: periodCount,
              dataPoints: periodDataPoints.length,
              progress: `${totalProgress}%`,
              startDate: currentPeriodStart.toISOString().split('T')[0],
              endDate: currentPeriodEnd.toISOString().split('T')[0]
            });
            
          } catch (periodError) {
            this.logger.error('期間別データ保存エラー', {
              year,
              period: periodCount,
              dataPointsCount: periodDataPoints.length,
              error: periodError.message
            });
            throw periodError;
          }
        }
        
        // ガベージコレクションを促進（2週間ごと）
        if (global.gc) {
          const memBefore = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
          global.gc();
          const memAfter = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
          const memFreed = memBefore - memAfter;
          console.log(`  🧹 メモリクリーンアップ実行: ${memBefore}MB → ${memAfter}MB (解放: ${memFreed}MB)`);
        }
        
        // 次の期間へ
        currentPeriodStart = new Date(currentPeriodEnd);
        currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
      }

      const totalTime = Date.now() - startTime;
      const totalDataPoints = await this.getDataPointCount(year);
      
      console.log(`\n🎉 ${year}年の全天体データ生成完了!`);
      console.log(`• 総データ数: ${totalDataPoints.toLocaleString()}件`);
      console.log(`• 処理時間: ${Math.round(totalTime / 1000 / 60)}分`);

      this.logger.info('年間天体軌道データ生成完了', {
        year,
        totalDataPoints,
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 1000 / 60),
        avgPointsPerDay: Math.round(totalDataPoints / 365),
        avgPointsPerMonth: Math.round(totalDataPoints / 12)
      });

      return {
        success: true,
        totalDataPoints,
        timeMs: totalTime
      };

    } catch (error) {
      this.logger.error('年間天体軌道データ生成エラー', error, { year });
      return {
        success: false,
        totalDataPoints: 0,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 1日分の5分刻み天体データを生成
   */
  private async generateDailyData(date: Date): Promise<CelestialDataPoint[]> {
    const dataPoints: CelestialDataPoint[] = [];
    
    // JST基準での日付を明示的に作成（スカイツリー版と同じ方式）
    const year = date.getFullYear();
    const month = date.getMonth();
    const dayOfMonth = date.getDate();
    
    // DATE型カラム用の日付（UTC基準で作成してタイムゾーンズレを防ぐ）
    const dateOnly = new Date(Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0));

    // 24時間 × 12回（5分刻み）= 288データポイント/日
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        // UTC時刻を直接作成してastronomy-engineに渡す
        const utcTime = new Date(Date.UTC(year, month, dayOfMonth, hour - 9, minute, 0));
        // データベース保存用のJST時刻
        const jstTime = new Date(year, month, dayOfMonth, hour, minute, 0);

        // 太陽データ（標準的な観測地点として富士山を使用）
        const fujiLocation = { latitude: 35.3606, longitude: 138.7274, elevation: 3776, name: '富士山' };
        const sunPosition = await astronomicalCalculator.calculateSunPositionPrecise(utcTime, fujiLocation);
        const sunVisible = sunPosition.elevation > -6; // 薄明を考慮

        dataPoints.push({
          date: dateOnly,      // DATE型カラム用（00:00:00）
          time: jstTime,       // JST時刻をデータベースに保存
          hour,                // JST時
          minute,              // JST分
          celestialType: 'sun',
          azimuth: sunPosition.azimuth,
          elevation: sunPosition.elevation,
          visible: sunVisible,
          season: this.getSeason(dateOnly),    // JST基準季節判定
          timeOfDay: this.getTimeOfDay(hour)   // JST基準時間帯判定
        });

        // 月データ（標準的な観測地点として富士山を使用）
        const moonPosition = await astronomicalCalculator.calculateMoonPositionPrecise(utcTime, fujiLocation);
        const moonVisible = moonPosition.elevation > -2; // 月の場合
        
        // 月相と照度を計算（Astronomy Engineから直接取得）
        const Astronomy = require('astronomy-engine');
        const moonPhase = Astronomy.MoonPhase(jstTime);
        const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));

        dataPoints.push({
          date: dateOnly,      // DATE型カラム用（00:00:00）
          time: jstTime,       // JST時刻をデータベースに保存
          hour,                // JST時
          minute,              // JST分
          celestialType: 'moon',
          azimuth: moonPosition.azimuth,
          elevation: moonPosition.elevation,
          visible: moonVisible,
          moonPhase: moonPhase,
          moonIllumination: illuminationFraction,
          season: this.getSeason(dateOnly),    // JST基準季節判定
          timeOfDay: this.getTimeOfDay(hour)   // JST基準時間帯判定
        });
      }
    }

    return dataPoints;
  }

  /**
   * データポイントをバッチ挿入
   */
  private async insertDataPointsBatch(dataPoints: CelestialDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return;

    try {
      await prisma.celestialOrbitData.createMany({
        data: dataPoints.map(point => ({
          date: point.date,
          time: point.time,
          hour: point.hour,
          minute: point.minute,
          celestialType: point.celestialType,
          azimuth: point.azimuth,
          elevation: point.elevation,
          visible: point.visible,
          moonPhase: point.moonPhase,
          moonIllumination: point.moonIllumination,
          season: point.season,
          timeOfDay: point.timeOfDay
        })),
        skipDuplicates: true
      });

      this.logger.debug('天体データバッチ挿入完了', {
        batchSize: dataPoints.length,
        dateRange: `${dataPoints[0].date.toISOString().split('T')[0]} - ${dataPoints[dataPoints.length - 1].date.toISOString().split('T')[0]}`
      });

    } catch (error) {
      this.logger.error('天体データバッチ挿入エラー', error, {
        batchSize: dataPoints.length
      });
      throw error;
    }
  }

  /**
   * 指定年のデータを削除
   */
  private async clearYearData(year: number): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const deleteResult = await prisma.celestialOrbitData.deleteMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    this.logger.info('既存天体データ削除完了', {
      year,
      deletedCount: deleteResult.count
    });
  }

  /**
   * 指定年のデータ件数を取得
   */
  async getDataPointCount(year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    return await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        }
      }
    });
  }

  /**
   * 富士現象計算用のデータを取得
   * 指定した日付・方位角範囲の天体データを抽出
   */
  async getFujiRelevantData(
    startDate: Date,
    endDate: Date,
    azimuthMin: number = 250,
    azimuthMax: number = 280
  ): Promise<CelestialOrbitData[]> {
    return await prisma.celestialOrbitData.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        azimuth: {
          gte: azimuthMin,
          lte: azimuthMax
        },
        elevation: {
          gte: 0,    // 地平線以上のみ
          lte: 15    // より高い角度まで許可
        },
        visible: true
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });
  }

  /**
   * パール富士用のデータを取得（方位角制限なし、月データのみ）
   * 月は約29.5日周期で全方位を通過するため、方位角による制限は行わない
   */
  async getFujiRelevantDataForPearl(
    startDate: Date,
    endDate: Date
  ): Promise<CelestialOrbitData[]> {
    return await prisma.celestialOrbitData.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        celestialType: 'moon',
        elevation: {
          gte: 0,    // 地平線以上のみ
          lte: 5     // ダイヤモンド富士と同じ高度制限
        },
        visible: true,
        // 方位角制限なし（月は全方位を通過）
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });
  }

  /**
   * 季節を判定
   */
  private getSeason(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * 時間帯を判定
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 15) return 'noon';
    if (hour >= 15 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
  }

  /**
   * データベース統計情報を取得
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    yearRange: { min: number; max: number };
    celestialTypeDistribution: { sun: number; moon: number };
    visibilityRate: number;
  }> {
    const [
      totalRecords,
      minYear,
      maxYear,
      sunCount,
      moonCount,
      visibleCount
    ] = await Promise.all([
      prisma.celestialOrbitData.count(),
      prisma.celestialOrbitData.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true }
      }),
      prisma.celestialOrbitData.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true }
      }),
      prisma.celestialOrbitData.count({
        where: { celestialType: 'sun' }
      }),
      prisma.celestialOrbitData.count({
        where: { celestialType: 'moon' }
      }),
      prisma.celestialOrbitData.count({
        where: { visible: true }
      })
    ]);

    return {
      totalRecords,
      yearRange: {
        min: minYear?.date.getFullYear() || 0,
        max: maxYear?.date.getFullYear() || 0
      },
      celestialTypeDistribution: {
        sun: sunCount,
        moon: moonCount
      },
      visibilityRate: totalRecords > 0 ? visibleCount / totalRecords : 0
    };
  }
}

export const celestialOrbitDataService = new CelestialOrbitDataService();