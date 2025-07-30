import { FujiEvent, Location, MoonPosition } from '@fuji-calendar/types';
import { timeUtils } from '@fuji-calendar/utils';
import { getComponentLogger } from '@fuji-calendar/utils';
import { CoordinateCalculator } from './CoordinateCalculator';
import { CelestialPositionCalculator } from './CelestialPositionCalculator';
import { SeasonCalculator } from './SeasonCalculator';

/**
 * 富士山との整列計算を担当するクラス
 * ダイアモンド富士・パール富士の検出
 */
export class FujiAlignmentCalculator {
  private static readonly AZIMUTH_TOLERANCE = 1.5; // 度
  private static readonly ELEVATION_TOLERANCE = 0.5; // 度
  private static readonly SEARCH_INTERVAL = 60; // 1 分間隔（秒）
  private static readonly SUN_ANGULAR_DIAMETER = 0.53; // 度
  private static readonly MOON_ANGULAR_DIAMETER = 0.52; // 度

  private logger = getComponentLogger('FujiAlignmentCalculator');
  private coordinateCalc = new CoordinateCalculator();
  private celestialCalc = new CelestialPositionCalculator();
  private seasonCalc = new SeasonCalculator();

  /**
   * ダイアモンド富士イベントを検索
   */
  async findDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];
    
    if (!this.seasonCalc.isDiamondFujiSeason(date)) {
      return events;
    }

    // 日の出・日の入り時刻周辺を検索
    const sunriseEvents = await this.searchCelestialAlignment(
      date, location, 'sunrise', 'diamond_sunrise'
    );
    const sunsetEvents = await this.searchCelestialAlignment(
      date, location, 'sunset', 'diamond_sunset'
    );

    events.push(...sunriseEvents, ...sunsetEvents);
    
    this.logger.debug('ダイアモンド富士検索完了', {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      sunriseEvents: sunriseEvents.length,
      sunsetEvents: sunsetEvents.length
    });

    return events;
  }

  /**
   * パール富士イベントを検索
   */
  async findPearlFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];

    // 月の出・月の入り時刻周辺を検索
    const moonriseEvents = await this.searchCelestialAlignment(
      date, location, 'moonrise', 'pearl_moonrise'
    );
    const moonsetEvents = await this.searchCelestialAlignment(
      date, location, 'moonset', 'pearl_moonset'
    );

    events.push(...moonriseEvents, ...moonsetEvents);
    
    this.logger.debug('パール富士検索完了', {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      moonriseEvents: moonriseEvents.length,
      moonsetEvents: moonsetEvents.length
    });

    return events;
  }

  /**
   * 天体と富士山の整列を検索
   */
  private async searchCelestialAlignment(
    date: Date,
    location: Location,
    eventPhase: 'sunrise' | 'sunset' | 'moonrise' | 'moonset',
    eventType: 'diamond_sunrise' | 'diamond_sunset' | 'pearl_moonrise' | 'pearl_moonset'
  ): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];
    const fujiAzimuth = this.coordinateCalc.calculateAzimuthToFuji(location);
    
    // 検索時間範囲を設定
    const { startTime, endTime } = this.getSearchTimeRange(date, eventPhase);
    
    let bestCandidate: {
      time: Date;
      azimuthDiff: number;
      position: { azimuth: number; elevation: number };
      moonPhase?: number;
      moonIllumination?: number;
    } | null = null;

    // 1 分間隔で検索
    for (let time = new Date(startTime); time <= endTime; time.setMinutes(time.getMinutes() + 1)) {
      const position = eventType.includes('diamond') 
        ? this.celestialCalc.calculateSunPosition(time, location)
        : this.celestialCalc.calculateMoonPosition(time, location);

      if (!position || !this.celestialCalc.isVisible(position.elevation)) {
        continue;
      }

      const azimuthDiff = this.coordinateCalc.getAzimuthDifference(position.azimuth, fujiAzimuth);
      
      // 許容範囲内かチェック
      if (azimuthDiff <= FujiAlignmentCalculator.AZIMUTH_TOLERANCE) {
        if (!bestCandidate || azimuthDiff < bestCandidate.azimuthDiff) {
          bestCandidate = {
            time: new Date(time),
            azimuthDiff,
            position,
            moonPhase: 'phase' in position ? (position as MoonPosition).phase : undefined,
            moonIllumination: 'illumination' in position ? (position as MoonPosition).illumination : undefined
          };
        }
      }
    }

    // 最良候補が見つかった場合、イベントを作成
    if (bestCandidate) {
      // パール富士の場合は月相チェック
      if (eventType.includes('pearl') && bestCandidate.moonIllumination !== undefined) {
        if (!this.celestialCalc.isVisibleMoonPhase(bestCandidate.moonIllumination)) {
          return events; // 月が暗すぎる場合はスキップ
        }
      }

      events.push({
        id: `${location.id}-${timeUtils.formatDateString(date)}-${eventType}`,
        type: eventType.includes('diamond') ? 'diamond' : 'pearl',
        subType: eventType.includes('sunrise') || eventType.includes('rising') ? 'sunrise' : 'sunset',
        time: bestCandidate.time,
        location: location,
        azimuth: bestCandidate.position.azimuth,
        elevation: bestCandidate.position.elevation,
        accuracy: this.getAccuracyLevel(bestCandidate.azimuthDiff),
        qualityScore: this.calculateQualityScore(bestCandidate.azimuthDiff, bestCandidate.position.elevation),
        moonPhase: bestCandidate.moonPhase,
        moonIllumination: bestCandidate.moonIllumination
      });
    }

    return events;
  }

  /**
   * 検索時間範囲を取得
   */
  private getSearchTimeRange(date: Date, eventPhase: string): { startTime: Date; endTime: Date } {
    const baseDate = new Date(date);
    
    switch (eventPhase) {
      case 'sunrise':
        return {
          startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 4, 0),
          endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 8, 0)
        };
      case 'sunset':
        return {
          startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 16, 0),
          endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 20, 0)
        };
      case 'moonrise':
        return {
          startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 18, 0),
          endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 6, 0)
        };
      case 'moonset':
        return {
          startTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0),
          endTime: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0)
        };
      default:
        return {
          startTime: baseDate,
          endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
        };
    }
  }

  /**
   * 精度レベルを取得
   */
  private getAccuracyLevel(azimuthDiff: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    if (azimuthDiff <= 0.3) return 'perfect';
    if (azimuthDiff <= 0.7) return 'excellent';
    if (azimuthDiff <= 1.0) return 'good';
    return 'fair';
  }

  /**
   * 品質スコアを計算
   */
  private calculateQualityScore(azimuthDiff: number, elevation: number): number {
    // 方位角精度スコア（0-50 点）
    const azimuthScore = Math.max(0, 50 - (azimuthDiff / FujiAlignmentCalculator.AZIMUTH_TOLERANCE) * 50);
    
    // 高度スコア（0-30 点）：高度 1 度以上で満点
    const elevationScore = Math.min(30, Math.max(0, elevation + 2) * 15);
    
    // 可視性スコア（0-20 点）：高度が高いほど高スコア
    const visibilityScore = Math.min(20, Math.max(0, elevation) * 2);
    
    return Math.round(azimuthScore + elevationScore + visibilityScore);
  }
}