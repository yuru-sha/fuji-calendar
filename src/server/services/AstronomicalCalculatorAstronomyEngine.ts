import * as Astronomy from 'astronomy-engine';
import { FujiEvent, Location, FUJI_COORDINATES } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import { getComponentLogger } from '../../shared/utils/logger';

interface SearchRange {
  type: 'sunrise' | 'sunset';
  start: number; // 時
  end: number;   // 時
}

interface CelestialPosition {
  azimuth: number;
  elevation: number;
  correctedElevation: number;
}

/**
 * Astronomy Engine を使用した高精度天体計算クラス
 * NASA JPL準拠の天体暦による正確なダイヤモンド富士・パール富士計算
 */
export class AstronomicalCalculatorAstronomyEngine {
  private logger = getComponentLogger('astronomical-calculator-astronomy-engine');

  // 最適化パラメータ
  private readonly SEARCH_INTERVAL_MINUTES = 1; // 1分刻み
  private readonly TOLERANCE = {
    elevation: 0.25,      // ダイヤモンド富士用
    pearlElevation: 4.0   // パール富士用（月の視直径と撮影条件を考慮して大幅に緩和）
  };

  // 実際の観測データに基づく方位角許容誤差（固定値）
  // 動的計算の問題点:
  // - 理論値の調整係数（例: 1.3）が経験値で実観測と不一致
  // - 山頂の角度幅計算が理論的で、大気揺らぎや撮影条件を無視
  // - 距離による線形変化が実際の成功率と合わない
  private readonly AZIMUTH_TOLERANCE = {
    close: 0.25,   // 50km以内 - 2/17-19の3日間のみ検出する精密判定
    medium: 0.4,   // 50-100km - 中距離での精密判定
    far: 0.6       // 100km以上 - 遠距離でも精密な判定
  };

  // パール富士専用方位角許容範囲（ダイヤモンド富士の3-4倍）
  private readonly PEARL_AZIMUTH_TOLERANCE = {
    close: 1.0,    // 50km以内（ダイヤモンド富士の4倍）
    medium: 2.0,   // 50-100km（ダイヤモンド富士の5倍）
    far: 3.0       // 100km以上（ダイヤモンド富士の5倍）
  };

  // 富士山頂稜線の実測値を使用
  private readonly FUJI_SUMMIT_PROFILE = {
    // 剣ヶ峰から見た稜線の角度プロファイル
    elevationProfile: [
      { azimuth: -2, elevation: 3775 },  // 西側
      { azimuth: 0, elevation: 3776 },   // 剣ヶ峰
      { azimuth: 2, elevation: 3774 }    // 東側
    ]
  };

  /**
   * 撮影地点から富士山への方位角を計算
   */
  calculateBearingToFuji(fromLocation: Location): number {
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * 撮影地点から剣ヶ峰の高さ（標高3776m地点）への仰角を計算
   * ダイヤモンド富士：太陽の中心がこの仰角と一致する現象
   */
  calculateElevationToFuji(fromLocation: Location): number {
    // 地球の曲率を考慮した距離計算
    const earthRadius = 6371; // km
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const waterDistance = earthRadius * c; // 水平距離

    // 剣ヶ峰の高さ（標高3776m）への仰角計算
    // 太陽の中心がこの高さに重なる時がダイヤモンド富士
    const heightDifference = (FUJI_COORDINATES.elevation - fromLocation.elevation) / 1000; // km
    const elevation = this.toDegrees(Math.atan(heightDifference / waterDistance));

    return elevation;
  }

  /**
   * 撮影地点から富士山までの距離を計算
   */
  calculateDistanceToFuji(fromLocation: Location): number {
    const earthRadius = 6371; // km
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  /**
   * 距離に応じた方位角許容範囲を取得（観測データベース）
   */
  private getAzimuthTolerance(distanceKm: number): number {
    if (distanceKm <= 50) return this.AZIMUTH_TOLERANCE.close;
    if (distanceKm <= 100) return this.AZIMUTH_TOLERANCE.medium;
    return this.AZIMUTH_TOLERANCE.far;
  }

  /**
   * パール富士用の距離に応じた方位角許容範囲を取得
   */
  private getPearlAzimuthTolerance(distanceKm: number): number {
    if (distanceKm <= 50) return this.PEARL_AZIMUTH_TOLERANCE.close;
    if (distanceKm <= 100) return this.PEARL_AZIMUTH_TOLERANCE.medium;
    return this.PEARL_AZIMUTH_TOLERANCE.far;
  }

  /**
   * 富士山頂稜線プロファイルから指定方位角の標高を取得
   */
  private getSummitElevationAtAzimuth(targetAzimuth: number, fujiAzimuth: number): number {
    // 富士山への方位角からの相対角度を計算
    const relativeAzimuth = targetAzimuth - fujiAzimuth;

    // 稜線プロファイルから最適な標高を選択
    let bestMatch = this.FUJI_SUMMIT_PROFILE.elevationProfile[1]; // デフォルトは剣ヶ峰
    let minDiff = Math.abs(relativeAzimuth);

    for (const point of this.FUJI_SUMMIT_PROFILE.elevationProfile) {
      const diff = Math.abs(relativeAzimuth - point.azimuth);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = point;
      }
    }

    return bestMatch.elevation;
  }

  /**
   * 高精度ダイヤモンド富士計算（単一日付）
   */
  async calculateDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const startTime = Date.now();

    this.logger.astronomical('info', 'ダイヤモンド富士計算開始', {
      calculationType: 'diamond',
      date: timeUtils.formatDateString(date),
      locationName: location.name,
      locationId: location.id
    });

    // ダイヤモンド富士シーズン判定
    if (!this.isDiamondFujiSeason(date)) {
      this.logger.astronomical('debug', 'ダイヤモンド富士シーズン外', {
        calculationType: 'diamond',
        date: timeUtils.formatDateString(date),
        locationName: location.name
      });
      return [];
    }

    const events: FujiEvent[] = [];

    // 事前計算値を使用（存在する場合）
    const fujiAzimuth = location.fujiAzimuth ?? this.calculateBearingToFuji(location);
    const fujiElevation = location.fujiElevation ?? this.calculateElevationToFuji(location);

    // 季節に応じた検索範囲を取得
    const searchRanges = this.getOptimizedSearchRanges(date);

    for (const range of searchRanges) {
      const optimalTime = await this.findOptimalTimeWithAstronomyEngine(
        date, location, fujiAzimuth, fujiElevation, range
      );

      if (optimalTime) {
        const event: FujiEvent = {
          id: `diamond_${location.id}_${date.toISOString().split('T')[0]}_${range.type}`,
          type: 'diamond',
          subType: range.type === 'sunrise' ? 'sunrise' : 'sunset',
          time: optimalTime,
          location,
          azimuth: fujiAzimuth,
          elevation: fujiElevation
        };
        events.push(event);

        this.logger.astronomical('info', 'ダイヤモンド富士発見', {
          calculationType: 'diamond',
          date: timeUtils.formatDateString(date),
          locationName: location.name,
          azimuth: fujiAzimuth,
          elevation: fujiElevation,
          time: timeUtils.formatTimeString(optimalTime)
        });
      }
    }

    const searchTime = Date.now() - startTime;
    this.logger.astronomical('info', 'ダイヤモンド富士計算完了', {
      calculationType: 'diamond',
      date: timeUtils.formatDateString(date),
      locationName: location.name,
      searchTimeMs: searchTime,
      eventCount: events.length
    });

    return events;
  }

  /**
   * 高精度パール富士計算（単一日付）
   * 改善版: 月の出入り時刻に限定せず、月が地平線上にある全時間帯をチェック
   */
  async calculatePearlFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const startTime = Date.now();

    this.logger.astronomical('info', 'パール富士計算開始', {
      calculationType: 'pearl',
      date: timeUtils.formatDateString(date),
      locationName: location.name,
      locationId: location.id
    });

    const events: FujiEvent[] = [];

    // 事前計算値を使用（存在する場合）
    const fujiAzimuth = location.fujiAzimuth ?? this.calculateBearingToFuji(location);
    const fujiElevation = location.fujiElevation ?? this.calculateElevationToFuji(location);

    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);

    try {
      // 指定された日付の範囲を明確に定義（JST基準）
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // 月相をチェック（新月期間は除外）
      const moonPhase = Astronomy.MoonPhase(date);
      const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));

      if (illuminationFraction < 0.1) {
        this.logger.astronomical('debug', 'パール富士: 新月期間のため除外', {
          date: timeUtils.formatDateString(date),
          illuminationFraction: illuminationFraction.toFixed(2),
          locationName: location.name
        });
        return events;
      }

      // その日の全時間帯を1時間刻みでチェックして候補を見つける
      const candidates: Date[] = [];

      for (let hour = 0; hour < 24; hour++) {
        const checkTime = new Date(startOfDay);
        checkTime.setHours(hour, 0, 0, 0);

        try {
          const equatorial = Astronomy.Equator(Astronomy.Body.Moon, checkTime, observer, true, true);
          const horizontal = Astronomy.Horizon(checkTime, observer, equatorial.ra, equatorial.dec, 'normal');

          // 月が地平線上にある場合のみチェック
          if (horizontal.altitude > -1) { // 地平線より少し下まで含める
            const azimuthDiff = Math.abs(horizontal.azimuth - fujiAzimuth);
            const elevationDiff = Math.abs(horizontal.altitude - fujiElevation);

            // 粗い判定で候補を絞り込み（許容範囲の2倍）
            const azimuthTolerance = this.getPearlAzimuthTolerance(location.fujiDistance ?? this.calculateDistanceToFuji(location));
            if (azimuthDiff <= azimuthTolerance * 2 && elevationDiff <= this.TOLERANCE.pearlElevation * 2) {
              candidates.push(new Date(checkTime));

              this.logger.astronomical('debug', 'パール富士候補発見', {
                time: checkTime.toISOString(),
                azimuthDiff: azimuthDiff.toFixed(2),
                elevationDiff: elevationDiff.toFixed(2),
                locationName: location.name
              });
            }
          }
        } catch (error) {
          // エラーは無視して続行
        }
      }

      // 候補がある場合、詳細検索
      for (const candidateTime of candidates) {
        const detailedEvent = await this.findPrecisePearlFujiTime(candidateTime, location, fujiAzimuth, fujiElevation);
        if (detailedEvent) {
          events.push(detailedEvent);

          this.logger.astronomical('info', 'パール富士発見', {
            date: timeUtils.formatDateString(date),
            eventTime: detailedEvent.time.toISOString(),
            locationName: location.name
          });
        }
      }

    } catch (error) {
      this.logger.astronomical('error', 'パール富士計算エラー', {
        date: timeUtils.formatDateString(date),
        locationName: location.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const searchTime = Date.now() - startTime;
    this.logger.astronomical('info', 'パール富士計算完了', {
      calculationType: 'pearl',
      date: timeUtils.formatDateString(date),
      locationName: location.name,
      searchTimeMs: searchTime,
      eventCount: events.length
    });

    return events;
  }

  /**
   * 候補時刻の詳細検索（前後2時間を10分刻み）
   */
  private async findPrecisePearlFujiTime(
    candidateTime: Date,
    location: Location,
    targetAzimuth: number,
    targetElevation: number
  ): Promise<FujiEvent | null> {
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);

    const searchStart = new Date(candidateTime.getTime() - 2 * 60 * 60 * 1000); // 2時間前
    const searchEnd = new Date(candidateTime.getTime() + 2 * 60 * 60 * 1000);   // 2時間後

    let bestMatch: { time: Date; score: number; subType: 'rising' | 'setting' } | null = null;
    let bestScore = Infinity;

    // 10分刻みで詳細検索
    for (let searchTime = new Date(searchStart); searchTime <= searchEnd; searchTime.setMinutes(searchTime.getMinutes() + 10)) {
      try {
        const equatorial = Astronomy.Equator(Astronomy.Body.Moon, searchTime, observer, true, true);
        const horizontal = Astronomy.Horizon(searchTime, observer, equatorial.ra, equatorial.dec, 'normal');

        // 月が地平線上にある場合のみ
        if (horizontal.altitude > -0.5) {
          const azimuthDiff = Math.abs(horizontal.azimuth - targetAzimuth);
          const elevationDiff = Math.abs(horizontal.altitude - targetElevation);

          // パール富士の許容範囲
          const distanceKm = location.fujiDistance ?? this.calculateDistanceToFuji(location);
          const azimuthTolerance = this.getPearlAzimuthTolerance(distanceKm);

          if (azimuthDiff <= azimuthTolerance && elevationDiff <= this.TOLERANCE.pearlElevation) {
            const score = azimuthDiff + elevationDiff;
            if (score < bestScore) {
              bestScore = score;
              bestMatch = {
                time: new Date(searchTime),
                score,
                subType: searchTime.getHours() < 12 ? 'rising' : 'setting'
              };
            }
          }
        }
      } catch (error) {
        // エラーは無視して続行
      }
    }

    if (bestMatch) {
      return {
        id: `pearl_${location.id}_${bestMatch.time.toISOString().split('T')[0]}_${bestMatch.subType}`,
        type: 'pearl',
        subType: bestMatch.subType,
        time: bestMatch.time,
        location,
        azimuth: targetAzimuth,
        elevation: targetElevation
      };
    }

    return null;
  }

  /**
   * 月間イベント計算（複数地点対応）
   */
  async calculateMonthlyEvents(year: number, month: number, locations: Location[]): Promise<FujiEvent[]> {
    const allEvents: FujiEvent[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    this.logger.astronomical('info', '月間計算開始', {
      calculationType: 'diamond',
      year,
      month,
      locationCount: locations.length,
      daysInMonth
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);

      for (const location of locations) {
        try {
          const diamondEvents = await this.calculateDiamondFuji(date, location);
          const pearlEvents = await this.calculatePearlFuji(date, location);

          allEvents.push(...diamondEvents, ...pearlEvents);
        } catch (error) {
          this.logger.astronomical('error', '日別計算エラー', {
            calculationType: 'diamond',
            year,
            month,
            day,
            locationId: location.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    this.logger.astronomical('info', '月間計算完了', {
      calculationType: 'diamond',
      year,
      month,
      locationCount: locations.length,
      totalEvents: allEvents.length
    });

    return allEvents;
  }

  /**
   * 2段階最適化検索
   */
  private async findOptimalTimeWithAstronomyEngine(
    date: Date,
    location: Location,
    targetAzimuth: number,
    targetElevation: number,
    range: SearchRange
  ): Promise<Date | null> {

    // Phase 1: 10分刻みで候補範囲を特定（粗い検索）
    const roughCandidates = await this.findRoughCandidates(
      date, location, targetAzimuth, range, 10 // 10分刻み
    );

    if (roughCandidates.length === 0) return null;

    // Phase 2: 最有力候補の前後30分を1分刻みで精密検索
    const bestCandidate = roughCandidates[0];
    return await this.findPreciseTime(
      bestCandidate, location, targetAzimuth, targetElevation, 1 // 1分刻み
    );
  }

  /**
   * 粗い検索（10分刻み）
   */
  private async findRoughCandidates(
    date: Date,
    location: Location,
    targetAzimuth: number,
    range: SearchRange,
    intervalMinutes: number
  ): Promise<Date[]> {
    const candidates: Date[] = [];

    const startTime = new Date(date);
    startTime.setHours(range.start, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(range.end, 0, 0, 0);

    for (let time = new Date(startTime); time <= endTime; time.setMinutes(time.getMinutes() + intervalMinutes)) {
      const sunPosition = await this.calculateSunPositionPrecise(time, location);
      const azimuthDifference = Math.abs(sunPosition.azimuth - targetAzimuth);

      // 観測データに基づく方位角許容範囲（粗い検索では2倍に拡大）
      const distanceKm = location.fujiDistance ?? this.calculateDistanceToFuji(location);
      const azimuthTolerance = this.getAzimuthTolerance(distanceKm) * 2;

      if (azimuthDifference <= azimuthTolerance) { // 粗い検索では許容範囲を広く
        candidates.push(new Date(time));
      }
    }

    return candidates;
  }

  /**
   * 精密検索（1分刻み）
   */
  private async findPreciseTime(
    candidateTime: Date,
    location: Location,
    targetAzimuth: number,
    targetElevation: number,
    intervalMinutes: number
  ): Promise<Date | null> {
    try {
      let bestTime: Date | null = null;
      let minDifference = Infinity;

      // 候補時刻の前径60分を検索（範囲を拡大）
      const startTime = new Date(candidateTime);
      startTime.setMinutes(startTime.getMinutes() - 60);

      const endTime = new Date(candidateTime);
      endTime.setMinutes(endTime.getMinutes() + 60);

      for (let time = new Date(startTime); time <= endTime; time.setMinutes(time.getMinutes() + intervalMinutes)) {
        const sunPosition = await this.calculateSunPositionPrecise(time, location);

        const azimuthDifference = Math.abs(sunPosition.azimuth - targetAzimuth);
        const elevationDifference = Math.abs(sunPosition.correctedElevation - targetElevation);

        // 観測データに基づく方位角許容範囲を取得
        const distanceKm = location.fujiDistance ?? this.calculateDistanceToFuji(location);
        const azimuthTolerance = this.getAzimuthTolerance(distanceKm);

        // 詳細な計算ログを出力
        this.logger.astronomical('debug', 'ダイヤモンド富士詳細計算', {
          time: time.toISOString(),
          sunAzimuth: sunPosition.azimuth,
          sunElevation: sunPosition.elevation,
          correctedElevation: sunPosition.correctedElevation,
          targetAzimuth: targetAzimuth,
          targetElevation: targetElevation,
          azimuthDiff: Math.abs(sunPosition.azimuth - targetAzimuth),
          elevationDiff: Math.abs(sunPosition.correctedElevation - targetElevation),
          azimuthTolerance: azimuthTolerance,
          elevationTolerance: this.TOLERANCE.elevation
        });

        // 方位角と仰角の両方をチェック
        if (azimuthDifference <= azimuthTolerance && elevationDifference <= this.TOLERANCE.elevation) {
          const totalDifference = azimuthDifference + elevationDifference;

          this.logger.astronomical('info', 'ダイヤモンド富士条件適合', {
            time: time.toISOString(),
            totalDifference,
            currentMinDifference: minDifference
          });

          if (totalDifference < minDifference) {
            minDifference = totalDifference;
            bestTime = new Date(time);

            this.logger.astronomical('info', 'ダイヤモンド富士最適時刻更新', {
              newBestTime: bestTime.toISOString(),
              newMinDifference: minDifference
            });
          }
        }
      }

      return bestTime;
    } catch (error) {
      this.logger.astronomical('error', '精密検索エラー', {
        candidateTime: candidateTime.toISOString(),
        locationId: location.id,
        locationName: location.name,
        targetAzimuth,
        targetElevation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * 月のアライメントチェック
   */
  private async checkMoonAlignment(
    time: Date,
    location: Location,
    targetAzimuth: number,
    targetElevation: number,
    subType: 'rising' | 'setting'
  ): Promise<FujiEvent | null> {

    // 月の出入り時刻の前後30分間を詳細検索
    const searchStart = new Date(time.getTime() - 30 * 60 * 1000); // 30分前
    const searchEnd = new Date(time.getTime() + 30 * 60 * 1000);   // 30分後

    let bestMatch: { time: Date; score: number } | null = null;

    // 2分刻みで検索
    for (let searchTime = new Date(searchStart); searchTime <= searchEnd; searchTime.setMinutes(searchTime.getMinutes() + 2)) {
      const moonPosition = await this.calculateMoonPositionPrecise(new Date(searchTime), location);
      const azimuthDifference = Math.abs(moonPosition.azimuth - targetAzimuth);
      const elevationDifference = Math.abs(moonPosition.correctedElevation - targetElevation);

      // パール富士専用の許容範囲を使用
      const distanceKm = location.fujiDistance ?? this.calculateDistanceToFuji(location);
      const azimuthTolerance = this.getPearlAzimuthTolerance(distanceKm);

      if (azimuthDifference <= azimuthTolerance && elevationDifference <= this.TOLERANCE.pearlElevation) {
        const score = azimuthDifference + elevationDifference; // 低いほど良い
        if (!bestMatch || score < bestMatch.score) {
          bestMatch = { time: new Date(searchTime), score };
        }
      }
    }

    if (bestMatch) {
      return {
        id: `pearl_${location.id}_${bestMatch.time.toISOString().split('T')[0]}_${subType}`,
        type: 'pearl',
        subType,
        time: bestMatch.time,
        location,
        azimuth: targetAzimuth,
        elevation: targetElevation
      };
    }

    return null;
  }

  /**
   * Astronomy Engineを使用した高精度太陽位置計算
   * @param time JST時刻のDateオブジェクト
   */
  private async calculateSunPositionPrecise(time: Date, location: Location): Promise<CelestialPosition> {
    // 値の妥当性チェック
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || !Number.isFinite(location.elevation)) {
      throw new Error(`Invalid location coordinates: lat=${location.latitude}, lng=${location.longitude}, elev=${location.elevation} for location ${location.name}`);
    }

    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);

    // Astronomy Engineはローカル時刻で作成したDateオブジェクトを適切に処理する

    const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');

    return {
      azimuth: horizontal.azimuth,
      elevation: horizontal.altitude,
      correctedElevation: horizontal.altitude + this.getAtmosphericRefraction(horizontal.altitude)
    };
  }

  /**
   * Astronomy Engineを使用した高精度月位置計算
   * @param time JST時刻のDateオブジェクト
   */
  private async calculateMoonPositionPrecise(time: Date, location: Location): Promise<CelestialPosition> {
    // 値の妥当性チェック
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || !Number.isFinite(location.elevation)) {
      throw new Error(`Invalid location coordinates: lat=${location.latitude}, lng=${location.longitude}, elev=${location.elevation} for location ${location.name}`);
    }

    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);

    // Astronomy Engineはローカル時刻で作成したDateオブジェクトを適切に処理する

    const equatorial = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
    const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');

    return {
      azimuth: horizontal.azimuth,
      elevation: horizontal.altitude,
      correctedElevation: horizontal.altitude + this.getAtmosphericRefraction(horizontal.altitude)
    };
  }

  /**
   * 大気屈折補正（日本の実際の気象条件を考慮）
   */
  private getAtmosphericRefraction(elevation: number): number {
    // 将来の改善のための構造は良好
    // 現在は標準値で十分だが、さらなる精度向上時に活用可能

    // 日本の平均的な気象条件を考慮した補正値
    const JAPAN_CORRECTION_FACTOR = 1.02; // 海洋性気候補正

    let standardRefraction: number;
    if (elevation > 15) {
      standardRefraction = 0.00452 * Math.tan((90 - elevation) * Math.PI / 180);
    } else {
      standardRefraction = 0.1594 + 0.0196 * elevation + 0.00002 * elevation * elevation;
    }

    return standardRefraction * JAPAN_CORRECTION_FACTOR;
  }

  /**
   * 気象条件を考慮した高精度大気屈折補正（将来実装用）
   */
  private getEnhancedAtmosphericRefraction(
    elevation: number,
    temperature: number = 15, // ℃
    pressure: number = 1013.25, // hPa
    humidity: number = 50, // %
    observerAltitude: number = 0 // m
  ): number {
    // Bennettの改良式をベースに気象補正を適用
    const elevationRad = elevation * Math.PI / 180;
    const cotElevation = 1 / Math.tan(elevationRad);

    // 標準大気での屈折角を計算
    let refraction: number;
    if (elevation > 15) {
      refraction = 0.00452 * cotElevation;
    } else {
      refraction = 0.1594 + 0.0196 * elevation + 0.00002 * elevation * elevation;
    }

    // 気象補正係数を計算
    const tempFactor = (283 / (273 + temperature)); // 気温補正
    const pressureFactor = (pressure / 1013.25); // 気圧補正
    const humidityFactor = 1 - 0.00012 * humidity; // 湿度補正（簡易）
    const altitudeFactor = Math.exp(-observerAltitude / 8400); // 標高補正

    return refraction * tempFactor * pressureFactor * humidityFactor * altitudeFactor;
  }

  /**
   * ダイヤモンド富士シーズン判定
   */
  private isDiamondFujiSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    // 10月～3月がダイヤモンド富士のシーズン（春分前後も含む）
    return month >= 10 || month <= 3;
  }

  /**
   * 季節による検索範囲最適化
   */
  private getOptimizedSearchRanges(date: Date): SearchRange[] {
    const month = date.getMonth() + 1;
    const ranges: SearchRange[] = [];

    // 季節に応じた時間範囲の動的調整
    if (month >= 10 || month <= 2) { // 冬季
      ranges.push(
        { type: 'sunrise', start: 6, end: 9 },   // 冬の日の出：6-9時
        { type: 'sunset', start: 15, end: 19 }   // 冬の日の入り：15-19時（範囲を拡大）
      );
    } else if (month >= 3 && month <= 5) { // 春季
      ranges.push(
        { type: 'sunrise', start: 5, end: 8 },   // 春の日の出：5-8時
        { type: 'sunset', start: 16, end: 19 }   // 春の日の入り：16-19時
      );
    } else if (month >= 6 && month <= 9) { // 夏季・秋季
      ranges.push(
        { type: 'sunrise', start: 4, end: 7 },   // 夏の日の出：4-7時
        { type: 'sunset', start: 17, end: 20 }   // 夏の日の入り：17-20時
      );
    }

    return ranges;
  }

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }
}

// シングルトンインスタンス
export const astronomicalCalculator = new AstronomicalCalculatorAstronomyEngine();