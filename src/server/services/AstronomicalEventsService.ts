import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { AstronomicalCalculatorImpl } from './AstronomicalCalculator';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

const astronomicalCalculator = new AstronomicalCalculatorImpl();

interface SolarEvent {
  calculationYear: number;
  eventDate: Date;
  eventType: 'sunrise' | 'sunset' | 'spring_equinox' | 'autumn_equinox' | 'summer_solstice' | 'winter_solstice';
  eventTime: Date;
  azimuth: number;
  altitude: number;
  declination?: number;
  equationOfTime?: number;
  isSeasonalMarker: boolean;
}

interface LunarEvent {
  calculationYear: number;
  eventDate: Date;
  eventType: 'moonrise' | 'moonset' | 'new_moon' | 'first_quarter' | 'full_moon' | 'last_quarter';
  eventTime: Date;
  azimuth: number;
  altitude: number;
  phase: number;
  illumination: number;
  distanceKm?: number;
  ageDays?: number;
  angularDiameter?: number;
  isSupermoon: boolean;
}

interface FujiPhenomenonCandidate {
  calculationYear: number;
  eventDate: Date;
  phenomenonType: 'diamond_sunrise' | 'diamond_sunset' | 'pearl_rise' | 'pearl_set' | 'pearl_transit';
  timeWindowStart: Date;
  timeWindowEnd: Date;
  optimalTime: Date;
  celestialAzimuth: number;
  celestialAltitude: number;
  visibilityScore: number;
  moonIllumination?: number;
  isSeasonalSpecial: boolean;
  notes?: string;
}

interface SeasonalMarker {
  calculationYear: number;
  markerType: 'spring_equinox' | 'summer_solstice' | 'autumn_equinox' | 'winter_solstice';
  exactTime: Date;
  markerDate: Date;
  sunDeclination: number;
  dayLengthHours: number;
  diamondFujiPeakPeriodStart: Date;
  diamondFujiPeakPeriodEnd: Date;
  description: string;
}

/**
 * 天文イベント中間データ生成サービス
 * 基本的な天体データから意味のある天文イベントを抽出
 */
export class AstronomicalEventsService {
  private db: UnifiedDatabase;
  private logger: StructuredLogger;
  
  // 東京の座標（日本標準時の基準地）
  private readonly TOKYO_LATITUDE = 35.6762;
  private readonly TOKYO_LONGITUDE = 139.6503;
  
  // 富士現象の基準パラメータ
  private readonly DIAMOND_FUJI_SEASON_RANGES = [
    { start: { month: 10, day: 1 }, end: { month: 2, day: 28 } }, // 10月-2月がメインシーズン
  ];
  
  private readonly MOON_MIN_ILLUMINATION = 0.15; // パール富士の最小輝面比
  private readonly SUPERMOON_THRESHOLD_KM = 356000; // スーパームーンの距離閾値

  constructor() {
    this.db = getUnifiedDatabase();
    this.logger = getComponentLogger('astronomical-events');
  }

  /**
   * 年間天文イベントの生成メイン処理
   */
  async generateYearlyEvents(year: number): Promise<void> {
    const startTime = Date.now();
    this.logger.info('年間天文イベント生成開始', { year });

    try {
      // 1. 季節マーカー（春分・秋分・至点）の計算
      await this.generateSeasonalMarkers(year);
      
      // 2. 太陽イベント（日の出・日の入り）の生成
      await this.generateSolarEvents(year);
      
      // 3. 月イベント（月の出・月の入り・月相）の生成
      await this.generateLunarEvents(year);
      
      // 4. 富士現象候補の抽出
      await this.generateFujiPhenomenaCandidates(year);
      
      const totalTime = Date.now() - startTime;
      this.logger.info('年間天文イベント生成完了', { 
        year, 
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 1000 / 60)
      });
      
    } catch (error) {
      this.logger.error('年間天文イベント生成エラー', error, { year });
      throw error;
    }
  }

  /**
   * 季節マーカー（春分・秋分・至点）の計算
   */
  private async generateSeasonalMarkers(year: number): Promise<void> {
    this.logger.info('季節マーカー計算開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM seasonal_markers WHERE calculation_year = ?`, [year]);
    
    const markers: SeasonalMarker[] = [];
    
    // 春分・夏至・秋分・冬至の計算
    const seasonalEvents = [
      { type: 'spring_equinox', approximateDate: new Date(year, 2, 20) }, // 3月20日頃
      { type: 'summer_solstice', approximateDate: new Date(year, 5, 21) }, // 6月21日頃  
      { type: 'autumn_equinox', approximateDate: new Date(year, 8, 23) }, // 9月23日頃
      { type: 'winter_solstice', approximateDate: new Date(year, 11, 22) }, // 12月22日頃
    ];
    
    for (const event of seasonalEvents) {
      const exactTime = this.calculateExactSeasonalTime(event.type as any, year);
      const sunPosition = astronomicalCalculator.calculateSunPosition(exactTime);
      
      // ダイヤモンド富士の好機期間を計算
      const peakPeriod = this.calculateDiamondFujiPeakPeriod(event.type as any, year);
      
      // 昼の長さを計算（東京基準）
      const dayLength = this.calculateDayLength(exactTime, this.TOKYO_LATITUDE);
      
      markers.push({
        calculationYear: year,
        markerType: event.type as any,
        exactTime,
        markerDate: new Date(exactTime.getFullYear(), exactTime.getMonth(), exactTime.getDate()),
        sunDeclination: sunPosition.declination || 0,
        dayLengthHours: dayLength,
        diamondFujiPeakPeriodStart: peakPeriod.start,
        diamondFujiPeakPeriodEnd: peakPeriod.end,
        description: this.getSeasonalDescription(event.type as any)
      });
    }
    
    await this.insertSeasonalMarkersBatch(markers);
    
    this.logger.info('季節マーカー計算完了', { 
      year, 
      markerCount: markers.length 
    });
  }

  /**
   * 太陽イベント（日の出・日の入り）の生成
   */
  private async generateSolarEvents(year: number): Promise<void> {
    this.logger.info('太陽イベント生成開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM solar_events WHERE calculation_year = ?`, [year]);
    
    const solarEvents: SolarEvent[] = [];
    
    // 毎日の日の出・日の入りを計算（東京基準）
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      // 日の出時刻の計算
      const sunriseTime = this.calculateSunrise(currentDate, this.TOKYO_LATITUDE, this.TOKYO_LONGITUDE);
      if (sunriseTime) {
        const sunrisePosition = astronomicalCalculator.calculateSunPosition(sunriseTime);
        solarEvents.push({
          calculationYear: year,
          eventDate: new Date(currentDate),
          eventType: 'sunrise',
          eventTime: sunriseTime,
          azimuth: sunrisePosition.azimuth,
          altitude: sunrisePosition.elevation,
          declination: sunrisePosition.declination,
          isSeasonalMarker: false
        });
      }
      
      // 日の入り時刻の計算
      const sunsetTime = this.calculateSunset(currentDate, this.TOKYO_LATITUDE, this.TOKYO_LONGITUDE);
      if (sunsetTime) {
        const sunsetPosition = astronomicalCalculator.calculateSunPosition(sunsetTime);
        solarEvents.push({
          calculationYear: year,
          eventDate: new Date(currentDate),
          eventType: 'sunset',
          eventTime: sunsetTime,
          azimuth: sunsetPosition.azimuth,
          altitude: sunsetPosition.elevation,
          declination: sunsetPosition.declination,
          isSeasonalMarker: false
        });
      }
      
      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 季節マーカーを太陽イベントに追加
    const seasonalMarkers = await this.db.allAdapted<{
      markerType: string;
      exactTime: string;
      sunDeclination: number;
    }>(`
      SELECT marker_type, exact_time, sun_declination
      FROM seasonal_markers 
      WHERE calculation_year = ?
    `, [year]);
    
    for (const marker of seasonalMarkers) {
      const exactTime = new Date(marker.exactTime);
      const position = astronomicalCalculator.calculateSunPosition(exactTime);
      
      solarEvents.push({
        calculationYear: year,
        eventDate: new Date(exactTime.getFullYear(), exactTime.getMonth(), exactTime.getDate()),
        eventType: marker.markerType as any,
        eventTime: exactTime,
        azimuth: position.azimuth,
        altitude: position.elevation,
        declination: marker.sunDeclination,
        isSeasonalMarker: true
      });
    }
    
    await this.insertSolarEventsBatch(solarEvents);
    
    this.logger.info('太陽イベント生成完了', { 
      year, 
      eventCount: solarEvents.length,
      dailyEvents: solarEvents.filter(e => !e.isSeasonalMarker).length,
      seasonalEvents: solarEvents.filter(e => e.isSeasonalMarker).length
    });
  }

  /**
   * 月イベント（月の出・月の入り・月相）の生成
   */
  private async generateLunarEvents(year: number): Promise<void> {
    this.logger.info('月イベント生成開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM lunar_events WHERE calculation_year = ?`, [year]);
    
    const lunarEvents: LunarEvent[] = [];
    
    // 毎日の月の出・月の入りを計算
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      // 月の出時刻の計算
      const moonriseTime = this.calculateMoonrise(currentDate, this.TOKYO_LATITUDE, this.TOKYO_LONGITUDE);
      if (moonriseTime) {
        const moonPosition = astronomicalCalculator.calculateMoonPosition(moonriseTime);
        const isSupermoon = (moonPosition.distance || 400000) < this.SUPERMOON_THRESHOLD_KM;
        
        lunarEvents.push({
          calculationYear: year,
          eventDate: new Date(currentDate),
          eventType: 'moonrise',
          eventTime: moonriseTime,
          azimuth: moonPosition.azimuth,
          altitude: moonPosition.elevation,
          phase: moonPosition.phase || 0,
          illumination: moonPosition.illumination || 0,
          distanceKm: moonPosition.distance,
          ageDays: this.calculateMoonAge(moonriseTime),
          isSupermoon
        });
      }
      
      // 月の入り時刻の計算
      const moonsetTime = this.calculateMoonset(currentDate, this.TOKYO_LATITUDE, this.TOKYO_LONGITUDE);
      if (moonsetTime) {
        const moonPosition = astronomicalCalculator.calculateMoonPosition(moonsetTime);
        const isSupermoon = (moonPosition.distance || 400000) < this.SUPERMOON_THRESHOLD_KM;
        
        lunarEvents.push({
          calculationYear: year,
          eventDate: new Date(currentDate),
          eventType: 'moonset',
          eventTime: moonsetTime,
          azimuth: moonPosition.azimuth,
          altitude: moonPosition.elevation,
          phase: moonPosition.phase || 0,
          illumination: moonPosition.illumination || 0,
          distanceKm: moonPosition.distance,
          ageDays: this.calculateMoonAge(moonsetTime),
          isSupermoon
        });
      }
      
      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 月相変化イベント（新月・上弦・満月・下弦）を追加
    const phaseEvents = await this.calculateMoonPhaseEvents(year);
    lunarEvents.push(...phaseEvents);
    
    await this.insertLunarEventsBatch(lunarEvents);
    
    this.logger.info('月イベント生成完了', { 
      year, 
      eventCount: lunarEvents.length,
      riseSetEvents: lunarEvents.filter(e => e.eventType === 'moonrise' || e.eventType === 'moonset').length,
      phaseEvents: lunarEvents.filter(e => ['new_moon', 'first_quarter', 'full_moon', 'last_quarter'].includes(e.eventType)).length,
      supermoonEvents: lunarEvents.filter(e => e.isSupermoon).length
    });
  }

  /**
   * 富士現象候補の抽出
   */
  private async generateFujiPhenomenaCandidates(year: number): Promise<void> {
    this.logger.info('富士現象候補抽出開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM fuji_phenomena_candidates WHERE calculation_year = ?`, [year]);
    
    const candidates: FujiPhenomenonCandidate[] = [];
    
    // ダイヤモンド富士候補（日の出・日の入り）
    const solarEvents = await this.db.allAdapted<{
      eventDate: string;
      eventType: string;
      eventTime: string;
      azimuth: number;
      altitude: number;
      isSeasonalMarker: boolean;
    }>(`
      SELECT event_date, event_type, event_time, azimuth, altitude, is_seasonal_marker
      FROM solar_events
      WHERE calculation_year = ? 
        AND event_type IN ('sunrise', 'sunset')
        AND (
          (EXTRACT(MONTH FROM event_date) IN (10, 11, 12, 1, 2)) OR
          is_seasonal_marker = true
        )
      ORDER BY event_date
    `, [year]);
    
    for (const event of solarEvents) {
      const eventTime = new Date(event.eventTime);
      const eventDate = new Date(event.eventDate);
      
      // ダイヤモンド富士の可視性スコアを計算
      const visibilityScore = this.calculateDiamondFujiVisibilityScore(
        eventDate, 
        event.azimuth, 
        event.altitude,
        event.isSeasonalMarker
      );
      
      if (visibilityScore > 0.3) { // 閾値以上のもののみ候補とする
        candidates.push({
          calculationYear: year,
          eventDate,
          phenomenonType: event.eventType === 'sunrise' ? 'diamond_sunrise' : 'diamond_sunset',
          timeWindowStart: new Date(eventTime.getTime() - 30 * 60 * 1000), // 30分前
          timeWindowEnd: new Date(eventTime.getTime() + 30 * 60 * 1000), // 30分後
          optimalTime: eventTime,
          celestialAzimuth: event.azimuth,
          celestialAltitude: event.altitude,
          visibilityScore,
          isSeasonalSpecial: event.isSeasonalMarker,
          notes: event.isSeasonalMarker ? `${event.eventType}_特別期間` : undefined
        });
      }
    }
    
    // パール富士候補（月の出・月の入り・中天通過）
    const lunarEvents = await this.db.allAdapted<{
      eventDate: string;
      eventType: string;
      eventTime: string;
      azimuth: number;
      altitude: number;
      illumination: number;
      isSupermoon: boolean;
    }>(`
      SELECT event_date, event_type, event_time, azimuth, altitude, illumination, is_supermoon
      FROM lunar_events
      WHERE calculation_year = ? 
        AND event_type IN ('moonrise', 'moonset')
        AND illumination >= ?
      ORDER BY event_date
    `, [year, this.MOON_MIN_ILLUMINATION]);
    
    for (const event of lunarEvents) {
      const eventTime = new Date(event.eventTime);
      const eventDate = new Date(event.eventDate);
      
      // パール富士の可視性スコアを計算
      const visibilityScore = this.calculatePearlFujiVisibilityScore(
        eventDate,
        event.azimuth,
        event.altitude,
        event.illumination,
        event.isSupermoon
      );
      
      if (visibilityScore > 0.2) { // 閾値以上のもののみ候補とする
        candidates.push({
          calculationYear: year,
          eventDate,
          phenomenonType: event.eventType === 'moonrise' ? 'pearl_rise' : 'pearl_set',
          timeWindowStart: new Date(eventTime.getTime() - 60 * 60 * 1000), // 1時間前
          timeWindowEnd: new Date(eventTime.getTime() + 60 * 60 * 1000), // 1時間後
          optimalTime: eventTime,
          celestialAzimuth: event.azimuth,
          celestialAltitude: event.altitude,
          visibilityScore,
          moonIllumination: event.illumination,
          isSeasonalSpecial: false,
          notes: event.isSupermoon ? 'スーパームーン' : undefined
        });
      }
    }
    
    await this.insertFujiCandidatesBatch(candidates);
    
    this.logger.info('富士現象候補抽出完了', { 
      year, 
      totalCandidates: candidates.length,
      diamondCandidates: candidates.filter(c => c.phenomenonType.includes('diamond')).length,
      pearlCandidates: candidates.filter(c => c.phenomenonType.includes('pearl')).length,
      seasonalSpecial: candidates.filter(c => c.isSeasonalSpecial).length
    });
  }

  // =================================================================
  // ヘルパーメソッド
  // =================================================================

  private calculateExactSeasonalTime(type: string, year: number): Date {
    // 簡易計算 - 実際にはより精密な計算が必要
    const approximateDates = {
      'spring_equinox': new Date(year, 2, 20, 12, 0),
      'summer_solstice': new Date(year, 5, 21, 12, 0),
      'autumn_equinox': new Date(year, 8, 23, 12, 0),
      'winter_solstice': new Date(year, 11, 22, 12, 0)
    };
    
    return approximateDates[type] || new Date(year, 0, 1);
  }

  private calculateDiamondFujiPeakPeriod(type: string, year: number): { start: Date; end: Date } {
    // 春分・秋分前後の±2週間をピーク期間とする
    const baseDate = this.calculateExactSeasonalTime(type, year);
    return {
      start: new Date(baseDate.getTime() - 14 * 24 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000)
    };
  }

  private calculateDayLength(date: Date, latitude: number): number {
    // 簡易計算 - 実際の昼の長さ計算
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const declination = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * Math.PI / 180;
    const latRad = latitude * Math.PI / 180;
    
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination));
    return 2 * hourAngle * 12 / Math.PI;
  }

  private calculateSunrise(date: Date, latitude: number, longitude: number): Date | null {
    // Astronomy Engineを使用した正確な日の出計算
    return astronomicalCalculator.calculateSunrise(date, latitude, longitude);
  }

  private calculateSunset(date: Date, latitude: number, longitude: number): Date | null {
    // Astronomy Engineを使用した正確な日の入り計算
    return astronomicalCalculator.calculateSunset(date, latitude, longitude);
  }

  private calculateMoonrise(date: Date, latitude: number, longitude: number): Date | null {
    // Astronomy Engineを使用した正確な月の出計算
    return astronomicalCalculator.calculateMoonrise(date, latitude, longitude);
  }

  private calculateMoonset(date: Date, latitude: number, longitude: number): Date | null {
    // Astronomy Engineを使用した正確な月の入り計算
    return astronomicalCalculator.calculateMoonset(date, latitude, longitude);
  }

  private calculateMoonAge(date: Date): number {
    // 新月からの経過日数を計算
    const newMoonRef = new Date('2000-01-06T18:14:00Z'); // 参照新月
    const daysSinceRef = (date.getTime() - newMoonRef.getTime()) / (24 * 60 * 60 * 1000);
    const lunarCycle = 29.530588853; // 朔望月
    return daysSinceRef % lunarCycle;
  }

  private async calculateMoonPhaseEvents(year: number): Promise<LunarEvent[]> {
    const events: LunarEvent[] = [];
    
    // 簡易的な月相計算 - 実際にはより精密な計算が必要
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    // 月相イベントの大まかな計算
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      const moonPosition = astronomicalCalculator.calculateMoonPosition(currentDate);
      const phase = moonPosition.phase || 0;
      
      // 主要月相の判定（簡易）
      let eventType: 'new_moon' | 'first_quarter' | 'full_moon' | 'last_quarter' | null = null;
      
      if (phase < 0.05 || phase > 0.95) eventType = 'new_moon';
      else if (phase >= 0.23 && phase <= 0.27) eventType = 'first_quarter';
      else if (phase >= 0.48 && phase <= 0.52) eventType = 'full_moon';
      else if (phase >= 0.73 && phase <= 0.77) eventType = 'last_quarter';
      
      if (eventType) {
        const isSupermoon = (moonPosition.distance || 400000) < this.SUPERMOON_THRESHOLD_KM;
        
        events.push({
          calculationYear: year,
          eventDate: new Date(currentDate),
          eventType,
          eventTime: new Date(currentDate),
          azimuth: moonPosition.azimuth,
          altitude: moonPosition.elevation,
          phase,
          illumination: moonPosition.illumination || 0,
          distanceKm: moonPosition.distance,
          ageDays: this.calculateMoonAge(currentDate),
          isSupermoon
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return events;
  }

  private calculateDiamondFujiVisibilityScore(
    date: Date, 
    azimuth: number, 
    altitude: number,
    isSeasonalMarker: boolean
  ): number {
    let score = 0.5; // ベーススコア
    
    // 季節性加点
    const month = date.getMonth() + 1;
    if ([10, 11, 12, 1, 2].includes(month)) score += 0.3;
    
    // 春分・秋分加点
    if (isSeasonalMarker) score += 0.4;
    
    // 方位角による加点（富士山方向に近いほど高得点）
    const fujiAzimuthRange = { min: 250, max: 280 }; // 大まかな富士山方位角範囲
    if (azimuth >= fujiAzimuthRange.min && azimuth <= fujiAzimuthRange.max) {
      score += 0.3;
    }
    
    // 高度による加点（低すぎず高すぎない）
    if (altitude >= -2 && altitude <= 10) score += 0.2;
    
    return Math.min(1.0, score);
  }

  private calculatePearlFujiVisibilityScore(
    date: Date,
    azimuth: number,
    altitude: number,
    illumination: number,
    isSupermoon: boolean
  ): number {
    let score = 0.3; // ベーススコア
    
    // 輝面比による加点
    score += illumination * 0.4;
    
    // スーパームーン加点
    if (isSupermoon) score += 0.2;
    
    // 方位角による加点
    const fujiAzimuthRange = { min: 250, max: 280 };
    if (azimuth >= fujiAzimuthRange.min && azimuth <= fujiAzimuthRange.max) {
      score += 0.3;
    }
    
    // 高度による加点
    if (altitude >= -2 && altitude <= 15) score += 0.2;
    
    return Math.min(1.0, score);
  }

  private getSeasonalDescription(type: string): string {
    const descriptions = {
      'spring_equinox': '春分の日 - 昼夜の長さが等しくなる日。ダイヤモンド富士の好機。',
      'summer_solstice': '夏至 - 一年で最も昼が長い日。富士現象は少ない時期。',
      'autumn_equinox': '秋分の日 - 昼夜の長さが等しくなる日。ダイヤモンド富士の好機。',
      'winter_solstice': '冬至 - 一年で最も昼が短い日。ダイヤモンド富士シーズン真っ只中。'
    };
    
    return descriptions[type] || '';
  }

  // バッチ挿入メソッド
  private async insertSeasonalMarkersBatch(markers: SeasonalMarker[]): Promise<void> {
    if (markers.length === 0) return;
    
    for (const marker of markers) {
      await this.db.runAdapted(`
        INSERT INTO seasonal_markers (
          calculation_year, marker_type, exact_time, marker_date,
          sun_declination, day_length_hours,
          diamond_fuji_peak_period_start, diamond_fuji_peak_period_end,
          description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        marker.calculationYear, marker.markerType, marker.exactTime.toISOString(),
        marker.markerDate.toISOString().split('T')[0],
        marker.sunDeclination, marker.dayLengthHours,
        marker.diamondFujiPeakPeriodStart.toISOString().split('T')[0],
        marker.diamondFujiPeakPeriodEnd.toISOString().split('T')[0],
        marker.description
      ]);
    }
  }

  private async insertSolarEventsBatch(events: SolarEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    for (const event of events) {
      await this.db.runAdapted(`
        INSERT INTO solar_events (
          calculation_year, event_date, event_type, event_time,
          azimuth, altitude, declination, equation_of_time, is_seasonal_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.calculationYear, event.eventDate.toISOString().split('T')[0],
        event.eventType, event.eventTime.toISOString(),
        event.azimuth, event.altitude, event.declination || null,
        event.equationOfTime || null, event.isSeasonalMarker
      ]);
    }
  }

  private async insertLunarEventsBatch(events: LunarEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    for (const event of events) {
      await this.db.runAdapted(`
        INSERT INTO lunar_events (
          calculation_year, event_date, event_type, event_time,
          azimuth, altitude, phase, illumination, distance_km,
          age_days, angular_diameter, is_supermoon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.calculationYear, event.eventDate.toISOString().split('T')[0],
        event.eventType, event.eventTime.toISOString(),
        event.azimuth, event.altitude, event.phase, event.illumination,
        event.distanceKm || null, event.ageDays || null,
        event.angularDiameter || null, event.isSupermoon
      ]);
    }
  }

  private async insertFujiCandidatesBatch(candidates: FujiPhenomenonCandidate[]): Promise<void> {
    if (candidates.length === 0) return;
    
    for (const candidate of candidates) {
      await this.db.runAdapted(`
        INSERT INTO fuji_phenomena_candidates (
          calculation_year, event_date, phenomenon_type,
          time_window_start, time_window_end, optimal_time,
          celestial_azimuth, celestial_altitude, visibility_score,
          moon_illumination, is_seasonal_special, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        candidate.calculationYear, candidate.eventDate.toISOString().split('T')[0],
        candidate.phenomenonType, candidate.timeWindowStart.toISOString(),
        candidate.timeWindowEnd.toISOString(), candidate.optimalTime.toISOString(),
        candidate.celestialAzimuth, candidate.celestialAltitude, candidate.visibilityScore,
        candidate.moonIllumination || null, candidate.isSeasonalSpecial,
        candidate.notes || null
      ]);
    }
  }
}

export const astronomicalEventsService = new AstronomicalEventsService();