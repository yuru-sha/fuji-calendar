import { prisma } from '../database/prisma';
import { CelestialOrbitData } from '@prisma/client';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
import { celestialOrbitDataService } from './CelestialOrbitDataService';

interface FujiCandidate {
  date: Date;
  celestialType: 'sun' | 'moon';
  elevation: number;
  timeOfDay: 'morning' | 'afternoon';
  preciseTime: Date;
  azimuth: number;
  moonElevation?: number;
  moonAzimuth?: number;
  moonPhase?: number;
  visible: boolean;
  atmosphericFactor?: number;
}

/**
 * 天文データサービス（富士現象候補の中間データ）
 * CelestialOrbitDataから富士現象に関連するデータを抽出・加工
 */
export class AstronomicalDataService {
  private logger: StructuredLogger;

  // 富士現象の判定基準
  private readonly FUJI_AZIMUTH_MIN = 250;
  private readonly FUJI_AZIMUTH_MAX = 280;
  private readonly SUITABLE_ALTITUDE_MIN = 0;   // 地平線以上のみ
  private readonly SUITABLE_ALTITUDE_MAX = 15;  // より高い角度まで許可
  
  // ダイヤモンド富士専用の高度制限（幅広い範囲で候補を収集）  
  private readonly DIAMOND_ALTITUDE_MIN = -10;  // 地平線以下も含めて幅広く
  private readonly DIAMOND_ALTITUDE_MAX = 90;   // 天頂まで幅広く収集
  
  // パール富士専用条件（満月前後のみ）
  private readonly MIN_MOON_ILLUMINATION = 0.70;  // 70%以上（満月前後）
  private readonly MAX_MOON_ILLUMINATION = 1.00;  // 100%まで

  constructor() {
    this.logger = getComponentLogger('astronomical-data');
  }

  /**
   * 年間の富士現象候補データを生成
   * CelestialOrbitDataから富士現象に関連するデータのみを抽出
   */
  async generateYearlyCandidates(year: number): Promise<{
    success: boolean;
    totalCandidates: number;
    diamondCandidates: number;
    pearlCandidates: number;
    timeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.info('年間富士現象候補データ生成開始', { year });

    try {
      // 既存データを削除
      await this.clearYearData(year);

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // 富士現象に関連する天体データを取得
      // ダイヤモンド富士用（方位角制限あり）
      const diamondData = await celestialOrbitDataService.getFujiRelevantData(
        startDate,
        endDate,
        this.FUJI_AZIMUTH_MIN,
        this.FUJI_AZIMUTH_MAX
      );
      
      // パール富士用（方位角制限なし、月データのみ）
      const pearlData = await celestialOrbitDataService.getFujiRelevantDataForPearl(
        startDate,
        endDate
      );

      this.logger.debug('富士関連天体データ取得完了', {
        year,
        diamondDataCount: diamondData.length,
        pearlDataCount: pearlData.length
      });

      // ダイヤモンド富士候補を抽出
      const diamondCandidates = await this.extractDiamondCandidates(diamondData);
      
      // パール富士候補を抽出
      const pearlCandidates = await this.extractPearlCandidates(pearlData);

      // 中間データとして保存
      const allCandidates = [...diamondCandidates, ...pearlCandidates];
      if (allCandidates.length > 0) {
        await this.insertCandidatesBatch(allCandidates);
      }

      const totalTime = Date.now() - startTime;

      this.logger.info('年間富士現象候補データ生成完了', {
        year,
        totalCandidates: allCandidates.length,
        diamondCandidates: diamondCandidates.length,
        pearlCandidates: pearlCandidates.length,
        totalTimeMs: totalTime
      });

      return {
        success: true,
        totalCandidates: allCandidates.length,
        diamondCandidates: diamondCandidates.length,
        pearlCandidates: pearlCandidates.length,
        timeMs: totalTime
      };

    } catch (error) {
      this.logger.error('年間富士現象候補データ生成エラー', error, { year });
      return {
        success: false,
        totalCandidates: 0,
        diamondCandidates: 0,
        pearlCandidates: 0,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * ダイヤモンド富士候補を抽出
   */
  private async extractDiamondCandidates(celestialData: any[]): Promise<FujiCandidate[]> {
    const candidates: FujiCandidate[] = [];

    // 太陽データのみをフィルタ
    const sunData = celestialData.filter(data => data.celestialType === 'sun');

    for (const data of sunData) {
      const date = new Date(data.date);
      const time = new Date(data.time);
      
      // ダイヤモンド富士の条件チェック（方位角で判定するため季節チェック削除）
      if (!this.isDiamondSuitableAltitude(data.elevation)) continue;
      if (!this.isOptimalSunTime(time)) continue;

      // ダイヤモンド富士候補として追加（品質スコア削除）
      candidates.push({
        date: date,
        pattern: 'diamond',
        elevation: Math.round(data.elevation),
        timeOfDay: time.getHours() < 12 ? 'morning' : 'afternoon',
        preciseTime: time,
        azimuth: data.azimuth,
        quality: 'good', // 固定値（条件を満たした時点で良好）
        atmosphericFactor: this.calculateAtmosphericFactor(date, time)
      });
    }

    // 重複除去とグループ化（同日同時間帯で最高品質のもののみ）
    return this.deduplicateCandidates(candidates);
  }

  /**
   * パール富士候補を抽出
   */
  private async extractPearlCandidates(celestialData: any[]): Promise<FujiCandidate[]> {
    const candidates: FujiCandidate[] = [];

    // 月データのみをフィルタ（満月前後のみ、方位角でさらに絞り込み）
    const moonData = celestialData.filter(data => 
      data.celestialType === 'moon' && 
      (data.moonIllumination || 0) >= this.MIN_MOON_ILLUMINATION &&
      (data.moonIllumination || 0) <= this.MAX_MOON_ILLUMINATION &&
      data.azimuth >= this.FUJI_AZIMUTH_MIN && 
      data.azimuth <= this.FUJI_AZIMUTH_MAX
    );

    for (const data of moonData) {
      const date = new Date(data.date);
      const time = new Date(data.time);
      
      // パール富士の条件チェック（ダイヤモンド富士と同じ地理的制約、夜間のみ）
      if (!this.isDiamondSuitableAltitude(data.elevation)) continue;
      if (!this.isOptimalMoonTime(time, date)) continue;

      // パール富士候補として追加（品質スコア削除）
      candidates.push({
        date: date,
        pattern: 'pearl',
        elevation: Math.round(data.elevation),
        timeOfDay: time.getHours() < 12 ? 'morning' : 'afternoon',
        preciseTime: time,
        azimuth: data.azimuth,
        moonElevation: data.elevation,
        moonAzimuth: data.azimuth,
        moonPhase: data.moonPhase,
        quality: 'good', // 固定値（条件を満たした時点で良好）
        atmosphericFactor: this.calculateAtmosphericFactor(date, time)
      });
    }

    return this.deduplicateCandidates(candidates);
  }

  /**
   * 候補データをバッチ挿入
   */
  private async insertCandidatesBatch(candidates: FujiCandidate[]): Promise<void> {
    if (candidates.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);

      await prisma.astronomicalData.createMany({
        data: batch.map(candidate => ({
          date: candidate.date,
          pattern: candidate.pattern,
          elevation: candidate.elevation,
          timeOfDay: candidate.timeOfDay,
          preciseTime: candidate.preciseTime,
          azimuth: candidate.azimuth,
          moonElevation: candidate.moonElevation,
          moonAzimuth: candidate.moonAzimuth,
          moonPhase: candidate.moonPhase,
          quality: candidate.quality || null,
          atmosphericFactor: candidate.atmosphericFactor
        })),
        skipDuplicates: true
      });

      this.logger.debug('富士現象候補バッチ挿入完了', {
        batchStart: i + 1,
        batchEnd: Math.min(i + batchSize, candidates.length),
        totalCandidates: candidates.length
      });
    }
  }

  /**
   * 指定年のデータを削除
   */
  private async clearYearData(year: number): Promise<void> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const deleteResult = await prisma.locationFujiEvent.deleteMany({
      where: {
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    this.logger.info('既存富士現象候補データ削除完了', {
      year,
      deletedCount: deleteResult.count
    });
  }

  /**
   * 重複候補を除去
   */
  private deduplicateCandidates(candidates: FujiCandidate[]): FujiCandidate[] {
    const grouped = new Map<string, FujiCandidate[]>();

    // 日付+パターン+時間帯でグループ化
    for (const candidate of candidates) {
      const key = `${candidate.date.toISOString().split('T')[0]}-${candidate.pattern}-${candidate.timeOfDay}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(candidate);
    }

    // 各グループから最高品質のものを選択
    const uniqueCandidates: FujiCandidate[] = [];
    for (const [key, groupCandidates] of grouped) {
      // 方位角の富士山中心からの距離でソート
      const fujiCenter = (this.FUJI_AZIMUTH_MIN + this.FUJI_AZIMUTH_MAX) / 2;
      groupCandidates.sort((a, b) => {
        const aDiff = Math.abs(a.azimuth - fujiCenter);
        const bDiff = Math.abs(b.azimuth - fujiCenter);
        return aDiff - bDiff;
      });

      uniqueCandidates.push(groupCandidates[0]);
    }

    return uniqueCandidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }


  /**
   * 条件判定メソッド群
   */
  private isSuitableAltitude(altitude: number): boolean {
    return altitude >= this.SUITABLE_ALTITUDE_MIN && altitude <= this.SUITABLE_ALTITUDE_MAX;
  }

  private isDiamondSuitableAltitude(altitude: number): boolean {
    // ダイヤモンド富士は富士山から南北35度以内の地理的制約により高度が制限される
    return altitude >= this.DIAMOND_ALTITUDE_MIN && altitude <= this.DIAMOND_ALTITUDE_MAX;
  }

  private isOptimalSunTime(time: Date): boolean {
    const hour = time.getHours();
    // ダイヤモンド富士の時間帯：昇るダイヤ（4:00-9:59）、沈むダイヤ（14:00-19:59）
    return (hour >= 4 && hour <= 9) || (hour >= 14 && hour <= 19);
  }

  private isOptimalMoonTime(time: Date, date: Date): boolean {
    // パール富士は24時間いつでも発生可能（太陽が出ていると見づらいが）
    // 午前：昇るパール、午後：沈むパール
    const month = date.getMonth() + 1; // 1-12月
    
    // 観測最適期間：空気の澄んでいる3-9月
    const isOptimalSeason = month >= 3 && month <= 9;
    
    return isOptimalSeason; // 24時間いつでもOK
  }

  private calculateAtmosphericFactor(date: Date, time: Date): number {
    // 簡易的な大気透明度予測（季節・時間帯を考慮）
    const month = date.getMonth() + 1;
    const hour = time.getHours();
    
    let factor = 0.7; // ベース値
    
    // 季節による補正（冬は透明度が高い）
    if (month >= 11 || month <= 2) factor += 0.2;
    else if (month >= 6 && month <= 8) factor -= 0.1;
    
    // 時間帯による補正（早朝・夕方は透明度が高い）
    if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) factor += 0.1;
    
    return Math.min(1.0, Math.max(0.0, factor));
  }

  /**
   * 富士現象候補データを取得（地点計算用）
   */
  async getCandidatesForPeriod(
    startDate: Date,
    endDate: Date,
    celestialType?: 'sun' | 'moon'
  ): Promise<CelestialOrbitData[]> {
    // AstronomicalData テーブルは廃止されました
    // CelestialOrbitData を直接使用するように修正が必要
    this.logger.warn('getCandidatesForPeriod is deprecated - AstronomicalData table removed', {
      startDate,
      endDate,
      celestialType
    });
    return [];
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(year?: number): Promise<{
    totalCandidates: number;
    patternDistribution: { diamond: number; pearl: number };
    qualityDistribution: { excellent: number; good: number; fair: number; poor: number };
    timeOfDayDistribution: { morning: number; afternoon: number };
  }> {
    const whereClause = year ? {
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    } : {};

    const [
      totalCandidates,
      diamondCount,
      pearlCount,
      excellentCount,
      goodCount,
      fairCount,
      poorCount,
      morningCount,
      afternoonCount
    ] = await Promise.all([
      prisma.astronomicalData.count({ where: whereClause }),
      prisma.astronomicalData.count({ where: { ...whereClause, pattern: 'diamond' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, pattern: 'pearl' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, quality: 'excellent' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, quality: 'good' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, quality: 'fair' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, quality: 'poor' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, timeOfDay: 'morning' } }),
      prisma.astronomicalData.count({ where: { ...whereClause, timeOfDay: 'afternoon' } })
    ]);

    return {
      totalCandidates,
      patternDistribution: {
        diamond: diamondCount,
        pearl: pearlCount
      },
      qualityDistribution: {
        excellent: excellentCount,
        good: goodCount,
        fair: fairCount,
        poor: poorCount
      },
      timeOfDayDistribution: {
        morning: morningCount,
        afternoon: afternoonCount
      }
    };
  }
}

export const astronomicalDataService = new AstronomicalDataService();