import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { astronomicalCalculator } from './AstronomicalCalculatorAstronomyEngine';
import { Location } from '../../shared/types';
import { FUJI_COORDINATES } from '../../shared/types/index';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

interface CelestialDataPoint {
  calculationYear: number;
  datetimeJst: Date;
  sunAzimuth: number;
  sunAltitude: number;
  sunDistanceAu?: number;
  moonAzimuth: number;
  moonAltitude: number;
  moonPhase: number;
  moonIllumination: number;
  moonDistanceKm?: number;
}

interface FujiPhenomenon {
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
  moonPhase?: number;
  moonIllumination?: number;
}

/**
 * 天体データ事前計算サービス
 * 年1回の事前計算でパフォーマンス問題を解決
 */
export class CelestialPrecomputationService {
  private db: UnifiedDatabase;
  private logger: StructuredLogger;
  
  // 計算パラメータ
  private readonly CALCULATION_INTERVAL_MINUTES = 5; // 5分間隔
  private readonly AZIMUTH_TOLERANCE = 1.5; // 方位角許容誤差（度）
  private readonly ALTITUDE_TOLERANCE = 2.0; // 高度許容誤差（度）
  private readonly MIN_MOON_ILLUMINATION = 0.1; // パール富士の最小輝面比

  constructor() {
    this.db = getUnifiedDatabase();
    this.logger = getComponentLogger('celestial-precomputation');
  }

  /**
   * 年間天体データの事前計算メイン処理
   */
  async precomputeYearlyData(year: number): Promise<void> {
    const startTime = Date.now();
    this.logger.info('年間天体データ事前計算開始', { year });

    try {
      // 1. 全地点の富士山方位角・仰角・距離を計算
      await this.updateLocationFujiData();
      
      // 2. 年間天体データを5分間隔で計算
      await this.calculateYearlyCelestialData(year);
      
      // 3. 各地点での富士現象を検出
      await this.detectFujiPhenomena(year);
      
      const totalTime = Date.now() - startTime;
      this.logger.info('年間天体データ事前計算完了', { 
        year, 
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 1000 / 60)
      });
      
    } catch (error) {
      this.logger.error('年間天体データ事前計算エラー', error, { year });
      throw error;
    }
  }

  /**
   * 全地点の富士山への方位角・仰角・距離を更新
   */
  private async updateLocationFujiData(): Promise<void> {
    this.logger.info('地点の富士山データ更新開始');
    
    const locations = await this.db.allAdapted<Location>(`
      SELECT id, name, latitude, longitude, elevation 
      FROM locations 
      ORDER BY id
    `);

    for (const location of locations) {
      const fujiData = this.calculateFujiGeometry(location);
      
      await this.db.runAdapted(`
        UPDATE locations 
        SET fuji_azimuth = ?, fuji_elevation = ?, fuji_distance = ?
        WHERE id = ?
      `, [
        fujiData.azimuth,
        fujiData.elevation, 
        fujiData.distance,
        location.id
      ]);
      
      this.logger.debug('地点の富士山データ更新', {
        locationId: location.id,
        locationName: location.name,
        fujiAzimuth: fujiData.azimuth.toFixed(2),
        fujiElevation: fujiData.elevation.toFixed(2),
        fujiDistance: (fujiData.distance / 1000).toFixed(1) + 'km'
      });
    }
    
    this.logger.info('地点の富士山データ更新完了', { locationCount: locations.length });
  }

  /**
   * 地点から富士山への幾何学的関係を計算
   */
  private calculateFujiGeometry(location: Location): {
    azimuth: number;
    elevation: number; 
    distance: number;
  } {
    // 球面三角法による方位角計算
    const lat1 = location.latitude * Math.PI / 180;
    const lon1 = location.longitude * Math.PI / 180;
    const lat2 = FUJI_COORDINATES.latitude * Math.PI / 180;
    const lon2 = FUJI_COORDINATES.longitude * Math.PI / 180;
    
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let azimuth = Math.atan2(y, x) * 180 / Math.PI;
    if (azimuth < 0) azimuth += 360;
    
    // 距離計算（ハーバーサイン公式）
    const R = 6371000; // 地球半径（メートル）
    const a = Math.sin((lat2 - lat1) / 2) ** 2 + 
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const horizontalDistance = R * c;
    
    // 仰角計算
    const heightDiff = FUJI_COORDINATES.elevation - location.elevation;
    const elevation = Math.atan2(heightDiff, horizontalDistance) * 180 / Math.PI;
    
    return {
      azimuth,
      elevation,
      distance: Math.sqrt(horizontalDistance ** 2 + heightDiff ** 2)
    };
  }

  /**
   * 年間天体データを5分間隔で計算
   */
  private async calculateYearlyCelestialData(year: number): Promise<void> {
    this.logger.info('年間天体データ計算開始', { year });
    
    // 既存データの削除
    await this.db.runAdapted(`DELETE FROM celestial_data WHERE calculation_year = ?`, [year]);
    
    const startDate = new Date(year, 0, 1, 0, 0, 0); // 1月1日 00:00
    const endDate = new Date(year + 1, 0, 1, 0, 0, 0); // 翌年1月1日 00:00
    
    const celestialData: CelestialDataPoint[] = [];
    const batchSize = 1000; // バルクインサート用
    
    let currentDate = new Date(startDate);
    let pointCount = 0;
    
    while (currentDate < endDate) {
      // 各時刻での太陽・月の位置を計算
      const sunPosition = astronomicalCalculator.calculateSunPosition(currentDate);
      const moonPosition = astronomicalCalculator.calculateMoonPosition(currentDate);
      
      celestialData.push({
        calculationYear: year,
        datetimeJst: new Date(currentDate),
        sunAzimuth: sunPosition.azimuth,
        sunAltitude: sunPosition.elevation,
        moonAzimuth: moonPosition.azimuth,
        moonAltitude: moonPosition.elevation,
        moonPhase: moonPosition.phase || 0,
        moonIllumination: moonPosition.illumination || 0
      });
      
      // バッチ処理でデータベースに保存
      if (celestialData.length >= batchSize) {
        await this.insertCelestialDataBatch(celestialData);
        pointCount += celestialData.length;
        celestialData.length = 0; // 配列をクリア
        
        // 進捗ログ
        const progress = ((currentDate.getTime() - startDate.getTime()) / 
                         (endDate.getTime() - startDate.getTime()) * 100);
        this.logger.info('天体データ計算進捗', {
          year,
          progress: progress.toFixed(1) + '%',
          currentDate: currentDate.toISOString().split('T')[0],
          pointCount
        });
      }
      
      // 5分進める
      currentDate.setMinutes(currentDate.getMinutes() + this.CALCULATION_INTERVAL_MINUTES);
    }
    
    // 残りのデータを保存
    if (celestialData.length > 0) {
      await this.insertCelestialDataBatch(celestialData);
      pointCount += celestialData.length;
    }
    
    this.logger.info('年間天体データ計算完了', { 
      year, 
      totalDataPoints: pointCount,
      intervalMinutes: this.CALCULATION_INTERVAL_MINUTES
    });
  }

  /**
   * 天体データをバッチ挿入
   */
  private async insertCelestialDataBatch(data: CelestialDataPoint[]): Promise<void> {
    if (data.length === 0) return;
    
    const values = data.map(d => 
      `(${d.calculationYear}, '${d.datetimeJst.toISOString()}', ` +
      `${d.sunAzimuth}, ${d.sunAltitude}, ` +
      `${d.moonAzimuth}, ${d.moonAltitude}, ` +
      `${d.moonPhase}, ${d.moonIllumination})`
    ).join(',');
    
    const sql = `
      INSERT INTO celestial_data (
        calculation_year, datetime_jst, 
        sun_azimuth, sun_altitude,
        moon_azimuth, moon_altitude, 
        moon_phase, moon_illumination
      ) VALUES ${values}
    `;
    
    await this.db.runAdapted(sql);
  }

  /**
   * 富士現象（ダイヤモンド富士・パール富士）の検出
   */
  private async detectFujiPhenomena(year: number): Promise<void> {
    this.logger.info('富士現象検出開始', { year });
    
    // 既存の現象データを削除
    await this.db.runAdapted(`
      DELETE FROM fuji_phenomena 
      WHERE phenomenon_time >= ? AND phenomenon_time < ?
    `, [
      new Date(year, 0, 1).toISOString(),
      new Date(year + 1, 0, 1).toISOString()
    ]);
    
    // 富士山データが更新された地点を取得
    const locations = await this.db.allAdapted<Location & {
      fujiAzimuth: number;
      fujiElevation: number;
      fujiDistance: number;
    }>(`
      SELECT id, name, latitude, longitude, elevation,
             fuji_azimuth, fuji_elevation, fuji_distance
      FROM locations 
      WHERE fuji_azimuth IS NOT NULL 
      ORDER BY id
    `);
    
    const phenomena: FujiPhenomenon[] = [];
    
    for (const location of locations) {
      this.logger.debug('地点の富士現象検出開始', {
        locationId: location.id,
        locationName: location.name
      });
      
      // 天体データを時系列で取得
      const celestialData = await this.db.allAdapted<{
        datetimeJst: string;
        sunAzimuth: number;
        sunAltitude: number;
        moonAzimuth: number;
        moonAltitude: number;
        moonPhase: number;
        moonIllumination: number;
      }>(`
        SELECT datetime_jst, sun_azimuth, sun_altitude,
               moon_azimuth, moon_altitude, moon_phase, moon_illumination
        FROM celestial_data
        WHERE calculation_year = ?
        ORDER BY datetime_jst
      `, [year]);
      
      // 各時刻でダイヤモンド富士・パール富士をチェック
      for (const data of celestialData) {
        const phenomenonTime = new Date(data.datetimeJst);
        
        // ダイヤモンド富士チェック
        const diamondAzimuthDiff = Math.abs(data.sunAzimuth - location.fujiAzimuth);
        const diamondAltitudeDiff = Math.abs(data.sunAltitude - location.fujiElevation);
        
        if (diamondAzimuthDiff <= this.AZIMUTH_TOLERANCE && 
            diamondAltitudeDiff <= this.ALTITUDE_TOLERANCE) {
          phenomena.push({
            locationId: location.id,
            phenomenonTime,
            phenomenonType: 'diamond',
            azimuthDifference: diamondAzimuthDiff,
            altitudeDifference: diamondAltitudeDiff,
            totalDifference: Math.sqrt(diamondAzimuthDiff ** 2 + diamondAltitudeDiff ** 2),
            celestialAzimuth: data.sunAzimuth,
            celestialAltitude: data.sunAltitude,
            fujiAzimuth: location.fujiAzimuth,
            fujiElevation: location.fujiElevation
          });
        }
        
        // パール富士チェック
        const pearlAzimuthDiff = Math.abs(data.moonAzimuth - location.fujiAzimuth);
        const pearlAltitudeDiff = Math.abs(data.moonAltitude - location.fujiElevation);
        
        if (pearlAzimuthDiff <= this.AZIMUTH_TOLERANCE && 
            pearlAltitudeDiff <= this.ALTITUDE_TOLERANCE &&
            data.moonIllumination >= this.MIN_MOON_ILLUMINATION) {
          phenomena.push({
            locationId: location.id,
            phenomenonTime,
            phenomenonType: 'pearl',
            azimuthDifference: pearlAzimuthDiff,
            altitudeDifference: pearlAltitudeDiff,
            totalDifference: Math.sqrt(pearlAzimuthDiff ** 2 + pearlAltitudeDiff ** 2),
            celestialAzimuth: data.moonAzimuth,
            celestialAltitude: data.moonAltitude,
            fujiAzimuth: location.fujiAzimuth,
            fujiElevation: location.fujiElevation,
            moonPhase: data.moonPhase,
            moonIllumination: data.moonIllumination
          });
        }
      }
      
      this.logger.debug('地点の富士現象検出完了', {
        locationId: location.id,
        locationName: location.name
      });
    }
    
    // 検出された現象をデータベースに保存
    if (phenomena.length > 0) {
      await this.insertFujiPhenomenaBatch(phenomena);
    }
    
    this.logger.info('富士現象検出完了', { 
      year,
      totalPhenomena: phenomena.length,
      diamondCount: phenomena.filter(p => p.phenomenonType === 'diamond').length,
      pearlCount: phenomena.filter(p => p.phenomenonType === 'pearl').length,
      locationCount: locations.length
    });
  }

  /**
   * 富士現象をバッチ挿入
   */
  private async insertFujiPhenomenaBatch(phenomena: FujiPhenomenon[]): Promise<void> {
    if (phenomena.length === 0) return;
    
    const values = phenomena.map(p => {
      const moonPhase = p.moonPhase !== undefined ? p.moonPhase : 'NULL';
      const moonIllumination = p.moonIllumination !== undefined ? p.moonIllumination : 'NULL';
      
      return `(${p.locationId}, '${p.phenomenonTime.toISOString()}', '${p.phenomenonType}', ` +
             `${p.azimuthDifference}, ${p.altitudeDifference}, ${p.totalDifference}, ` +
             `${p.celestialAzimuth}, ${p.celestialAltitude}, ` +
             `${p.fujiAzimuth}, ${p.fujiElevation}, ` +
             `${moonPhase}, ${moonIllumination})`;
    }).join(',');
    
    const sql = `
      INSERT INTO fuji_phenomena (
        location_id, phenomenon_time, phenomenon_type,
        azimuth_difference, altitude_difference, total_difference,
        celestial_azimuth, celestial_altitude,
        fuji_azimuth, fuji_elevation,
        moon_phase, moon_illumination
      ) VALUES ${values}
    `;
    
    await this.db.runAdapted(sql);
  }

  /**
   * 地点追加時の個別計算（緊急用）
   */
  async calculateLocationData(locationId: number, year: number): Promise<void> {
    this.logger.info('個別地点計算開始', { locationId, year });
    
    // 地点の富士山データ更新
    const location = await this.db.getAdapted<Location>(`
      SELECT * FROM locations WHERE id = ?
    `, [locationId]);
    
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }
    
    const fujiData = this.calculateFujiGeometry(location);
    await this.db.runAdapted(`
      UPDATE locations 
      SET fuji_azimuth = ?, fuji_elevation = ?, fuji_distance = ?
      WHERE id = ?
    `, [fujiData.azimuth, fujiData.elevation, fujiData.distance, locationId]);
    
    // この地点での富士現象を検出（天体データは既存のものを使用）
    const phenomena: FujiPhenomenon[] = [];
    
    const celestialData = await this.db.allAdapted<{
      datetimeJst: string;
      sunAzimuth: number;
      sunAltitude: number;
      moonAzimuth: number;
      moonAltitude: number;
      moonPhase: number;
      moonIllumination: number;
    }>(`
      SELECT datetime_jst, sun_azimuth, sun_altitude,
             moon_azimuth, moon_altitude, moon_phase, moon_illumination
      FROM celestial_data
      WHERE calculation_year = ?
      ORDER BY datetime_jst
    `, [year]);
    
    for (const data of celestialData) {
      const phenomenonTime = new Date(data.datetimeJst);
      
      // ダイヤモンド富士・パール富士の検出ロジック（同じ）
      const diamondAzimuthDiff = Math.abs(data.sunAzimuth - fujiData.azimuth);
      const diamondAltitudeDiff = Math.abs(data.sunAltitude - fujiData.elevation);
      
      if (diamondAzimuthDiff <= this.AZIMUTH_TOLERANCE && 
          diamondAltitudeDiff <= this.ALTITUDE_TOLERANCE) {
        phenomena.push({
          locationId,
          phenomenonTime,
          phenomenonType: 'diamond',
          azimuthDifference: diamondAzimuthDiff,
          altitudeDifference: diamondAltitudeDiff,
          totalDifference: Math.sqrt(diamondAzimuthDiff ** 2 + diamondAltitudeDiff ** 2),
          celestialAzimuth: data.sunAzimuth,
          celestialAltitude: data.sunAltitude,
          fujiAzimuth: fujiData.azimuth,
          fujiElevation: fujiData.elevation
        });
      }
      
      const pearlAzimuthDiff = Math.abs(data.moonAzimuth - fujiData.azimuth);
      const pearlAltitudeDiff = Math.abs(data.moonAltitude - fujiData.elevation);
      
      if (pearlAzimuthDiff <= this.AZIMUTH_TOLERANCE && 
          pearlAltitudeDiff <= this.ALTITUDE_TOLERANCE &&
          data.moonIllumination >= this.MIN_MOON_ILLUMINATION) {
        phenomena.push({
          locationId,
          phenomenonTime,
          phenomenonType: 'pearl',
          azimuthDifference: pearlAzimuthDiff,
          altitudeDifference: pearlAltitudeDiff,
          totalDifference: Math.sqrt(pearlAzimuthDiff ** 2 + pearlAltitudeDiff ** 2),
          celestialAzimuth: data.moonAzimuth,
          celestialAltitude: data.moonAltitude,
          fujiAzimuth: fujiData.azimuth,
          fujiElevation: fujiData.elevation,
          moonPhase: data.moonPhase,
          moonIllumination: data.moonIllumination
        });
      }
    }
    
    // 既存の現象データを削除して新しいものを挿入
    await this.db.runAdapted(`
      DELETE FROM fuji_phenomena WHERE location_id = ?
    `, [locationId]);
    
    if (phenomena.length > 0) {
      await this.insertFujiPhenomenaBatch(phenomena);
    }
    
    this.logger.info('個別地点計算完了', {
      locationId,
      year,
      phenomenaCount: phenomena.length
    });
  }
}

export const celestialPrecomputationService = new CelestialPrecomputationService();