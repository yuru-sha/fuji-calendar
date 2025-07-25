import * as Astronomy from 'astronomy-engine';
import { Location, FujiEvent, SunPosition, MoonPosition, FUJI_COORDINATES } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

// 既存のインターフェースをインポート
export interface AstronomicalCalculator {
  calculateDiamondFuji(date: Date, locations: Location[]): FujiEvent[];
  calculatePearlFuji(date: Date, locations: Location[]): FujiEvent[];
  calculateMonthlyEvents(year: number, month: number, locations: Location[]): FujiEvent[];
  getSunPosition(date: Date, latitude: number, longitude: number): SunPosition;
  getMoonPosition(date: Date, latitude: number, longitude: number): MoonPosition;
  calculateAzimuthToFuji(fromLocation: Location): number;
  isVisible(fromLocation: Location, targetAzimuth: number, celestialBody?: 'sun' | 'moon'): boolean;
  isDiamondFujiSeason(date: Date, location: Location): boolean;
  getSunMaxElevation(date: Date, location: Location): number;
  getDiamondFujiSeasonMessage(date: Date, location: Location): string | null;
  isVisibleMoonPhase(date: Date): boolean;
}

/**
 * 新しいダイヤモンド富士・パール富士検出アルゴリズム
 * 
 * 基本原理：
 * 1. 撮影地点から富士山への方位角を計算
 * 2. その日の太陽・月の軌道を追跡
 * 3. 方位角が一致し、かつ適切な高度にある時刻を特定
 * 4. 視覚的にわかりやすいシンプルなロジック
 */
export class AstronomicalCalculatorImpl implements AstronomicalCalculator {
  private logger: StructuredLogger;
  
  // 精度設定
  private readonly AZIMUTH_TOLERANCE = 1.5;   // 方位角の許容誤差（度）
  private readonly ELEVATION_TOLERANCE = 0.5; // 高度の許容誤差（度）
  private readonly MIN_ELEVATION = -2.0;      // 最低高度（大気屈折考慮）
  private readonly MAX_ELEVATION = 10.0;      // 最高高度（富士山頂相当）
  private readonly SEARCH_INTERVAL = 30;      // 検索間隔（秒）
  
  // 天体の角直径（度）
  private readonly SUN_ANGULAR_DIAMETER = 0.533;  // 太陽の角直径（約32分角）
  private readonly MOON_ANGULAR_DIAMETER = 0.518; // 月の角直径（約31分角）
  
  // ダイヤモンド富士の美しさパラメータ
  private readonly DIAMOND_ALPHA = 0.2; // 太陽中心より少し上（山頂から光が溢れる）

  constructor() {
    this.logger = getComponentLogger('new-astronomical-calculator');
  }

  /**
   * 度をラジアンに変換
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * ラジアンを度に変換
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * 撮影地点から富士山への方位角を計算（高精度）
   */
  private calculateAzimuthToFujiInternal(fromLocation: Location): number {
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // 0-360度の範囲に正規化
  }

  /**
   * 太陽の位置を取得（Astronomy Engine使用）
   */
  private getSunPositionInternal(date: Date, latitude: number, longitude: number, elevation: number = 0): SunPosition {
    const observer = new Astronomy.Observer(latitude, longitude, elevation);
    const sunEquatorial = Astronomy.SunPosition(date);
    const sunHorizontal = Astronomy.Horizon(date, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');

    return {
      azimuth: sunHorizontal.azimuth,
      elevation: sunHorizontal.altitude,
      distance: sunEquatorial.dist
    };
  }

  /**
   * 月の位置を取得（Astronomy Engine使用）
   */
  private getMoonPositionInternal(date: Date, latitude: number, longitude: number, elevation: number = 0): MoonPosition {
    const observer = new Astronomy.Observer(latitude, longitude, elevation);
    const moonGeoEquatorial = Astronomy.GeoMoon(date);
    const moonHorizontal = Astronomy.Horizon(date, observer, moonGeoEquatorial.ra, moonGeoEquatorial.dec, 'normal');
    const moonPhase = Astronomy.MoonPhase(date);
    const moonIllumination = Astronomy.Illumination('Moon', date);

    return {
      azimuth: moonHorizontal.azimuth,
      elevation: moonHorizontal.altitude,
      distance: moonGeoEquatorial.dist,
      phase: moonPhase,
      illumination: moonIllumination.phase_fraction
    };
  }

  /**
   * 方位角の差を計算（360度境界を考慮）
   */
  private getAzimuthDifference(azimuth1: number, azimuth2: number): number {
    const diff = Math.abs(azimuth1 - azimuth2);
    return Math.min(diff, 360 - diff);
  }

  /**
   * 撮影地から富士山頂への仰角を計算
   * 地球の曲率と大気屈折を考慮した正確な計算
   */
  private calculateElevationToFujiSummit(fromLocation: Location): number {
    // 地点間の距離を計算（メートル）
    const distance = this.calculateDistanceToFuji(fromLocation);
    
    // 富士山頂の標高（3776m）と撮影地の標高差
    const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
    
    // 地球の曲率による補正（地球半径 6371km）
    const earthRadius = 6371000; // meters
    const curvatureCorrection = (distance * distance) / (2 * earthRadius);
    
    // 有効高度差（曲率補正適用）
    const effectiveHeightDiff = heightDifference - curvatureCorrection;
    
    // 仰角計算（ラジアン）
    const elevationRadians = Math.atan(effectiveHeightDiff / distance);
    
    // 大気屈折補正（地平線付近で約0.57度上に見える）
    const refractionCorrection = this.calculateAtmosphericRefraction(this.toDegrees(elevationRadians));
    
    const elevationDegrees = this.toDegrees(elevationRadians) + refractionCorrection;
    
    this.logger.debug(`富士山頂仰角計算`, {
      locationName: fromLocation.name,
      distance: distance.toFixed(0),
      heightDifference: heightDifference.toFixed(1),
      curvatureCorrection: curvatureCorrection.toFixed(2),
      effectiveHeightDiff: effectiveHeightDiff.toFixed(1),
      refractionCorrection: refractionCorrection.toFixed(3),
      finalElevation: elevationDegrees.toFixed(3)
    });
    
    return elevationDegrees;
  }

  /**
   * 撮影地から富士山までの距離を計算（球面距離）
   */
  private calculateDistanceToFuji(fromLocation: Location): number {
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadius = 6371000; // meters
    
    return earthRadius * c;
  }

  /**
   * 大気屈折による補正を計算
   * 地平線付近では約0.57度上に見える（標準大気）
   */
  private calculateAtmosphericRefraction(apparentElevation: number): number {
    if (apparentElevation < -2) return 0; // 地平線より大きく下では屈折なし
    
    // 簡易大気屈折式（角度が小さい場合の近似）
    const elevationRadians = this.toRadians(Math.abs(apparentElevation));
    const refraction = 0.57 * Math.cos(elevationRadians); // 度
    
    return apparentElevation >= 0 ? refraction : -refraction;
  }

  /**
   * 複数地点のダイヤモンド富士を計算（インターフェース実装）
   */
  public calculateDiamondFuji(date: Date, locations: Location[]): FujiEvent[] {
    const events: FujiEvent[] = [];
    
    for (const location of locations) {
      const locationEvents = this.findDiamondFuji(date, location);
      events.push(...locationEvents);
    }
    
    return events;
  }

  /**
   * 複数地点のパール富士を計算（インターフェース実装）
   */
  public calculatePearlFuji(date: Date, locations: Location[]): FujiEvent[] {
    const events: FujiEvent[] = [];
    
    for (const location of locations) {
      const locationEvents = this.findPearlFuji(date, location);
      events.push(...locationEvents);
    }
    
    return events;
  }

  /**
   * 太陽位置を取得（インターフェース実装）
   */
  public getSunPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): SunPosition {
    return this.getSunPositionInternal(date, latitude, longitude, elevation);
  }

  /**
   * 月位置を取得（インターフェース実装）
   */
  public getMoonPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): MoonPosition {
    return this.getMoonPositionInternal(date, latitude, longitude, elevation);
  }

  /**
   * 高精度太陽位置計算（後方互換性のために追加）
   */
  public calculateSunPositionPrecise(date: Date, location: { latitude: number, longitude: number, elevation?: number }): SunPosition {
    return this.getSunPositionInternal(date, location.latitude, location.longitude, location.elevation || 0);
  }

  /**
   * 高精度月位置計算（後方互換性のために追加）
   */
  public calculateMoonPositionPrecise(date: Date, location: { latitude: number, longitude: number, elevation?: number }): MoonPosition {
    return this.getMoonPositionInternal(date, location.latitude, location.longitude, location.elevation || 0);
  }

  /**
   * 撮影地点から富士山への方位角を計算（インターフェース実装）
   */
  public calculateAzimuthToFuji(fromLocation: Location): number {
    return this.calculateAzimuthToFujiInternal(fromLocation);
  }

  /**
   * 可視性チェック（インターフェース実装）
   * 新アルゴリズムでは常にtrueを返す（方位角と高度で判定するため）
   */
  public isVisible(fromLocation: Location, targetAzimuth: number, celestialBody?: 'sun' | 'moon'): boolean {
    return true;
  }

  /**
   * ダイヤモンド富士シーズンチェック（インターフェース実装）
   * 新アルゴリズムでは季節制限を撤廃
   */
  public isDiamondFujiSeason(date: Date, location: Location): boolean {
    return true;
  }

  /**
   * 太陽の最大高度取得（インターフェース実装）
   */
  public getSunMaxElevation(date: Date, location: Location): number {
    // 正午の太陽高度を返す
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    const position = this.getSunPositionInternal(noon, location.latitude, location.longitude, location.elevation);
    return position.elevation;
  }

  /**
   * ダイヤモンド富士シーズンメッセージ（インターフェース実装）
   * 新アルゴリズムでは季節メッセージなし
   */
  public getDiamondFujiSeasonMessage(date: Date, location: Location): string | null {
    return null;
  }

  /**
   * 月相の可視性チェック（インターフェース実装）
   */
  public isVisibleMoonPhase(date: Date): boolean {
    const moonPosition = this.getMoonPositionInternal(date, 35.0, 139.0, 0); // 代表地点
    // 照度が10%以上なら可視とする
    return moonPosition.illumination >= 0.1;
  }

  /**
   * 指定された日の太陽軌道からダイヤモンド富士を検出（内部実装）
   */
  private findDiamondFuji(date: Date, location: Location): FujiEvent[] {
    const events: FujiEvent[] = [];
    const fujiAzimuth = this.calculateAzimuthToFuji(location);
    
    this.logger.info(`ダイヤモンド富士検索開始`, {
      locationName: location.name,
      date: date.toDateString(),
      fujiAzimuth: fujiAzimuth.toFixed(2)
    });

    // 日の出時間帯の検索（04:00-12:00）
    const sunriseEvent = this.searchCelestialAlignment(
      date, location, fujiAzimuth, 'sun', 4, 12, 'sunrise'
    );
    if (sunriseEvent) events.push(sunriseEvent);

    // 日の入り時間帯の検索（14:00-20:00）
    const sunsetEvent = this.searchCelestialAlignment(
      date, location, fujiAzimuth, 'sun', 14, 20, 'sunset'
    );
    if (sunsetEvent) events.push(sunsetEvent);

    this.logger.info(`ダイヤモンド富士検索完了`, {
      locationName: location.name,
      eventsFound: events.length,
      events: events.map(e => ({
        subType: e.subType,
        time: e.time.toLocaleTimeString('ja-JP'),
        azimuth: e.azimuth?.toFixed(2),
        elevation: e.elevation?.toFixed(2)
      }))
    });

    return events;
  }

  /**
   * 指定された日の月軌道からパール富士を検出
   */
  public findPearlFuji(date: Date, location: Location): FujiEvent[] {
    const events: FujiEvent[] = [];
    const fujiAzimuth = this.calculateAzimuthToFuji(location);
    
    this.logger.info(`パール富士検索開始`, {
      locationName: location.name,
      date: date.toDateString(),
      fujiAzimuth: fujiAzimuth.toFixed(2)
    });

    // 月の出時間帯の検索（18:00-06:00+1日）
    const moonriseEvent = this.searchCelestialAlignment(
      date, location, fujiAzimuth, 'moon', 18, 30, 'rising'
    );
    if (moonriseEvent) events.push(moonriseEvent);

    // 月の入り時間帯の検索（00:00-12:00）
    const moonsetEvent = this.searchCelestialAlignment(
      date, location, fujiAzimuth, 'moon', 0, 12, 'setting'
    );
    if (moonsetEvent) events.push(moonsetEvent);

    this.logger.info(`パール富士検索完了`, {
      locationName: location.name,
      eventsFound: events.length,
      events: events.map(e => ({
        subType: e.subType,
        time: e.time.toLocaleTimeString('ja-JP'),
        azimuth: e.azimuth?.toFixed(2),
        elevation: e.elevation?.toFixed(2)
      }))
    });

    return events;
  }

  /**
   * 天体（太陽・月）と富士山の方位角・高度が一致する時刻を検索
   * 条件：撮影地から見た天体の方位角 = 撮影地から見た富士山の方位角
   *      撮影地から見た天体の高度 = 撮影地から見た富士山頂の高度
   */
  private searchCelestialAlignment(
    date: Date, 
    location: Location, 
    targetAzimuth: number, 
    celestialBody: 'sun' | 'moon',
    startHour: number,
    endHour: number,
    subType: 'sunrise' | 'sunset' | 'rising' | 'setting'
  ): FujiEvent | null {
    
    let bestTime: Date | null = null;
    let bestPosition: SunPosition | MoonPosition | null = null;
    let minTotalDifference = Infinity;

    // 富士山頂への仰角を計算（天体の種類に応じて調整）
    const baseTargetElevation = this.calculateElevationToFujiSummit(location);
    
    // 天体ごとの目標高度調整
    let targetElevations: { pattern: string, elevation: number }[] = [];
    
    if (celestialBody === 'sun') {
      // 太陽の場合：距離に応じて最適なパターンを選択
      // 近距離：太陽上部が山頂より上（光芒効果）
      // 遠距離：太陽下部が山頂より上（富士山が太陽内に収まる）
      targetElevations = [
        { 
          pattern: 'center', 
          elevation: baseTargetElevation  // 太陽中心が山頂
        },
        { 
          pattern: 'top', 
          elevation: baseTargetElevation - this.SUN_ANGULAR_DIAMETER / 2  // 太陽上部が山頂（近距離向け）
        },
        { 
          pattern: 'bottom', 
          elevation: baseTargetElevation + this.SUN_ANGULAR_DIAMETER / 2  // 太陽下部が山頂（遠距離向け）
        }
      ];
    } else {
      // 月の場合：月の下部が山頂（パール富士の基本形）
      targetElevations = [
        { 
          pattern: 'bottom', 
          elevation: baseTargetElevation + this.MOON_ANGULAR_DIAMETER / 2  // 月下部が山頂
        }
      ];
    }

    // 検索範囲の設定（時間をまたぐ場合の処理）
    const searchStart = new Date(date);
    searchStart.setHours(startHour, 0, 0, 0);
    
    const searchEnd = new Date(date);
    if (endHour < startHour) {
      // 日をまたぐ場合（例：18:00-06:00）
      searchEnd.setDate(searchEnd.getDate() + 1);
    }
    searchEnd.setHours(endHour, 0, 0, 0);

    // 最適なパターンを探す
    let bestPattern: string | null = null;
    
    // 各パターンで検索
    for (const { pattern, elevation: targetElevation } of targetElevations) {
      this.logger.debug(`${celestialBody}アライメント検索開始 (${pattern}パターン)`, {
        locationName: location.name,
        pattern,
        targetAzimuth: targetAzimuth.toFixed(2),
        targetElevation: targetElevation.toFixed(3),
        searchRange: `${searchStart.toLocaleTimeString('ja-JP')} - ${searchEnd.toLocaleTimeString('ja-JP')}`
      });

      // 指定間隔で天体位置をチェック
      for (let time = new Date(searchStart); time <= searchEnd; time = new Date(time.getTime() + this.SEARCH_INTERVAL * 1000)) {
        
        const position = celestialBody === 'sun' 
          ? this.getSunPosition(time, location.latitude, location.longitude, location.elevation)
          : this.getMoonPosition(time, location.latitude, location.longitude, location.elevation);

        // 基本的な高度チェック：地平線付近のみ（大気屈折考慮）
        if (position.elevation < this.MIN_ELEVATION || position.elevation > this.MAX_ELEVATION) {
          continue;
        }

        // 方位角の差を計算
        const azimuthDiff = this.getAzimuthDifference(position.azimuth, targetAzimuth);
        
        // 高度の差を計算
        const elevationDiff = Math.abs(position.elevation - targetElevation);
        
        // 総合的な一致度を計算（方位角と高度の両方を考慮）
        // 方位角の重みを高くする（ダイヤモンド富士の本質的条件）
        const totalDifference = azimuthDiff * 2.0 + elevationDiff * 1.0;
        
        // 最小差を更新
        if (totalDifference < minTotalDifference) {
          minTotalDifference = totalDifference;
          bestTime = new Date(time);
          bestPosition = position;
          bestPattern = pattern;
          
          this.logger.debug(`候補更新 (${pattern}パターン)`, {
            time: time.toLocaleTimeString('ja-JP'),
            pattern,
            azimuthDiff: azimuthDiff.toFixed(3),
            elevationDiff: elevationDiff.toFixed(3),
            totalDiff: totalDifference.toFixed(3)
          });
        }
      }
    }

    // 方位角と高度の両方が許容誤差内かチェック
    if (bestTime && bestPosition && bestPattern) {
      // 最適パターンの目標高度を取得
      const bestPatternElevation = targetElevations.find(te => te.pattern === bestPattern)?.elevation || baseTargetElevation;
      
      const finalAzimuthDiff = this.getAzimuthDifference(bestPosition.azimuth, targetAzimuth);
      const finalElevationDiff = Math.abs(bestPosition.elevation - bestPatternElevation);
      
      const azimuthOK = finalAzimuthDiff <= this.AZIMUTH_TOLERANCE;
      const elevationOK = finalElevationDiff <= this.ELEVATION_TOLERANCE;
      
      if (azimuthOK && elevationOK) {
        const accuracy = this.getAccuracyLevel(finalAzimuthDiff, finalElevationDiff);
        
        this.logger.info(`${celestialBody === 'sun' ? 'ダイヤモンド' : 'パール'}富士発見`, {
          subType,
          pattern: bestPattern,
          time: bestTime.toLocaleTimeString('ja-JP'),
          celestialAzimuth: bestPosition.azimuth.toFixed(2),
          targetAzimuth: targetAzimuth.toFixed(2),
          azimuthDiff: finalAzimuthDiff.toFixed(3),
          celestialElevation: bestPosition.elevation.toFixed(3),
          targetElevation: bestPatternElevation.toFixed(3),
          elevationDiff: finalElevationDiff.toFixed(3),
          accuracy
        });

        return {
          id: `${celestialBody === 'sun' ? 'diamond' : 'pearl'}-${subType}-${location.id}-${timeUtils.formatDateString(date)}`,
          type: celestialBody === 'sun' ? 'diamond' : 'pearl',
          subType: subType as 'sunrise' | 'sunset' | 'rising' | 'setting',
          time: bestTime,
          location: location,
          azimuth: bestPosition.azimuth,
          elevation: bestPosition.elevation,
          accuracy,
          moonPhase: celestialBody === 'moon' ? (bestPosition as MoonPosition).phase : undefined,
          moonIllumination: celestialBody === 'moon' ? (bestPosition as MoonPosition).illumination : undefined
        };
      }
      
      this.logger.debug(`${celestialBody === 'sun' ? 'ダイヤモンド' : 'パール'}富士条件不適合`, {
        subType,
        pattern: bestPattern,
        azimuthOK,
        elevationOK,
        azimuthDiff: finalAzimuthDiff.toFixed(3),
        elevationDiff: finalElevationDiff.toFixed(3),
        azimuthThreshold: this.AZIMUTH_TOLERANCE,
        elevationThreshold: this.ELEVATION_TOLERANCE
      });
    }

    return null;
  }

  /**
   * 方位角差と高度差から精度レベルを判定
   */
  private getAccuracyLevel(azimuthDiff: number, elevationDiff: number): 'perfect' | 'excellent' | 'good' | 'fair' {
    // 両方の条件を考慮した総合精度
    const totalError = azimuthDiff + elevationDiff;
    
    if (azimuthDiff <= 0.1 && elevationDiff <= 0.1) return 'perfect';
    if (azimuthDiff <= 0.5 && elevationDiff <= 0.2) return 'excellent';
    if (azimuthDiff <= 1.0 && elevationDiff <= 0.3) return 'good';
    return 'fair';
  }

  /**
   * 月間イベント計算（パフォーマンス最適化版）
   */
  public calculateMonthlyEvents(year: number, month: number, locations: Location[]): FujiEvent[] {
    const startTime = Date.now();
    const events: FujiEvent[] = [];

    this.logger.info(`月間イベント計算開始`, {
      year, month, locationCount: locations.length
    });

    // 月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 各日付で計算
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      
      for (const location of locations) {
        // ダイヤモンド富士を検索
        const diamondEvents = this.findDiamondFuji(date, location);
        events.push(...diamondEvents);
        
        // パール富士を検索
        const pearlEvents = this.findPearlFuji(date, location);
        events.push(...pearlEvents);
      }
    }

    const endTime = Date.now();
    this.logger.info(`月間イベント計算完了`, {
      year, month,
      totalEvents: events.length,
      calculationTimeMs: endTime - startTime,
      eventsPerSecond: ((events.length / (endTime - startTime)) * 1000).toFixed(1)
    });

    return events;
  }
}