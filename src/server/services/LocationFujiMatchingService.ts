import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { Location } from '../../shared/types';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

interface LocationFujiEvent {
  locationId: number;
  phenomenonTime: Date;
  phenomenonType: 'diamond' | 'pearl';
  azimuthDifference: number;
  altitudeDifference: number;
  totalDifference: number;
  celestialAzimuth: number;
  celestialAltitude: number;
  fujiAzimuth: number;
  fujiElevation: number;
  qualityScore: number;
  moonPhase?: number;
  moonIllumination?: number;
  isHighQuality: boolean;
  matchingAccuracy: 'perfect' | 'excellent' | 'good' | 'fair';
}

/**
 * 地点×富士現象マッチングサービス
 * 中間テーブルの最適候補に各地点をマッチングして最終的な富士現象を検出
 */
export class LocationFujiMatchingService {
  private db: UnifiedDatabase;
  private logger: StructuredLogger;
  
  // マッチング精度基準
  private readonly PERFECT_THRESHOLD = 0.5; // 完璧マッチ（0.5度以内）
  private readonly EXCELLENT_THRESHOLD = 1.0; // 優秀マッチ（1.0度以内）  
  private readonly GOOD_THRESHOLD = 1.5; // 良好マッチ（1.5度以内）
  private readonly FAIR_THRESHOLD = 2.0; // 許容マッチ（2.0度以内）

  constructor() {
    this.db = getUnifiedDatabase();
    this.logger = getComponentLogger('location-fuji-matching');
  }

  /**
   * 全地点での富士現象マッチング実行
   */
  async matchAllLocations(year: number): Promise<void> {
    const startTime = Date.now();
    this.logger.info('全地点富士現象マッチング開始', { year });

    try {
      // 富士山データが設定された全地点を取得
      const locations = await this.getLocationsWithFujiData();
      
      // 既存の現象データをクリア
      await this.clearExistingPhenomena(year);
      
      let totalMatches = 0;
      
      // 各地点で富士現象をマッチング
      for (const location of locations) {
        const locationMatches = await this.matchLocationWithCandidates(location, year);
        totalMatches += locationMatches;
        
        this.logger.debug('地点マッチング完了', {
          locationId: location.id,
          locationName: location.name,
          matches: locationMatches
        });
      }
      
      const totalTime = Date.now() - startTime;
      this.logger.info('全地点富士現象マッチング完了', { 
        year,
        locationCount: locations.length,
        totalMatches,
        avgMatchesPerLocation: Math.round(totalMatches / locations.length),
        totalTimeMs: totalTime,
        avgTimePerLocation: Math.round(totalTime / locations.length)
      });
      
    } catch (error) {
      this.logger.error('全地点富士現象マッチングエラー', error, { year });
      throw error;
    }
  }

  /**
   * 特定地点での富士現象マッチング（新地点追加時用）
   */
  async matchSingleLocation(locationId: number, year: number): Promise<number> {
    this.logger.info('単一地点富士現象マッチング開始', { locationId, year });
    
    const location = await this.getLocationWithFujiData(locationId);
    if (!location) {
      throw new Error(`Location not found or missing Fuji data: ${locationId}`);
    }
    
    // この地点の既存現象データをクリア
    await this.db.runAdapted(`
      DELETE FROM fuji_phenomena WHERE location_id = ? 
      AND phenomenon_time >= ? AND phenomenon_time < ?
    `, [
      locationId,
      new Date(year, 0, 1).toISOString(),
      new Date(year + 1, 0, 1).toISOString()
    ]);
    
    const matchCount = await this.matchLocationWithCandidates(location, year);
    
    this.logger.info('単一地点富士現象マッチング完了', {
      locationId,
      year,
      matches: matchCount
    });
    
    return matchCount;
  }

  /**
   * 地点と最適候補のマッチング処理
   */
  private async matchLocationWithCandidates(
    location: Location & { fujiAzimuth: number; fujiElevation: number; fujiDistance: number }, 
    year: number
  ): Promise<number> {
    
    // 最適候補を取得（品質の高い順）
    const optimalCandidates = await this.db.allAdapted<{
      eventDate: string;
      phenomenonType: string;
      peakTime: string;
      peakAzimuth: number;
      peakAltitude: number;
      overallQuality: number;
      moonIllumination: number;
      moonPhaseDescription: string;
    }>(`
      SELECT event_date, phenomenon_type, peak_time, 
             peak_azimuth, peak_altitude, overall_quality,
             moon_illumination, moon_phase_description
      FROM fuji_optimal_candidates
      WHERE calculation_year = ?
      ORDER BY overall_quality DESC, event_date
    `, [year]);

    const locationEvents: LocationFujiEvent[] = [];

    for (const candidate of optimalCandidates) {
      // 地点の富士山データと候補の天体位置を比較
      const azimuthDiff = Math.abs(candidate.peakAzimuth - location.fujiAzimuth);
      const altitudeDiff = Math.abs(candidate.peakAltitude - location.fujiElevation);
      const totalDiff = Math.sqrt(azimuthDiff ** 2 + altitudeDiff ** 2);
      
      // 許容範囲内かチェック
      if (totalDiff <= this.FAIR_THRESHOLD) {
        // マッチング精度を判定
        const matchingAccuracy = this.determineMatchingAccuracy(totalDiff);
        
        // 地点固有の品質スコアを計算
        const locationQualityScore = this.calculateLocationQualityScore(
          azimuthDiff,
          altitudeDiff,
          candidate.overallQuality,
          location
        );
        
        locationEvents.push({
          locationId: location.id,
          phenomenonTime: new Date(candidate.peakTime),
          phenomenonType: candidate.phenomenonType as 'diamond' | 'pearl',
          azimuthDifference: azimuthDiff,
          altitudeDifference: altitudeDiff,
          totalDifference: totalDiff,
          celestialAzimuth: candidate.peakAzimuth,
          celestialAltitude: candidate.peakAltitude,
          fujiAzimuth: location.fujiAzimuth,
          fujiElevation: location.fujiElevation,
          qualityScore: locationQualityScore,
          moonPhase: candidate.moonPhaseDescription ? this.moonPhaseToNumber(candidate.moonPhaseDescription) : undefined,
          moonIllumination: candidate.moonIllumination || undefined,
          isHighQuality: locationQualityScore >= 0.7,
          matchingAccuracy
        });
      }
    }

    // 重複する現象を除去（同日同種の現象で最高品質のもののみ残す）
    const uniqueEvents = this.removeDuplicateEvents(locationEvents);
    
    // データベースに保存
    if (uniqueEvents.length > 0) {
      await this.insertLocationEventsBatch(uniqueEvents);
    }

    return uniqueEvents.length;
  }

  /**
   * 富士山データ付きの地点を取得
   */
  private async getLocationsWithFujiData(): Promise<Array<Location & {
    fujiAzimuth: number;
    fujiElevation: number;
    fujiDistance: number;
  }>> {
    return await this.db.allAdapted(`
      SELECT id, name, latitude, longitude, elevation,
             fuji_azimuth, fuji_elevation, fuji_distance
      FROM locations 
      WHERE fuji_azimuth IS NOT NULL 
        AND fuji_elevation IS NOT NULL 
        AND fuji_distance IS NOT NULL
      ORDER BY id
    `);
  }

  /**
   * 特定地点の富士山データを取得
   */
  private async getLocationWithFujiData(locationId: number): Promise<(Location & {
    fujiAzimuth: number;
    fujiElevation: number;
    fujiDistance: number;
  }) | null> {
    return await this.db.getAdapted(`
      SELECT id, name, latitude, longitude, elevation,
             fuji_azimuth, fuji_elevation, fuji_distance
      FROM locations 
      WHERE id = ?
        AND fuji_azimuth IS NOT NULL 
        AND fuji_elevation IS NOT NULL 
        AND fuji_distance IS NOT NULL
    `, [locationId]);
  }

  /**
   * 既存の現象データをクリア
   */
  private async clearExistingPhenomena(year: number): Promise<void> {
    const result = await this.db.runAdapted(`
      DELETE FROM fuji_phenomena 
      WHERE phenomenon_time >= ? AND phenomenon_time < ?
    `, [
      new Date(year, 0, 1).toISOString(),
      new Date(year + 1, 0, 1).toISOString()
    ]);
    
    this.logger.info('既存現象データクリア完了', { 
      year, 
      deletedCount: result.changes || 0 
    });
  }

  /**
   * マッチング精度を判定
   */
  private determineMatchingAccuracy(totalDifference: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    if (totalDifference <= this.PERFECT_THRESHOLD) return 'perfect';
    if (totalDifference <= this.EXCELLENT_THRESHOLD) return 'excellent';  
    if (totalDifference <= this.GOOD_THRESHOLD) return 'good';
    return 'fair';
  }

  /**
   * 地点固有の品質スコアを計算
   */
  private calculateLocationQualityScore(
    azimuthDiff: number,
    altitudeDiff: number,
    baseQuality: number,
    location: Location & { fujiDistance: number }
  ): number {
    let score = baseQuality;
    
    // 角度精度による補正
    const anglePrecision = 1 - (azimuthDiff + altitudeDiff) / 4; // 4度で0点
    score *= Math.max(0.1, anglePrecision);
    
    // 距離による補正（遠すぎる地点は少し減点）
    const distanceKm = location.fujiDistance / 1000;
    let distanceMultiplier = 1.0;
    if (distanceKm > 150) {
      distanceMultiplier = Math.max(0.8, 1 - (distanceKm - 150) / 200);
    }
    score *= distanceMultiplier;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * 重複イベントを除去（同日同種で最高品質のみ残す）
   */
  private removeDuplicateEvents(events: LocationFujiEvent[]): LocationFujiEvent[] {
    const groupedEvents = new Map<string, LocationFujiEvent[]>();
    
    // 日付+現象タイプでグループ化
    for (const event of events) {
      const dateKey = event.phenomenonTime.toISOString().split('T')[0];
      const groupKey = `${dateKey}-${event.phenomenonType}`;
      
      if (!groupedEvents.has(groupKey)) {
        groupedEvents.set(groupKey, []);
      }
      groupedEvents.get(groupKey)!.push(event);
    }
    
    // 各グループから最高品質のものを選択
    const uniqueEvents: LocationFujiEvent[] = [];
    for (const [groupKey, groupEvents] of groupedEvents) {
      // 品質スコア順でソート
      groupEvents.sort((a, b) => b.qualityScore - a.qualityScore);
      
      // 最高品質のもののみ採用
      const bestEvent = groupEvents[0];
      
      // 但し、品質差が僅かで時間が離れている場合は複数採用
      for (const event of groupEvents) {
        if (event === bestEvent) {
          uniqueEvents.push(event);
        } else {
          const qualityDiff = bestEvent.qualityScore - event.qualityScore;
          const timeDiff = Math.abs(bestEvent.phenomenonTime.getTime() - event.phenomenonTime.getTime());
          
          // 品質差0.1以内かつ時間差2時間以上なら追加採用
          if (qualityDiff <= 0.1 && timeDiff >= 2 * 60 * 60 * 1000) {
            uniqueEvents.push(event);
          }
        }
      }
    }
    
    return uniqueEvents.sort((a, b) => a.phenomenonTime.getTime() - b.phenomenonTime.getTime());
  }

  /**
   * 月相文字列を数値に変換
   */
  private moonPhaseToNumber(phaseDescription: string): number {
    const phaseMap: { [key: string]: number } = {
      'new_moon': 0.0,
      'waxing_crescent': 0.25,
      'first_quarter': 0.5,
      'waxing_gibbous': 0.75,
      'full_moon': 1.0,
      'waning_gibbous': 0.75,
      'last_quarter': 0.5,
      'waning_crescent': 0.25
    };
    
    return phaseMap[phaseDescription] || 0.5;
  }

  /**
   * 地点イベントをバッチ挿入
   */
  private async insertLocationEventsBatch(events: LocationFujiEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    for (const event of events) {
      await this.db.runAdapted(`
        INSERT INTO fuji_phenomena (
          location_id, phenomenon_time, phenomenon_type,
          azimuth_difference, altitude_difference, total_difference,
          celestial_azimuth, celestial_altitude,
          fuji_azimuth, fuji_elevation,
          moon_phase, moon_illumination,
          calculation_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.locationId,
        event.phenomenonTime.toISOString(),
        event.phenomenonType,
        event.azimuthDifference,
        event.altitudeDifference,
        event.totalDifference,
        event.celestialAzimuth,
        event.celestialAltitude,
        event.fujiAzimuth,
        event.fujiElevation,
        event.moonPhase || null,
        event.moonIllumination || null,
        event.matchingAccuracy
      ]);
    }
  }

  /**
   * 地点マッチング統計の取得
   */
  async getMatchingStatistics(year: number): Promise<{
    totalLocations: number;
    matchedLocations: number;
    totalPhenomena: number;
    diamondCount: number;
    pearlCount: number;
    highQualityCount: number;
    accuracyDistribution: { [key: string]: number };
    avgPhenomenaPerLocation: number;
  }> {
    const stats = await this.db.getAdapted<{
      totalLocations: number;
      matchedLocations: number;
      totalPhenomena: number;
      diamondCount: number;
      pearlCount: number;
      highQualityCount: number;
      perfectCount: number;
      excellentCount: number;
      goodCount: number;
      fairCount: number;
    }>(`
      WITH location_stats AS (
        SELECT 
          (SELECT count(*) FROM locations WHERE fuji_azimuth IS NOT NULL) as total_locations,
          count(DISTINCT location_id) as matched_locations,
          count(*) as total_phenomena,
          sum(CASE WHEN phenomenon_type = 'diamond' THEN 1 ELSE 0 END) as diamond_count,
          sum(CASE WHEN phenomenon_type = 'pearl' THEN 1 ELSE 0 END) as pearl_count,
          sum(CASE WHEN total_difference <= 1.0 THEN 1 ELSE 0 END) as high_quality_count,
          sum(CASE WHEN calculation_accuracy = 'perfect' THEN 1 ELSE 0 END) as perfect_count,
          sum(CASE WHEN calculation_accuracy = 'excellent' THEN 1 ELSE 0 END) as excellent_count,
          sum(CASE WHEN calculation_accuracy = 'good' THEN 1 ELSE 0 END) as good_count,
          sum(CASE WHEN calculation_accuracy = 'fair' THEN 1 ELSE 0 END) as fair_count
        FROM fuji_phenomena
        WHERE phenomenon_time >= ? AND phenomenon_time < ?
      )
      SELECT * FROM location_stats
    `, [
      new Date(year, 0, 1).toISOString(),
      new Date(year + 1, 0, 1).toISOString()
    ]);

    return {
      totalLocations: stats?.totalLocations || 0,
      matchedLocations: stats?.matchedLocations || 0,
      totalPhenomena: stats?.totalPhenomena || 0,
      diamondCount: stats?.diamondCount || 0,
      pearlCount: stats?.pearlCount || 0,
      highQualityCount: stats?.highQualityCount || 0,
      accuracyDistribution: {
        perfect: stats?.perfectCount || 0,
        excellent: stats?.excellentCount || 0,
        good: stats?.goodCount || 0,
        fair: stats?.fairCount || 0
      },
      avgPhenomenaPerLocation: stats?.matchedLocations ? 
        Math.round((stats.totalPhenomena / stats.matchedLocations) * 10) / 10 : 0
    };
  }
}

export const locationFujiMatchingService = new LocationFujiMatchingService();