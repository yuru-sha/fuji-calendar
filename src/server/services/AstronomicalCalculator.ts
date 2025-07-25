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

  // 精度設定（実測値ベース）
  private readonly AZIMUTH_TOLERANCE = 1.5;   // 方位角の許容誤差（度）
  private readonly ELEVATION_TOLERANCE = 0.5; // 高度の許容誤差（度）
  private readonly MIN_ELEVATION = -2.0;      // 最低高度（大気屈折考慮）
  private readonly MAX_ELEVATION = 10.0;      // 最高高度（富士山頂相当）
  private readonly SEARCH_INTERVAL = 30;      // 検索間隔（秒）- 事前計算向け

  // 天体の角直径（度）- 天文学的標準値
  private readonly SUN_ANGULAR_DIAMETER = 0.533;  // 太陽の角直径（約32分角）
  private readonly MOON_ANGULAR_DIAMETER = 0.518; // 月の角直径（約31分角、平均値）

  // 物理定数
  private readonly EARTH_RADIUS = 6371000; // 地球半径（メートル）
  private readonly ATMOSPHERIC_REFRACTION_STANDARD = 0.57; // 標準大気屈折（度）

  // ダイヤモンド富士の美しさパラメータ（将来の拡張用）
  // private readonly DIAMOND_ALPHA = 0.2; // 太陽中心より少し上（山頂から光が溢れる）

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
    // elevation が undefined, null, NaN の場合は 0 にする
    const safeElevation = (elevation != null && !isNaN(elevation)) ? elevation : 0;
    const observer = new Astronomy.Observer(latitude, longitude, safeElevation);
    const sunEquatorial = Astronomy.Equator(Astronomy.Body.Sun, date, observer, false, false);
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
    // elevation が undefined, null, NaN の場合は 0 にする
    const safeElevation = (elevation != null && !isNaN(elevation)) ? elevation : 0;
    const observer = new Astronomy.Observer(latitude, longitude, safeElevation);
    const moonEquatorial = Astronomy.Equator(Astronomy.Body.Moon, date, observer, false, false);
    const moonHorizontal = Astronomy.Horizon(date, observer, moonEquatorial.ra, moonEquatorial.dec, 'normal');
    const moonPhase = Astronomy.MoonPhase(date);
    const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, date);

    return {
      azimuth: moonHorizontal.azimuth,
      elevation: moonHorizontal.altitude,
      distance: moonEquatorial.dist,
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
   * 地球の曲率と大気屈折を正確に考慮した計算
   */
  private calculateElevationToFujiSummit(fromLocation: Location): number {
    // 地点間の距離を計算（メートル）
    const distance = this.calculateDistanceToFuji(fromLocation);

    // 観測者の実効的な高さ（地面からの目の高さ）
    // アイレベル1.7mを仮定（一般的なカメラ高度）
    const observerEyeLevel = 1.7; // メートル
    const observerEffectiveHeight = fromLocation.elevation + observerEyeLevel;

    // 富士山山頂と観測者の目の高さの標高差
    const heightDifference = FUJI_COORDINATES.elevation - observerEffectiveHeight;

    // 地球の丸みによる見かけの低下（メートル）
    const curvatureDrop = (distance * distance) / (2 * this.EARTH_RADIUS);

    // 大気屈折による見かけの持ち上げ（メートル）
    // 大気屈折率k=0.13（標準値）
    const refractionCoefficient = 0.13;
    const refractionLift = refractionCoefficient * curvatureDrop;

    // 正味の見かけの低下（メートル）
    const netApparentDrop = curvatureDrop - refractionLift;

    // 最終的な見かけの垂直距離
    const apparentVerticalDistance = heightDifference - netApparentDrop;

    // 仰角の計算（ラジアン）
    const elevationRadians = Math.atan2(apparentVerticalDistance, distance);
    const elevationDegrees = this.toDegrees(elevationRadians);

    this.logger.debug(`富士山頂仰角計算（正確な計算式）`, {
      locationName: fromLocation.name,
      distance: distance.toFixed(0),
      observerEffectiveHeight: observerEffectiveHeight.toFixed(1),
      heightDifference: heightDifference.toFixed(1),
      curvatureDrop: curvatureDrop.toFixed(2),
      refractionLift: refractionLift.toFixed(2),
      netApparentDrop: netApparentDrop.toFixed(2),
      apparentVerticalDistance: apparentVerticalDistance.toFixed(1),
      finalElevation: elevationDegrees.toFixed(6)
    });

    return elevationDegrees;
  }

  /**
   * 撮影地から富士山までの距離を計算（球面距離）
   */
  private calculateDistanceToFuji(fromLocation: Location): number {
    // 入力値の検証
    if (!fromLocation || typeof fromLocation.latitude !== 'number' || typeof fromLocation.longitude !== 'number') {
      throw new Error('Invalid location data for distance calculation');
    }

    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS * c;

    // 結果の妥当性チェック（日本国内の合理的な範囲）
    if (distance < 1000 || distance > 1000000) { // 1km〜1000km
      this.logger.warn('Distance calculation result seems unreasonable', {
        locationName: fromLocation.name,
        distance: distance.toFixed(0),
        latitude: fromLocation.latitude,
        longitude: fromLocation.longitude
      });
    }

    return distance;
  }

  /**
   * 大気屈折による補正を計算
   * 仰角に応じた正確な大気屈折補正を適用
   */
  private calculateAtmosphericRefraction(apparentElevation: number): number {
    if (apparentElevation < -2) return 0; // 地平線より大きく下では屈折なし

    // 仰角が高い場合は屈折が小さくなる
    if (apparentElevation > 15) return 0; // 15度以上では屈折はほぼ無視できる

    // Saemundsson公式による大気屈折補正（分角）
    // R = 1.02 / tan(h + 10.3/(h + 5.11)) - 0.0019279
    // ここで h は見かけの仰角（度）
    const h = Math.abs(apparentElevation);

    if (h < 0.2) {
      // 地平線付近の特別処理
      const refractionArcmin = 34.1; // 約34分角 = 0.568度
      return apparentElevation >= 0 ? refractionArcmin / 60 : -refractionArcmin / 60;
    }

    // Saemundsson公式（分角で計算）
    const denominator = h + 10.3 / (h + 5.11);
    const refractionArcmin = 1.02 / Math.tan(this.toRadians(denominator)) - 0.0019279;

    // 分角を度に変換
    const refractionDegrees = refractionArcmin / 60;

    this.logger.debug('大気屈折補正計算', {
      apparentElevation: apparentElevation.toFixed(3),
      refractionArcmin: refractionArcmin.toFixed(3),
      refractionDegrees: refractionDegrees.toFixed(6)
    });

    return apparentElevation >= 0 ? refractionDegrees : -refractionDegrees;
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
    // 入力値の検証
    const safeLatitude = Number(latitude) || 0;
    const safeLongitude = Number(longitude) || 0;
    const safeElevation = Number(elevation) || 0;

    return this.getSunPositionInternal(date, safeLatitude, safeLongitude, safeElevation);
  }

  /**
   * 月位置を取得（インターフェース実装）
   */
  public getMoonPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): MoonPosition {
    // 入力値の検証
    const safeLatitude = Number(latitude) || 0;
    const safeLongitude = Number(longitude) || 0;
    const safeElevation = Number(elevation) || 0;

    return this.getMoonPositionInternal(date, safeLatitude, safeLongitude, safeElevation);
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
   * 富士山への方位角計算（後方互換性）
   */
  public calculateBearingToFuji(location: Location): number {
    return this.calculateAzimuthToFujiInternal(location);
  }

  /**
   * 富士山への仰角計算（後方互換性）
   */
  public calculateElevationToFuji(location: Location): number {
    return this.calculateElevationToFujiSummit(location);
  }

  /**
   * 富士山への距離計算（公開メソッド）
   */
  public getDistanceToFuji(location: Location): number {
    return this.calculateDistanceToFuji(location);
  }

  /**
   * 太陽位置計算（後方互換性）
   */
  public calculateSunPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): SunPosition {
    return this.getSunPositionInternal(date, latitude, longitude, elevation);
  }

  /**
   * 月位置計算（後方互換性）
   */
  public calculateMoonPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): MoonPosition {
    return this.getMoonPositionInternal(date, latitude, longitude, elevation);
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
  public isVisible(_fromLocation: Location, _targetAzimuth: number, _celestialBody?: 'sun' | 'moon'): boolean {
    return true;
  }

  /**
   * ダイヤモンド富士シーズンチェック（インターフェース実装）
   * 新アルゴリズムでは季節制限を撤廃
   */
  public isDiamondFujiSeason(_date: Date, _location: Location): boolean {
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
  public getDiamondFujiSeasonMessage(_date: Date, _location: Location): string | null {
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

    // 検索範囲の設定（JST基準、時間をまたぐ場合の処理）
    const searchStart = new Date(date);
    searchStart.setHours(startHour, 0, 0, 0);

    const searchEnd = new Date(date);
    if (endHour < startHour) {
      // 日をまたぐ場合（例：18:00-06:00）
      searchEnd.setDate(searchEnd.getDate() + 1);
    }
    searchEnd.setHours(endHour, 0, 0, 0);

    // JST時刻として明示的に処理
    this.logger.debug('検索時間範囲設定', {
      locationName: location.name,
      searchStartJST: timeUtils.formatDateTimeString(searchStart),
      searchEndJST: timeUtils.formatDateTimeString(searchEnd),
      celestialBody
    });

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

      // 動的検索間隔の決定（昇り・沈みによる調整）
      let searchInterval = this.SEARCH_INTERVAL;

      // subTypeに基づく間隔調整（実測値ベース）
      if (subType === 'setting' || subType === 'sunset') {
        // 沈みは変化率が高いため、より細かい間隔
        searchInterval = Math.max(15, this.SEARCH_INTERVAL * 0.7);
      } else if (subType === 'rising' || subType === 'sunrise') {
        // 昇りは変化率が低いため、標準間隔
        searchInterval = this.SEARCH_INTERVAL;
      }

      this.logger.debug('動的検索間隔設定', {
        subType,
        celestialBody,
        baseInterval: this.SEARCH_INTERVAL,
        adjustedInterval: searchInterval
      });

      for (let time = new Date(searchStart); time <= searchEnd; time = new Date(time.getTime() + searchInterval * 1000)) {

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

    // 最適候補が見つかった場合、周辺をより細かく検索（10秒間隔）
    if (bestTime && bestPosition && bestPattern && minTotalDifference < 3.0) {
      this.logger.debug('細密検索開始', {
        initialBestTime: bestTime.toLocaleTimeString('ja-JP'),
        initialDifference: minTotalDifference.toFixed(3)
      });

      const fineSearchStart = new Date(bestTime.getTime() - 2 * 60 * 1000); // 前後2分
      const fineSearchEnd = new Date(bestTime.getTime() + 2 * 60 * 1000);
      const bestPatternElevation = targetElevations.find(te => te.pattern === bestPattern)?.elevation || baseTargetElevation;

      let fineMinDifference = minTotalDifference;
      let fineBestTime = bestTime;
      let fineBestPosition = bestPosition;

      // 動的細密検索間隔（subTypeに応じて調整）
      let fineInterval = 10; // デフォルト10秒
      if (subType === 'setting' || subType === 'sunset') {
        fineInterval = 5; // 沈みは5秒間隔
      }

      this.logger.debug('細密検索間隔設定', {
        subType,
        fineInterval
      });

      // 動的間隔で細密検索
      for (let time = fineSearchStart; time <= fineSearchEnd; time = new Date(time.getTime() + fineInterval * 1000)) {
        const position = celestialBody === 'sun'
          ? this.getSunPosition(time, location.latitude, location.longitude, location.elevation)
          : this.getMoonPosition(time, location.latitude, location.longitude, location.elevation);

        if (position.elevation < this.MIN_ELEVATION || position.elevation > this.MAX_ELEVATION) {
          continue;
        }

        const azimuthDiff = this.getAzimuthDifference(position.azimuth, targetAzimuth);
        const elevationDiff = Math.abs(position.elevation - bestPatternElevation);
        const totalDifference = azimuthDiff * 2.0 + elevationDiff * 1.0;

        if (totalDifference < fineMinDifference) {
          fineMinDifference = totalDifference;
          fineBestTime = new Date(time);
          fineBestPosition = position;
        }
      }

      bestTime = fineBestTime;
      bestPosition = fineBestPosition;
      minTotalDifference = fineMinDifference;

      this.logger.debug('細密検索完了', {
        finalBestTime: bestTime.toLocaleTimeString('ja-JP'),
        finalDifference: minTotalDifference.toFixed(3),
        improvement: (minTotalDifference < fineMinDifference ? '改善あり' : '変化なし')
      });
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

    // 月の日数を取得（JST基準）
    const monthEnd = timeUtils.getMonthEnd(year, month);
    const daysInMonth = monthEnd.getDate();

    // 各日付で計算（JST基準の日付生成）
    for (let day = 1; day <= daysInMonth; day++) {
      // JST基準で日付を作成
      const date = new Date(year, month - 1, day, 12, 0, 0, 0); // JST正午を基準

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

  /**
   * 年間イベント計算（事前計算用）
   * 地点登録時や年次更新で使用
   */
  public calculateYearlyEvents(year: number, locations: Location[]): FujiEvent[] {
    const startTime = Date.now();
    const events: FujiEvent[] = [];

    this.logger.info(`年間イベント計算開始`, {
      year, locationCount: locations.length
    });

    // 各月で計算
    for (let month = 1; month <= 12; month++) {
      const monthEvents = this.calculateMonthlyEvents(year, month, locations);
      events.push(...monthEvents);
    }

    const endTime = Date.now();
    this.logger.info(`年間イベント計算完了`, {
      year,
      totalEvents: events.length,
      calculationTimeMs: endTime - startTime,
      avgEventsPerMonth: Math.round(events.length / 12)
    });

    return events;
  }

  /**
   * 単一地点の年間イベント計算（地点登録時用）
   */
  public calculateLocationYearlyEvents(year: number, location: Location): FujiEvent[] {
    return this.calculateYearlyEvents(year, [location]);
  }
}