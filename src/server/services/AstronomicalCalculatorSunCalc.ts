// SunCalcライブラリを使用した高速天体計算サービス
import SunCalc from 'suncalc';
import { FujiEvent, Location, FUJI_COORDINATES } from '../../shared/types';
import { timeUtils } from '../../shared/utils/timeUtils';
import { getComponentLogger } from '../../shared/utils/logger';

const logger = getComponentLogger('astronomical-suncalc');

export class AstronomicalCalculatorSunCalc {
  // 度をラジアンに変換
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ラジアンを度に変換
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  // 撮影地点から富士山への方位角を計算
  private calculateBearingToFuji(fromLocation: Location): number {
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
    
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    
    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // 0-360度の範囲に正規化
  }

  // 撮影地点から富士山頂への仰角を計算
  private calculateElevationToFuji(fromLocation: Location): number {
    // 地球の半径 (km)
    const earthRadius = 6371;
    
    // 撮影地点と富士山の距離を計算 (km)
    const lat1 = this.toRadians(fromLocation.latitude);
    const lat2 = this.toRadians(FUJI_COORDINATES.latitude);
    const deltaLat = lat2 - lat1;
    const deltaLon = this.toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + 
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = earthRadius * c; // 水平距離 (km)
    
    // 高度差を計算 (m → km)
    const heightDifference = (FUJI_COORDINATES.elevation - fromLocation.elevation) / 1000;
    
    // 仰角を計算 (度)
    const elevation = this.toDegrees(Math.atan(heightDifference / distance));
    
    return elevation;
  }

  // ダイヤモンド富士の観測期間かどうか判定（秋分～春分）
  private isDiamondFujiSeason(date: Date): boolean {
    logger.info('isDiamondFujiSeason呼び出し', {
      date: String(date),
      type: typeof date,
      isDate: date instanceof Date,
      constructor: date?.constructor?.name
    });
    
    // Dateオブジェクトの検証
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      logger.error('無効なDateオブジェクト', { date, type: typeof date });
      return false;
    }
    
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    
    // 9月23日頃（秋分）から3月21日頃（春分）まで
    if (month >= 9 && month <= 12) return true; // 9-12月
    if (month >= 1 && month <= 3) return true;  // 1-3月
    
    return false;
  }

  // 特定日のダイヤモンド富士を計算
  async calculateDiamondFuji(location: Location, date: Date): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];
    
    logger.info('SunCalc-ダイヤモンド富士計算開始', {
      locationName: location.name,
      locationId: location.id,
      date: date instanceof Date ? date.toISOString() : String(date),
      dateType: typeof date,
      isDate: date instanceof Date
    });
    
    // ダイヤモンド富士の観測期間外は空配列を返す
    if (!this.isDiamondFujiSeason(date)) {
      return events;
    }

    try {
      const fujiAzimuth = this.calculateBearingToFuji(location);
      const fujiElevation = this.calculateElevationToFuji(location);
      
      logger.info('富士山計算基準値', {
        locationName: location.name,
        fujiAzimuth: fujiAzimuth.toFixed(1),
        fujiElevation: fujiElevation.toFixed(1)
      });
      
      // 太陽が富士山の方位角と仰角を同時に通過する時刻を10秒刻みで検索
      const startTime = new Date(date);
      startTime.setHours(5, 0, 0, 0); // 朝5時から
      const endTime = new Date(date);
      endTime.setHours(19, 0, 0, 0); // 夜7時まで
      
      let bestMatch = null;
      let minTotalDifference = Infinity;
      
      for (let time = new Date(startTime); time <= endTime; time.setSeconds(time.getSeconds() + 10)) {
        const sunPosition = SunCalc.getPosition(time, location.latitude, location.longitude);
        const sunAzimuth = this.toDegrees(sunPosition.azimuth + Math.PI); // SunCalcは南を0とするので補正
        const sunElevation = this.toDegrees(sunPosition.altitude);
        
        // 高度が-5度以上（地平線付近まで）
        if (sunElevation >= -5) {
          const azimuthDifference = Math.abs(sunAzimuth - fujiAzimuth);
          const elevationDifference = Math.abs(sunElevation - fujiElevation);
          
          // 方位角1.5度以内かつ仰角0.5度以内
          if (azimuthDifference <= 1.5 && elevationDifference <= 0.5) {
            // 方位角と仰角の差の合計が最小のものを記録
            const totalDifference = azimuthDifference + elevationDifference * 2; // 仰角を重視
            
            if (totalDifference < minTotalDifference) {
              minTotalDifference = totalDifference;
              bestMatch = {
                time: new Date(time),
                azimuth: sunAzimuth,
                elevation: sunElevation,
                azimuthDifference,
                elevationDifference,
                totalDifference
              };
            }
          }
        }
      }
      
      // 最適な時刻が見つかった場合
      if (bestMatch) {
        const hour = bestMatch.time.getHours();
        const subType = hour < 12 ? 'sunrise' : 'sunset';
        
        events.push({
          id: `diamond_${location.id}_${timeUtils.formatDateString(date)}_${subType}`,
          type: 'diamond',
          subType,
          time: bestMatch.time,
          location,
          azimuth: bestMatch.azimuth,
          elevation: bestMatch.elevation
        });
        
        logger.info('ダイヤモンド富士発見', {
          locationName: location.name,
          time: bestMatch.time.toISOString(),
          timeJST: bestMatch.time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          sunAzimuth: bestMatch.azimuth.toFixed(1),
          sunElevation: bestMatch.elevation.toFixed(1),
          fujiAzimuth: fujiAzimuth.toFixed(1),
          fujiElevation: fujiElevation.toFixed(1),
          azimuthDiff: bestMatch.azimuthDifference.toFixed(2),
          elevationDiff: bestMatch.elevationDifference.toFixed(2),
          totalDiff: bestMatch.totalDifference.toFixed(2)
        });
      }

    } catch (error) {
      logger.error('ダイヤモンド富士計算エラー', {
        locationName: location.name,
        date: date.toDateString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return events;
  }

  // 特定日のパール富士を計算
  async calculatePearlFuji(location: Location, date: Date): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];

    try {
      const fujiAzimuth = this.calculateBearingToFuji(location);
      
      // 月の出・月の入り時刻を取得
      const moonTimes = SunCalc.getMoonTimes(date, location.latitude, location.longitude);
      
      // 月相を取得（新月期間は除外）
      const moonIllumination = SunCalc.getMoonIllumination(date);
      if (moonIllumination.fraction < 0.08) {
        return events; // 新月期間は除外
      }

      // 月の出でのパール富士
      if (moonTimes.rise && !isNaN(moonTimes.rise.getTime())) {
        const moonrisePosition = SunCalc.getMoonPosition(moonTimes.rise, location.latitude, location.longitude);
        const moonriseAzimuth = this.toDegrees(moonrisePosition.azimuth + Math.PI); // SunCalcは南を0とするので補正
        
        // 方位角の差が1.5度以内かつ高度が-2度以上
        if (Math.abs(moonriseAzimuth - fujiAzimuth) <= 1.5 && moonrisePosition.altitude >= -0.035) {
          events.push({
            id: `pearl_${location.id}_${timeUtils.formatDateString(date)}_moonrise`,
            type: 'pearl',
            subType: 'rising',
            time: moonTimes.rise,
            location,
            azimuth: moonriseAzimuth,
            elevation: this.toDegrees(moonrisePosition.altitude)
          });
        }
      }

      // 月の入りでのパール富士
      if (moonTimes.set && !isNaN(moonTimes.set.getTime())) {
        const moonsetPosition = SunCalc.getMoonPosition(moonTimes.set, location.latitude, location.longitude);
        const moonsetAzimuth = this.toDegrees(moonsetPosition.azimuth + Math.PI); // SunCalcは南を0とするので補正
        
        // 方位角の差が1.5度以内かつ高度が-2度以上
        if (Math.abs(moonsetAzimuth - fujiAzimuth) <= 1.5 && moonsetPosition.altitude >= -0.035) {
          events.push({
            id: `pearl_${location.id}_${timeUtils.formatDateString(date)}_moonset`,
            type: 'pearl',
            subType: 'setting',
            time: moonTimes.set,
            location,
            azimuth: moonsetAzimuth,
            elevation: this.toDegrees(moonsetPosition.altitude)
          });
        }
      }

    } catch (error) {
      logger.error('パール富士計算エラー', {
        locationName: location.name,
        date: date.toDateString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return events;
  }

  // 特定日の全イベントを計算
  async calculateDayEvents(location: Location, date: Date): Promise<FujiEvent[]> {
    const [diamondEvents, pearlEvents] = await Promise.all([
      this.calculateDiamondFuji(location, date),
      this.calculatePearlFuji(location, date)
    ]);

    return [...diamondEvents, ...pearlEvents];
  }

  // 月間イベントを計算
  async calculateMonthEvents(location: Location, year: number, month: number): Promise<FujiEvent[]> {
    const allEvents: FujiEvent[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // 各日を並列計算
    const promises = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      promises.push(this.calculateDayEvents(location, date));
    }

    const dailyEvents = await Promise.all(promises);
    for (const events of dailyEvents) {
      allEvents.push(...events);
    }

    logger.info('月間計算完了', {
      locationName: location.name,
      year,
      month,
      eventCount: allEvents.length
    });

    return allEvents;
  }
}

// エクスポート
export const astronomicalCalculator = new AstronomicalCalculatorSunCalc();