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
  // TODO: システム設定を DB で管理するよう改善
  // CREATE TABLE system_settings (setting_key VARCHAR(100), setting_value DECIMAL(10,6), description TEXT);
  // INSERT INTO system_settings VALUES ('azimuth_tolerance', 0.05, '方位角許容範囲（度）');
  private static readonly AZIMUTH_TOLERANCE = 0.05; // 度 - 富士山頂の見かけ直径を考慮した厳格な基準
  private static readonly ELEVATION_TOLERANCE = 0.05; // 度 - 太陽/月が山頂に収まる範囲
  private static readonly SEARCH_INTERVAL = 10; // 10 秒間隔（秒） - 精度向上のため
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
    const fujiAzimuth = this.coordinateCalc.calculateAzimuthToFuji(location);

    // 富士山の方位角に基づいて日の出・日の入りどちらが可能かを判定
    const canSeeSunrise = this.canObserveSunrise(fujiAzimuth);
    const canSeeSunset = this.canObserveSunset(fujiAzimuth);

    let sunriseEvents: FujiEvent[] = [];
    let sunsetEvents: FujiEvent[] = [];

    // 日の出ダイヤモンド富士（東側）
    if (canSeeSunrise) {
      sunriseEvents = await this.searchCelestialAlignment(
        date, location, 'sunrise', 'diamond_sunrise'
      );
    }

    // 日の入りダイヤモンド富士（西側）
    if (canSeeSunset) {
      sunsetEvents = await this.searchCelestialAlignment(
        date, location, 'sunset', 'diamond_sunset'
      );
    }

    events.push(...sunriseEvents, ...sunsetEvents);
    
    this.logger.debug('ダイアモンド富士検索完了', {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      fujiAzimuth,
      canSeeSunrise,
      canSeeSunset,
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
    const fujiAzimuth = this.coordinateCalc.calculateAzimuthToFuji(location);

    // 月の出イベントを検索
    const moonriseEvents = await this.searchCelestialAlignment(
      date, location, 'moonrise', 'pearl_moonrise'
    );

    // 月の入りは地理的観測条件をチェック
    // 富士山の西側エリア（方位角 180-360 度）では月没は観測不可
    let moonsetEvents: FujiEvent[] = [];
    if (this.canObserveMoonset(fujiAzimuth)) {
      moonsetEvents = await this.searchCelestialAlignment(
        date, location, 'moonset', 'pearl_moonset'
      );
    } else {
      this.logger.debug('月没パール富士は地理的に観測不可', {
        locationId: location.id,
        fujiAzimuth,
        reason: '富士山の西側エリアでは月没は見えません'
      });
    }

    events.push(...moonriseEvents, ...moonsetEvents);
    
    this.logger.debug('パール富士検索完了', {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      moonriseEvents: moonriseEvents.length,
      moonsetEvents: moonsetEvents.length,
      fujiAzimuth
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
    const { startTime, endTime } = this.getSearchTimeRange(date, eventPhase, location);
    
    let bestCandidate: {
      time: Date;
      azimuthDiff: number;
      elevationDiff: number;
      position: { azimuth: number; elevation: number };
      moonPhase?: number;
      moonIllumination?: number;
    } | null = null;

    // 10 秒間隔で検索
    for (let time = new Date(startTime); time <= endTime; time.setSeconds(time.getSeconds() + FujiAlignmentCalculator.SEARCH_INTERVAL)) {
      const position = eventType.includes('diamond') 
        ? this.celestialCalc.calculateSunPosition(time, location)
        : this.celestialCalc.calculateMoonPosition(time, location);

      if (!position || !this.celestialCalc.isVisible(position.elevation)) {
        continue;
      }

      const azimuthDiff = this.coordinateCalc.getAzimuthDifference(position.azimuth, fujiAzimuth);
      
      // 富士山頂への仰角を取得（地点の富士山仰角データを使用）
      const fujiElevation = location.fujiElevation || 0;
      const elevationDiff = Math.abs(position.elevation - fujiElevation);
      
      // 許容範囲内かチェック（方位角・高度の両方を考慮）
      if (azimuthDiff <= FujiAlignmentCalculator.AZIMUTH_TOLERANCE && elevationDiff <= 1.0) {
        // 総合精度スコアで最良候補を選択
        const totalScore = azimuthDiff + elevationDiff * 2; // 高度差を重視
        const currentScore = !bestCandidate ? Infinity : (bestCandidate.azimuthDiff + bestCandidate.elevationDiff * 2);
        
        if (totalScore < currentScore) {
          bestCandidate = {
            time: new Date(time),
            azimuthDiff,
            elevationDiff,
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

      // 南中時刻を計算して昇る・沈むを判定
      const transitTime = eventType.includes('diamond')
        ? this.celestialCalc.calculateSolarNoon(date, location)
        : this.celestialCalc.calculateLunarTransit(date, location);
      
      // 南中時刻より前なら昇る、後なら沈む（UTC基準で比較）
      let subType: 'sunrise' | 'sunset' | 'rising' | 'setting';
      const referenceTime = transitTime || new Date(Date.UTC(bestCandidate.time.getUTCFullYear(), bestCandidate.time.getUTCMonth(), bestCandidate.time.getUTCDate(), 3, 0, 0)); // JST 12:00 = UTC 3:00
      
      // UTC時刻同士で比較
      const candidateUTC = new Date(bestCandidate.time.getTime());
      const referenceUTC = new Date(referenceTime.getTime());
      
      if (eventType.includes('diamond')) {
        subType = candidateUTC < referenceUTC ? 'sunrise' : 'sunset';
      } else {
        subType = candidateUTC < referenceUTC ? 'rising' : 'setting';
      }

      events.push({
        id: `${location.id}-${timeUtils.formatDateString(date)}-${eventType}`,
        type: eventType.includes('diamond') ? 'diamond' : 'pearl',
        subType,
        time: bestCandidate.time,
        location: location,
        azimuth: bestCandidate.position.azimuth,
        elevation: bestCandidate.position.elevation,
        accuracy: this.getOverallAccuracy(bestCandidate.azimuthDiff, bestCandidate.elevationDiff),
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
  private getSearchTimeRange(date: Date, eventPhase: string, location: Location): { startTime: Date; endTime: Date } {
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
        return this.getMoonriseSearchRange(date, location);
      case 'moonset':
        return this.getMoonsetSearchRange(date, location);
      default:
        return {
          startTime: baseDate,
          endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
        };
    }
  }

  /**
   * 月の出の検索時間範囲を取得
   * 太陽・月が出ている時間で計算する（24 時間全体を検索）
   */
  private getMoonriseSearchRange(date: Date, _location: Location): { startTime: Date; endTime: Date } {
    const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    
    // 24 時間全体を検索範囲とする（月の出・月の入り時刻の制約を外す）
    return {
      startTime: baseDate,
      endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  /**
   * 月の入りの検索時間範囲を取得
   * 太陽・月が出ている時間で計算する（24 時間全体を検索）
   */
  private getMoonsetSearchRange(date: Date, _location: Location): { startTime: Date; endTime: Date } {
    const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    
    // 24 時間全体を検索範囲とする（月の出・月の入り時刻の制約を外す）
    return {
      startTime: baseDate,
      endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  /**
   * 精度レベルを取得
   * TODO: 精度閾値も DB で管理するよう改善
   * INSERT INTO system_settings VALUES 
   *   ('accuracy_perfect_threshold', 0.01, '完璧精度の閾値（度）'),
   *   ('accuracy_excellent_threshold', 0.02, '高精度の閾値（度）'),
   *   ('accuracy_good_threshold', 0.035, '標準精度の閾値（度）');
   */
  private getAccuracyLevel(azimuthDiff: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    // 富士山頂の水平視直径（約32分角 = 0.53度）を基準とした厳密な方位角判定
    if (azimuthDiff <= 0.1) return 'perfect';        // ±0.1度以下：山頂中心部への完全一致
    if (azimuthDiff <= 0.25) return 'excellent';     // ±0.25度以下：山頂内側での高精度一致
    if (azimuthDiff <= 0.4) return 'good';           // ±0.4度以下：山頂縁付近での良好な一致
    if (azimuthDiff <= 0.6) return 'fair';           // ±0.6度以下：許容範囲内（山頂ギリギリ）
    return 'fair'; // 許容範囲を超える（実際には除外される）
  }

  /**
   * 仰角の精度レベルを取得
   */
  private getElevationAccuracyLevel(elevationDiff: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    // 富士山頂の視直径 約32分角 = 0.53度を基準とした厳密な判定
    if (elevationDiff <= 0.1) return 'perfect';      // ±0.1度以下：山頂中心部への完全一致
    if (elevationDiff <= 0.25) return 'excellent';   // ±0.25度以下：山頂内側での高精度一致  
    if (elevationDiff <= 0.4) return 'good';         // ±0.4度以下：山頂縁付近での良好な一致
    if (elevationDiff <= 0.6) return 'fair';         // ±0.6度以下：許容範囲内（山頂ギリギリ）
    return 'fair'; // 許容範囲を超える（実際には除外される）
  }

  /**
   * 方位角と仰角の総合的な精度レベルを取得
   */
  private getOverallAccuracy(azimuthDiff: number, elevationDiff: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    const azimuthAccuracy = this.getAccuracyLevel(azimuthDiff);
    const elevationAccuracy = this.getElevationAccuracyLevel(elevationDiff);
    
    // 両方の精度のうち、より低い方を総合精度とする
    const accuracyOrder = ['perfect', 'excellent', 'good', 'fair'];
    const azimuthIndex = accuracyOrder.indexOf(azimuthAccuracy);
    const elevationIndex = accuracyOrder.indexOf(elevationAccuracy);
    
    return accuracyOrder[Math.max(azimuthIndex, elevationIndex)] as 'perfect' | 'excellent' | 'good' | 'fair';
  }

  /**
   * 日の出ダイヤモンド富士が観測可能かチェック
   * 西側地域から富士山が東側（70-110 度）に見える場合のみ観測可能
   */
  private canObserveSunrise(fujiAzimuth: number): boolean {
    // 西側地域: 日の出時のダイヤモンド富士（方位角 70-130 度）
    return fujiAzimuth >= 70 && fujiAzimuth <= 130;
  }

  /**
   * 日の入りダイヤモンド富士が観測可能かチェック
   * 東側地域から富士山が西側（250-280 度）に見える場合のみ観測可能
   */
  private canObserveSunset(fujiAzimuth: number): boolean {
    // 東側地域: 日没時のダイヤモンド富士（方位角 230-280 度）
    return fujiAzimuth >= 230 && fujiAzimuth <= 280;
  }

  /**
   * 月没パール富士が観測可能かチェック
   * 富士山の西側エリア（方位角 180-360 度）では月没は見えない
   */
  private canObserveMoonset(fujiAzimuth: number): boolean {
    // 富士山が西側（180-360 度）にある場合は月没は観測不可
    // 月は東から昇って西に沈むため、富士山が西側にあると月没時に富士山の向こう側に沈む
    return fujiAzimuth < 180;
  }

  /**
   * イベントタイプから subType を取得
   */
  private getSubType(eventType: string): 'sunrise' | 'sunset' | 'rising' | 'setting' {
    switch (eventType) {
      case 'diamond_sunrise':
        return 'sunrise';
      case 'diamond_sunset':
        return 'sunset';
      case 'pearl_moonrise':
        return 'rising';
      case 'pearl_moonset':
        return 'setting';
      default:
        return 'sunrise';
    }
  }

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