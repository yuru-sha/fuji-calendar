import * as Astronomy from 'astronomy-engine';
import { SunPosition, MoonPosition } from '@fuji-calendar/types';
import { getComponentLogger } from '@fuji-calendar/utils';

/**
 * 天体位置計算を担当するクラス
 * 太陽・月の位置計算を集約
 */
export class CelestialPositionCalculator {
  private logger = getComponentLogger('CelestialPositionCalculator');

  /**
   * 指定した時刻・地点での太陽位置を計算
   */
  calculateSunPosition(
    date: Date, 
    location: { latitude: number; longitude: number }
  ): SunPosition | null {
    try {
      const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
      const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
      const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

      return {
        azimuth: horizon.azimuth,
        elevation: horizon.altitude,
        distance: equator.dist
      };
    } catch (error) {
      this.logger.error('太陽位置計算エラー', error, {
        date: date.toISOString(),
        location
      });
      return null;
    }
  }

  /**
   * 指定した時刻・地点での月位置を計算
   */
  calculateMoonPosition(
    date: Date, 
    location: { latitude: number; longitude: number }
  ): MoonPosition | null {
    try {
      const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
      const equator = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
      const horizon = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

      // 月相計算
      const phaseInfo = Astronomy.MoonPhase(date);
      const illumination = this.calculateMoonIllumination(phaseInfo);

      return {
        azimuth: horizon.azimuth,
        elevation: horizon.altitude,
        distance: equator.dist,
        phase: phaseInfo,
        illumination
      };
    } catch (error) {
      this.logger.error('月位置計算エラー', error, {
        date: date.toISOString(),
        location
      });
      return null;
    }
  }

  /**
   * 太陽の最高高度を計算
   */
  calculateSunMaxElevation(
    date: Date, 
    location: { latitude: number; longitude: number }
  ): number {
    try {
      const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
      
      // 太陽の南中時刻を検索
      const transit = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, date);
      if (!transit) return -90;

      const sunPosition = this.calculateSunPosition(transit.time.date, location);
      return sunPosition?.elevation || -90;
    } catch (error) {
      this.logger.error('太陽最高高度計算エラー', error);
      return -90;
    }
  }

  /**
   * 月の照度率を計算（0-1 の範囲）
   */
  private calculateMoonIllumination(phase: number): number {
    // 月相は-180 度から+180 度の範囲
    // 新月 (0 度) で照度 0、満月 (±180 度) で照度 1
    const normalizedPhase = Math.abs(phase);
    return (180 - normalizedPhase) / 180;
  }

  /**
   * 月相が撮影に適しているかを判定
   */
  isVisibleMoonPhase(illumination: number, minIllumination: number = 0.1): boolean {
    return illumination >= minIllumination;
  }

  /**
   * 天体の可視性を判定（高度による）
   */
  isVisible(altitude: number, minAltitude: number = -2): boolean {
    return altitude > minAltitude;
  }
}