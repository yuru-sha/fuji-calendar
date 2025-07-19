import * as Astronomy from 'astronomy-engine';
import { Location, FujiEvent, SunPosition, MoonPosition, FUJI_COORDINATES } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

export interface AstronomicalCalculator {
  calculateDiamondFuji(date: Date, locations: Location[]): FujiEvent[];
  calculatePearlFuji(date: Date, locations: Location[]): FujiEvent[];
  calculateMonthlyEvents(year: number, month: number, locations: Location[]): FujiEvent[];
  getSunPosition(date: Date, latitude: number, longitude: number): SunPosition;
  getMoonPosition(date: Date, latitude: number, longitude: number): MoonPosition;
  calculateAzimuthToFuji(fromLocation: Location): number;
  isVisible(fromLocation: Location, targetAzimuth: number): boolean;
  isDiamondFujiSeason(date: Date, location: Location): boolean;
  getSunMaxElevation(date: Date, location: Location): number;
  getDiamondFujiSeasonMessage(date: Date, location: Location): string | null;
  isVisibleMoonPhase(date: Date): boolean;
}

export class AstronomicalCalculatorImpl implements AstronomicalCalculator {
  private logger: StructuredLogger;

  constructor() {
    this.logger = getComponentLogger('astronomical-calculator');
  }
  
  // 度をラジアンに変換
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ラジアンを度に変換
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  // 撮影地点から富士山への方位角を計算
  calculateAzimuthToFuji(fromLocation: Location): number {
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
    
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    
    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // 0-360度の範囲に正規化
  }

  // 2地点間の距離を計算（km）
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球の半径（km）
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 富士山頂（剣ヶ峰）への視線角度を計算（地球の曲率考慮）
  calculateViewingAngleToFujiSummit(fromLocation: Location): number {
    const distance = this.calculateDistance(
      fromLocation.latitude, fromLocation.longitude,
      FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
    );
    
    // 高度差（富士山剣ヶ峰の標高 - 撮影地点の標高）
    const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
    
    // 地球の曲率による見かけ高度の低下を計算
    const earthRadiusKm = 6371;
    const curvatureCorrection = (distance * distance) / (2 * earthRadiusKm) * 1000; // メートル単位
    
    // 実効的な高度差（曲率補正後）
    const effectiveHeight = heightDifference - curvatureCorrection;
    
    // 視線角度（度）
    const viewingAngle = this.toDegrees(Math.atan(effectiveHeight / (distance * 1000)));
    
    this.logger.astronomical('debug', `富士山頂への視線角度計算`, {
      locationName: fromLocation.name,
      distance: parseFloat(distance.toFixed(1)),
      heightDifference,
      curvatureCorrection: parseFloat(curvatureCorrection.toFixed(1)),
      effectiveHeight: parseFloat(effectiveHeight.toFixed(1)),
      viewingAngle: parseFloat(viewingAngle.toFixed(2))
    });
    
    return viewingAngle;
  }
  
  // 富士山の角度サイズを計算（標高を考慮）
  private calculateFujiAngularSize(fromLocation: Location): number {
    const distance = this.calculateDistance(
      fromLocation.latitude, fromLocation.longitude,
      FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
    );
    
    // 富士山の高さ（海抜からの高さ）
    const fujiHeight = FUJI_COORDINATES.elevation - fromLocation.elevation;
    
    // 角度サイズ（度）
    return this.toDegrees(Math.atan(fujiHeight / (distance * 1000)));
  }

  // 太陽の位置を取得（Astronomy Engine使用）
  getSunPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): SunPosition {
    // 観測者の位置を設定
    const observer = new Astronomy.Observer(latitude, longitude, elevation);
    
    // 太陽の赤道座標を取得
    const sunEquatorial = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
    
    // 地平座標系（方位角・高度角）に変換
    const sunHorizontal = Astronomy.Horizon(date, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');
    
    // 日の出・日の入り時刻を計算（direction: +1 = rise, -1 = set）
    const sunriseResult = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, date, 1);
    const sunsetResult = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 1);
    
    return {
      azimuth: sunHorizontal.azimuth,
      elevation: sunHorizontal.altitude,
      sunrise: sunriseResult ? sunriseResult.date : new Date(0),
      sunset: sunsetResult ? sunsetResult.date : new Date(0)
    };
  }

  // 月の位置を取得（Astronomy Engine使用）
  getMoonPosition(date: Date, latitude: number, longitude: number, elevation: number = 0): MoonPosition {
    // 観測者の位置を設定
    const observer = new Astronomy.Observer(latitude, longitude, elevation);
    
    // 月の赤道座標を取得
    const moonEquatorial = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
    
    // 地平座標系（方位角・高度角）に変換
    const moonHorizontal = Astronomy.Horizon(date, observer, moonEquatorial.ra, moonEquatorial.dec, 'normal');
    
    // 月の出・月の入り時刻を計算
    const moonriseResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, date, 1);
    const moonsetResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, date, 1);
    
    // 月相の計算
    const moonPhase = Astronomy.MoonPhase(date);
    
    return {
      azimuth: moonHorizontal.azimuth,
      elevation: moonHorizontal.altitude,
      moonrise: moonriseResult ? moonriseResult.date : new Date(0),
      moonset: moonsetResult ? moonsetResult.date : new Date(0),
      phase: moonPhase / 360.0 // 0-1の範囲に正規化（Astronomy Engineは0-360度で返す）
    };
  }

  // ダイヤモンド富士が観測可能な期間かどうかを判定（秋分〜春分）
  isDiamondFujiSeason(date: Date, location: Location): boolean {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0ベースを1ベースに
    const day = date.getDate();
    
    // より精密な判定：太陽高度による判定を併用
    const maxSunElevation = this.getSunMaxElevation(date, location);
    const fujiViewingAngle = this.calculateViewingAngleToFujiSummit(location);
    
    // 太陽の最大高度が富士山頂への視線角度の2倍以下の場合は観測可能
    // （実際には視線角度に近い高度で通過する可能性がある）
    const maxElevationThreshold = Math.max(fujiViewingAngle * 2, 30); // 最低30度で制限
    
    this.logger.astronomical('debug', `ダイヤモンド富士季節判定`, {
      date: date.toDateString(),
      month,
      day,
      maxSunElevation: parseFloat(maxSunElevation.toFixed(1)),
      fujiViewingAngle: parseFloat(fujiViewingAngle.toFixed(1)),
      maxElevationThreshold: parseFloat(maxElevationThreshold.toFixed(1)),
      sunHeightOK: maxSunElevation <= maxElevationThreshold
    });
    
    // 簡易的な季節判定と太陽高度判定の両方を満たす場合のみ観測可能
    const isSeasonalPeriod = (month >= 9 && month <= 12) || 
                            (month >= 1 && month <= 3 && day <= 25) ||
                            (month === 9 && day >= 20);
    
    const isSunElevationOK = maxSunElevation <= maxElevationThreshold;
    
    return isSeasonalPeriod && isSunElevationOK;
  }

  // ダイヤモンド富士の観測期間外メッセージを生成
  getDiamondFujiSeasonMessage(date: Date, location: Location): string | null {
    if (this.isDiamondFujiSeason(date, location)) {
      return null; // 観測期間内なのでメッセージなし
    }

    const month = date.getMonth() + 1;
    const maxSunElevation = this.getSunMaxElevation(date, location);
    
    if (month >= 4 && month <= 8) {
      return `太陽が高すぎる期間です（南中高度：${maxSunElevation.toFixed(1)}°）。ダイヤモンド富士は9月下旬〜3月下旬の期間に観測できます。`;
    } else {
      return `ダイヤモンド富士の観測期間外です。観測期間は9月下旬〜3月下旬となります。`;
    }
  }

  // 太陽の南中高度を計算して観測可能性を詳細チェック
  getSunMaxElevation(date: Date, location: Location): number {
    // 正午の太陽高度を計算
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    
    const sunPos = this.getSunPosition(noon, location.latitude, location.longitude, location.elevation);
    return sunPos.elevation;
  }

  // 月相が視認可能かどうかを判定（新月期間は除外）
  isVisibleMoonPhase(date: Date): boolean {
    const moonPhase = Astronomy.MoonPhase(date);
    
    // 月相を0-1の範囲に正規化（0=新月、0.5=満月）
    const phaseNormalized = (moonPhase % 360) / 360;
    
    // 新月前後2日間（月相±0.055）は視認困難として除外
    // 0.055 ≈ 2日/29.5日（朔望月周期）
    const minVisiblePhase = 0.055; // 約2日分
    const maxVisiblePhase = 0.945; // 約2日分
    
    const isVisible = phaseNormalized >= minVisiblePhase && phaseNormalized <= maxVisiblePhase;
    
    this.logger.astronomical('debug', `月相視認性判定`, {
      date: date.toDateString(),
      moonPhase: parseFloat(moonPhase.toFixed(1)),
      phaseNormalized: parseFloat(phaseNormalized.toFixed(3)),
      isVisible,
      phase: this.getMoonPhaseName(phaseNormalized)
    });
    
    return isVisible;
  }

  // 月相名を取得（デバッグ用）
  private getMoonPhaseName(phase: number): string {
    if (phase < 0.08 || phase > 0.92) return '新月';
    if (phase < 0.25) return '上弦の月';
    if (phase < 0.5) return '満月に向かう';
    if (phase < 0.75) return '満月';
    return '下弦の月';
  }

  // 富士山が見える方向かどうかを判定
  isVisible(fromLocation: Location, targetAzimuth: number): boolean {
    const fujiAzimuth = this.calculateAzimuthToFuji(fromLocation);
    const angleDifference = Math.abs(targetAzimuth - fujiAzimuth);
    
    // 角度差が正規化されるよう調整（例：359度と1度の差は2度）
    const normalizedDifference = Math.min(angleDifference, 360 - angleDifference);
    
    // 富士山の角度サイズを考慮した許容範囲
    const fujiAngularSize = this.calculateFujiAngularSize(fromLocation);
    const tolerance = Math.max(fujiAngularSize / 2, 0.5); // 最小0.5度の許容範囲
    
    return normalizedDifference <= tolerance;
  }

  // 指定された方位角に太陽/月が来る時刻を精密計算
  private findExactTimeForAzimuth(
    date: Date, 
    location: Location, 
    targetAzimuth: number, 
    isRising: boolean,
    celestialBody: 'sun' | 'moon'
  ): Date | null {
    // 計算基準時刻をJST正午に設定（日付の解釈ずれを防ぐ）
    const searchBaseTime = timeUtils.getJstNoon(date);
    
    // 実際の日の出・日の入り時刻を取得して検索範囲を最適化
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
    let centerTime: Date;
    let searchWindow: number; // 検索範囲（時間）
    
    if (celestialBody === 'sun') {
      if (isRising) {
        const sunriseResult = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, searchBaseTime, 1);
        centerTime = sunriseResult ? sunriseResult.date : new Date(searchBaseTime.getTime() + 6 * 60 * 60 * 1000); // フォールバック: 6時
        searchWindow = 2.5; // 日の出前後2.5時間
      } else {
        const sunsetResult = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, searchBaseTime, 1);
        centerTime = sunsetResult ? sunsetResult.date : new Date(searchBaseTime.getTime() + 18 * 60 * 60 * 1000); // フォールバック: 18時
        searchWindow = 2.5; // 日の入り前後2.5時間
      }
    } else {
      // 月の場合も実際の月の出・月の入り時刻を基準に最適化
      try {
        if (isRising) {
          const moonriseResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, searchBaseTime, 1);
          if (moonriseResult) {
            centerTime = moonriseResult.date;
            searchWindow = 3; // 月の出前後3時間
          } else {
            // 月の出が見つからない場合（沈まない月など）は夜間全体を検索
            centerTime = new Date(searchBaseTime);
            centerTime.setHours(0, 0, 0, 0);
            searchWindow = 12; // 12時間範囲
          }
        } else {
          const moonsetResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, searchBaseTime, 1);
          if (moonsetResult) {
            centerTime = moonsetResult.date;
            searchWindow = 3; // 月の入り前後3時間
          } else {
            // 月の入りが見つからない場合は昼間全体を検索
            centerTime = new Date(searchBaseTime);
            centerTime.setHours(12, 0, 0, 0);
            searchWindow = 12; // 12時間範囲
          }
        }
      } catch (error) {
        // エラーが発生した場合は従来の方法にフォールバック
        this.logger.astronomical('warn', `月の出入り時刻計算エラー`, {
          locationName: location.name,
          date: date.toDateString(),
          isRising,
          error: error instanceof Error ? error.message : String(error)
        });
        centerTime = new Date(searchBaseTime);
        centerTime.setHours(isRising ? 18 : 6, 0, 0, 0);
        searchWindow = 8;
      }
    }
    
    // 検索開始・終了時刻を計算
    const startTime = new Date(centerTime.getTime() - searchWindow * 60 * 60 * 1000);
    const endTime = new Date(centerTime.getTime() + searchWindow * 60 * 60 * 1000);
    
    this.logger.astronomical('debug', `動的検索範囲設定`, {
      calculationType: celestialBody === 'sun' ? 'diamond' : 'pearl',
      subType: isRising ? 'rising' : 'setting',
      locationName: location.name,
      centerTime: centerTime.toLocaleTimeString('ja-JP'),
      searchWindow: searchWindow,
      startTime: startTime.toLocaleTimeString('ja-JP'),
      endTime: endTime.toLocaleTimeString('ja-JP')
    });
    
    let bestTime: Date | null = null;
    let minDifference = 360;
    
    // より細かい検索間隔（太陽の場合は10秒、月の場合は15秒）
    const searchInterval = celestialBody === 'sun' ? 10 : 15; // 秒
    const currentTime = new Date(startTime.getTime());
    
    // 最適化された時間範囲でループ
    while (currentTime <= endTime) {
      let position;
      if (celestialBody === 'sun') {
        position = this.getSunPosition(currentTime, location.latitude, location.longitude, location.elevation);
      } else {
        position = this.getMoonPosition(currentTime, location.latitude, location.longitude, location.elevation);
      }
      
      // 高度が-2度以上（地平線下2度まで許可）で、方位角の差を計算
      if (position.elevation > -2) {
        // 方位角の差を精密計算（円周上の最短距離）
        let azimuthDiff = Math.abs(position.azimuth - targetAzimuth);
        if (azimuthDiff > 180) {
          azimuthDiff = 360 - azimuthDiff;
        }
        
        if (azimuthDiff < minDifference) {
          minDifference = azimuthDiff;
          bestTime = new Date(currentTime);
          this.logger.astronomical('debug', `新しい最良時刻発見`, {
            calculationType: celestialBody === 'sun' ? 'diamond' : 'pearl',
            locationName: location.name,
            time: currentTime.toLocaleTimeString('ja-JP'),
            azimuthDiff: parseFloat(azimuthDiff.toFixed(2)),
            celestialAzimuth: parseFloat(position.azimuth.toFixed(1)),
            elevation: parseFloat(position.elevation.toFixed(1))
          });
        }
      }
      
      // 次の検索時刻に進む
      currentTime.setTime(currentTime.getTime() + searchInterval * 1000);
    }
    
    // 2段階検索：最良候補が見つかったら詳細検索を実行
    if (bestTime && minDifference <= 2.0) {
      this.logger.astronomical('debug', `詳細検索開始`, {
        calculationType: celestialBody === 'sun' ? 'diamond' : 'pearl',
        locationName: location.name,
        roughBestTime: bestTime.toLocaleTimeString('ja-JP'),
        roughMinDifference: parseFloat(minDifference.toFixed(2))
      });
      
      // 粗い検索で見つけた時刻の前後5分を1秒刻みで詳細検索
      const detailStartTime = new Date(bestTime.getTime() - 5 * 60 * 1000);
      const detailEndTime = new Date(bestTime.getTime() + 5 * 60 * 1000);
      const detailCurrentTime = new Date(detailStartTime.getTime());
      
      while (detailCurrentTime <= detailEndTime) {
        let position;
        if (celestialBody === 'sun') {
          position = this.getSunPosition(detailCurrentTime, location.latitude, location.longitude, location.elevation);
        } else {
          position = this.getMoonPosition(detailCurrentTime, location.latitude, location.longitude, location.elevation);
        }
        
        if (position.elevation > -2) {
          let azimuthDiff = Math.abs(position.azimuth - targetAzimuth);
          if (azimuthDiff > 180) {
            azimuthDiff = 360 - azimuthDiff;
          }
          
          if (azimuthDiff < minDifference) {
            minDifference = azimuthDiff;
            bestTime = new Date(detailCurrentTime);
          }
        }
        
        detailCurrentTime.setTime(detailCurrentTime.getTime() + 1000); // 1秒刻み
      }
    }
    
    // 天体別に許容範囲を設定
    const tolerance = celestialBody === 'sun' ? 1.0 : 20.0; // 太陽:1.0度、月:20.0度
    const result = minDifference <= tolerance ? bestTime : null;
    
    this.logger.astronomical(result ? 'info' : 'debug', `天体位置検索完了`, {
      calculationType: celestialBody === 'sun' ? 'diamond' : 'pearl',
      locationName: location.name,
      date: timeUtils.formatDateString(date),
      minDifference: parseFloat(minDifference.toFixed(2)),
      tolerance: tolerance,
      result: result ? 'SUCCESS' : 'FAIL',
      bestTime: bestTime ? bestTime.toLocaleTimeString('ja-JP') : null,
      searchRangeHours: parseFloat(searchWindow.toFixed(1)),
      searchInterval: searchInterval
    });
    
    return result;
  }

  // ダイヤモンド富士を計算
  calculateDiamondFuji(date: Date, locations: Location[]): FujiEvent[] {
    const startTime = Date.now();
    const events: FujiEvent[] = [];
    
    this.logger.astronomical('info', `ダイヤモンド富士計算開始`, {
      calculationType: 'diamond',
      date: date.toDateString(),
      locationCount: locations.length
    });

    // 季節チェック：代表地点で観測期間をチェック
    if (locations.length > 0) {
      const isObservationSeason = this.isDiamondFujiSeason(date, locations[0]);
      if (!isObservationSeason) {
        this.logger.astronomical('info', `ダイヤモンド富士観測期間外`, {
          calculationType: 'diamond',
          date: date.toDateString(),
          reason: 'outside_observation_season'
        });
        return events; // 空の配列を返す
      }
    }
    
    for (const location of locations) {
      const fujiAzimuth = this.calculateAzimuthToFuji(location);
      
      this.logger.astronomical('debug', `富士山方位角計算`, {
        calculationType: 'diamond',
        locationName: location.name,
        locationId: location.id,
        fujiAzimuth: parseFloat(fujiAzimuth.toFixed(1))
      });
      
      // 日の出時のダイヤモンド富士（太陽が富士山の方向から昇る）
      const sunriseTime = this.findExactTimeForAzimuth(date, location, fujiAzimuth, true, 'sun');
      if (sunriseTime) {
        const sunrisePosition = this.getSunPosition(sunriseTime, location.latitude, location.longitude, location.elevation);
        const fujiViewingAngle = this.calculateViewingAngleToFujiSummit(location);
        
        // 太陽高度が富士山頂への視線角度に近いかチェック
        const elevationDiff = Math.abs(sunrisePosition.elevation - fujiViewingAngle);
        const isValidElevation = elevationDiff <= 1.0; // 1度以内の誤差を許容
        
        this.logger.astronomical('info', `昇るダイヤモンド富士${isValidElevation ? '発見' : '候補（高度不一致）'}`, {
          calculationType: 'diamond',
          subType: 'rising',
          locationName: location.name,
          locationId: location.id,
          time: sunriseTime.toLocaleTimeString('ja-JP'),
          azimuth: parseFloat(sunrisePosition.azimuth.toFixed(1)),
          elevation: parseFloat(sunrisePosition.elevation.toFixed(1)),
          fujiViewingAngle: parseFloat(fujiViewingAngle.toFixed(1)),
          elevationDiff: parseFloat(elevationDiff.toFixed(2)),
          isValidElevation
        });
        
        if (isValidElevation) {
          events.push({
            id: `diamond-rising-${location.id}-${timeUtils.formatDateString(date)}`,
            type: 'diamond',
            subType: 'rising',
            time: sunriseTime,
            location: location,
            azimuth: sunrisePosition.azimuth,
            elevation: sunrisePosition.elevation
          });
        }
      }
      
      // 日没時のダイヤモンド富士（太陽が富士山の方向に沈む）
      this.logger.astronomical('debug', `沈む太陽検索開始`, {
        calculationType: 'diamond',
        subType: 'setting',
        locationName: location.name,
        locationId: location.id,
        targetAzimuth: parseFloat(fujiAzimuth.toFixed(1))
      });
      
      const sunsetTime = this.findExactTimeForAzimuth(date, location, fujiAzimuth, false, 'sun');
      
      if (sunsetTime) {
        const sunsetPosition = this.getSunPosition(sunsetTime, location.latitude, location.longitude, location.elevation);
        const fujiViewingAngle = this.calculateViewingAngleToFujiSummit(location);
        
        // 太陽高度が富士山頂への視線角度に近いかチェック
        const elevationDiff = Math.abs(sunsetPosition.elevation - fujiViewingAngle);
        const isValidElevation = elevationDiff <= 1.0;
        
        this.logger.astronomical('info', `沈むダイヤモンド富士${isValidElevation ? '発見' : '候補（高度不一致）'}`, {
          calculationType: 'diamond',
          subType: 'setting',
          locationName: location.name,
          locationId: location.id,
          time: sunsetTime.toLocaleTimeString('ja-JP'),
          azimuth: parseFloat(sunsetPosition.azimuth.toFixed(1)),
          elevation: parseFloat(sunsetPosition.elevation.toFixed(1)),
          fujiViewingAngle: parseFloat(fujiViewingAngle.toFixed(1)),
          elevationDiff: parseFloat(elevationDiff.toFixed(2)),
          isValidElevation
        });
        
        if (isValidElevation) {
          const diamondEvent = {
          id: `diamond-setting-${location.id}-${timeUtils.formatDateString(date)}`,
          type: 'diamond' as const,
          subType: 'setting' as const,
          time: sunsetTime,
          location: location,
          azimuth: sunsetPosition.azimuth,
          elevation: sunsetPosition.elevation
        };
        
          events.push(diamondEvent);
        }
      } else {
        this.logger.astronomical('debug', `沈む太陽は見つからず`, {
          calculationType: 'diamond',
          subType: 'setting',
          locationName: location.name,
          locationId: location.id,
          targetAzimuth: parseFloat(fujiAzimuth.toFixed(1))
        });
      }
    }
    
    const calculationTime = Date.now() - startTime;
    this.logger.astronomical('info', `ダイヤモンド富士計算完了`, {
      calculationType: 'diamond',
      date: date.toDateString(),
      locationCount: locations.length,
      eventsFound: events.length,
      calculationTimeMs: calculationTime
    });
    
    if (calculationTime > 5000) {
      this.logger.performance('diamond-fuji-calculation', calculationTime, {
        date: date.toDateString(),
        locationCount: locations.length,
        eventsFound: events.length,
        slow: true
      });
    }
    
    return events;
  }

  // パール富士を計算
  calculatePearlFuji(date: Date, locations: Location[]): FujiEvent[] {
    const startTime = Date.now();
    const events: FujiEvent[] = [];
    
    // 月相チェック：新月期間は計算をスキップ
    if (!this.isVisibleMoonPhase(date)) {
      this.logger.astronomical('info', `パール富士計算スキップ（新月期間）`, {
        calculationType: 'pearl',
        date: date.toDateString(),
        reason: 'invisible_moon_phase'
      });
      return events; // 空の配列を返す
    }
    
    this.logger.astronomical('info', `パール富士計算開始`, {
      calculationType: 'pearl',
      date: date.toDateString(),
      locationCount: locations.length
    });
    
    for (const location of locations) {
      const fujiAzimuth = this.calculateAzimuthToFuji(location);
      
      // 月の出時のパール富士（月が富士山の方向から昇る）
      const moonriseTime = this.findExactTimeForAzimuth(date, location, fujiAzimuth, true, 'moon');
      if (moonriseTime) {
        const moonrisePosition = this.getMoonPosition(moonriseTime, location.latitude, location.longitude, location.elevation);
        const fujiViewingAngle = this.calculateViewingAngleToFujiSummit(location);
        
        // 月高度が富士山頂への視線角度に近いかチェック（厳格な条件）
        const elevationDiff = Math.abs(moonrisePosition.elevation - fujiViewingAngle);
        const isValidElevation = elevationDiff <= 1.0; // 非常に厳格な1度以内
        
        // 方位角も厳密にチェック
        const isValidAzimuth = this.isVisible(location, moonrisePosition.azimuth);
        
        // 月の満ち欠けを考慮（50%以上で十分な明るさ）
        if (moonrisePosition.phase > 0.5 && isValidElevation && isValidAzimuth) {
          this.logger.astronomical('info', `昇るパール富士発見`, {
            calculationType: 'pearl',
            subType: 'rising',
            locationName: location.name,
            locationId: location.id,
            time: moonriseTime.toLocaleTimeString('ja-JP'),
            azimuth: parseFloat(moonrisePosition.azimuth.toFixed(1)),
            elevation: parseFloat(moonrisePosition.elevation.toFixed(1)),
            fujiViewingAngle: parseFloat(fujiViewingAngle.toFixed(1)),
            elevationDiff: parseFloat(elevationDiff.toFixed(2)),
            moonPhase: parseFloat((moonrisePosition.phase * 100).toFixed(1))
          });
          
          events.push({
            id: `pearl-rising-${location.id}-${timeUtils.formatDateString(date)}`,
            type: 'pearl',
            subType: 'rising',
            time: moonriseTime,
            location: location,
            azimuth: moonrisePosition.azimuth,
            elevation: moonrisePosition.elevation
          });
        }
      }
      
      // 月没時のパール富士（月が富士山の方向に沈む）
      const moonsetTime = this.findExactTimeForAzimuth(date, location, fujiAzimuth, false, 'moon');
      if (moonsetTime) {
        const moonsetPosition = this.getMoonPosition(moonsetTime, location.latitude, location.longitude, location.elevation);
        const fujiViewingAngle = this.calculateViewingAngleToFujiSummit(location);
        
        // 月高度が富士山頂への視線角度に近いかチェック（厳格な条件）
        const elevationDiff = Math.abs(moonsetPosition.elevation - fujiViewingAngle);
        const isValidElevation = elevationDiff <= 1.0; // 非常に厳格な1度以内
        
        // 方位角も厳密にチェック
        const isValidAzimuth = this.isVisible(location, moonsetPosition.azimuth);
        
        // 月の満ち欠けを考慮（50%以上で十分な明るさ）
        if (moonsetPosition.phase > 0.5 && isValidElevation && isValidAzimuth) {
          this.logger.astronomical('info', `沈むパール富士発見`, {
            calculationType: 'pearl',
            subType: 'setting',
            locationName: location.name,
            locationId: location.id,
            time: moonsetTime.toLocaleTimeString('ja-JP'),
            azimuth: parseFloat(moonsetPosition.azimuth.toFixed(1)),
            elevation: parseFloat(moonsetPosition.elevation.toFixed(1)),
            fujiViewingAngle: parseFloat(fujiViewingAngle.toFixed(1)),
            elevationDiff: parseFloat(elevationDiff.toFixed(2)),
            moonPhase: parseFloat((moonsetPosition.phase * 100).toFixed(1))
          });
          
          events.push({
            id: `pearl-setting-${location.id}-${timeUtils.formatDateString(date)}`,
            type: 'pearl',
            subType: 'setting',
            time: moonsetTime,
            location: location,
            azimuth: moonsetPosition.azimuth,
            elevation: moonsetPosition.elevation
          });
        }
      }
    }
    
    const calculationTime = Date.now() - startTime;
    this.logger.astronomical('info', `パール富士計算完了`, {
      calculationType: 'pearl',
      date: date.toDateString(),
      locationCount: locations.length,
      eventsFound: events.length,
      calculationTimeMs: calculationTime
    });
    
    if (calculationTime > 5000) {
      this.logger.performance('pearl-fuji-calculation', calculationTime, {
        date: date.toDateString(),
        locationCount: locations.length,
        eventsFound: events.length,
        slow: true
      });
    }
    
    return events;
  }

  // 月間のイベントを計算
  calculateMonthlyEvents(year: number, month: number, locations: Location[]): FujiEvent[] {
    const startTime = Date.now();
    
    try {
      const events: FujiEvent[] = [];
      const startDate = timeUtils.getMonthStart(year, month);
      const endDate = timeUtils.getMonthEnd(year, month);
      
      this.logger.info(`月間イベント計算開始`, {
        year,
        month,
        locationCount: locations.length,
        dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`
      });
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dailyDate = new Date(date);
        
        try {
          // ダイヤモンド富士を計算
          const diamondEvents = this.calculateDiamondFuji(dailyDate, locations);
          events.push(...diamondEvents);
          
          // パール富士を計算
          const pearlEvents = this.calculatePearlFuji(dailyDate, locations);
          events.push(...pearlEvents);
        } catch (dayError) {
          this.logger.error(`日次計算エラー`, dayError, {
            date: dailyDate.toISOString(),
            year,
            month
          });
          // 個別の日のエラーはスキップして続行
        }
      }
      
      const calculationTime = Date.now() - startTime;
      this.logger.info(`月間イベント計算完了`, {
        year,
        month,
        locationCount: locations.length,
        totalEvents: events.length,
        calculationTimeMs: calculationTime
      });
      
      if (calculationTime > 30000) { // 30秒以上
        this.logger.performance('monthly-events-calculation', calculationTime, {
          year,
          month,
          locationCount: locations.length,
          totalEvents: events.length,
          slow: true
        });
      }
      
      return events;
    } catch (error) {
      this.logger.error('月間イベント計算で致命的エラー', error, {
        year,
        month,
        locationCount: locations.length
      });
      return []; // エラーの場合は空配列を返す
    }
  }

  // 年間の主要イベントを計算（パフォーマンス最適化版）
  calculateYearlyEvents(year: number, locations: Location[]): FujiEvent[] {
    const events: FujiEvent[] = [];
    
    // 月ごとに計算
    for (let month = 1; month <= 12; month++) {
      const monthlyEvents = this.calculateMonthlyEvents(year, month, locations);
      events.push(...monthlyEvents);
    }
    
    return events;
  }
}

// シングルトンインスタンス
export const astronomicalCalculator = new AstronomicalCalculatorImpl();