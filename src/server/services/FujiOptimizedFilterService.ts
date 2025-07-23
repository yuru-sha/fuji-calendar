import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

interface FujiCandidateTime {
  calculationYear: number;
  candidateDate: Date;
  candidateTime: Date;
  phenomenonType: 'diamond' | 'pearl';
  celestialBody: 'sun' | 'moon';
  azimuth: number;
  altitude: number;
  isFujiDirection: boolean;
  isSuitableAltitude: boolean;
  moonIllumination?: number;
  moonPhase?: number;
  isBrightEnough: boolean;
  isDiamondSeason: boolean;
  isOptimalTime: boolean;
  qualityScore: number;
  azimuthBucket: number;
  altitudeBucket: number;
}

interface FujiOptimalCandidate {
  calculationYear: number;
  eventDate: Date;
  phenomenonType: 'diamond' | 'pearl';
  optimalStartTime: Date;
  optimalEndTime: Date;
  peakTime: Date;
  peakAzimuth: number;
  peakAltitude: number;
  azimuthPrecision: number;
  altitudeSuitability: number;
  overallQuality: number;
  moonIllumination?: number;
  moonPhaseDescription?: string;
  isSupermoon: boolean;
  isEquinoxPeriod: boolean;
  isWeekend: boolean;
  notes?: string;
}

/**
 * 富士現象特化型フィルタリングサービス
 * 大量の天体データから富士現象に関連するデータのみを効率的に抽出
 */
export class FujiOptimizedFilterService {
  private db: UnifiedDatabase;
  private logger: StructuredLogger;
  
  // 富士山関連定数
  private readonly FUJI_AZIMUTH_MIN = 250; // 富士山方向の方位角範囲（最小）
  private readonly FUJI_AZIMUTH_MAX = 280; // 富士山方向の方位角範囲（最大）
  private readonly SUITABLE_ALTITUDE_MIN = -2; // 適切な高度範囲（最小）
  private readonly SUITABLE_ALTITUDE_MAX = 10; // 適切な高度範囲（最大）
  
  // フィルタリング基準
  private readonly MIN_MOON_ILLUMINATION = 0.15; // 最小月輝面比
  private readonly DIAMOND_SEASON_MONTHS = [10, 11, 12, 1, 2]; // ダイヤモンド富士シーズン
  private readonly QUALITY_THRESHOLD = 0.5; // 候補として採用する最小品質スコア
  private readonly OPTIMAL_THRESHOLD = 0.7; // 最適候補として採用する最小品質スコア
  
  // バケット化
  private readonly AZIMUTH_BUCKET_SIZE = 5; // 方位角バケットサイズ（度）
  private readonly ALTITUDE_BUCKET_SIZE = 1; // 高度バケットサイズ（度）

  constructor() {
    this.db = getUnifiedDatabase();
    this.logger = getComponentLogger('fuji-optimized-filter');
  }

  /**
   * 年間富士現象フィルタリングのメイン処理
   */
  async filterYearlyFujiData(year: number): Promise<void> {
    const startTime = Date.now();
    this.logger.info('富士現象データフィルタリング開始', { year });

    try {
      // 1. 基本天体データから富士現象候補時刻を抽出
      await this.extractFujiCandidateTimes(year);
      
      // 2. 候補時刻から最適候補を選定
      await this.selectOptimalCandidates(year);
      
      // 3. 日別サマリーを生成（トリガーで自動実行されるが念のため）
      await this.generateDailySummary(year);
      
      const totalTime = Date.now() - startTime;
      this.logger.info('富士現象データフィルタリング完了', { 
        year, 
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 1000 / 60)
      });
      
    } catch (error) {
      this.logger.error('富士現象データフィルタリングエラー', error, { year });
      throw error;
    }
  }

  /**
   * 基本天体データから富士現象候補時刻を抽出
   */
  private async extractFujiCandidateTimes(year: number): Promise<void> {
    this.logger.info('富士現象候補時刻抽出開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM fuji_candidate_times WHERE calculation_year = ?`, [year]);
    
    // ダイヤモンド富士候補（太陽）の抽出
    const diamondCandidates = await this.extractDiamondCandidates(year);
    
    // パール富士候補（月）の抽出
    const pearlCandidates = await this.extractPearlCandidates(year);
    
    // データベースに保存
    const allCandidates = [...diamondCandidates, ...pearlCandidates];
    await this.insertCandidateTimesBatch(allCandidates);
    
    this.logger.info('富士現象候補時刻抽出完了', { 
      year,
      totalCandidates: allCandidates.length,
      diamondCandidates: diamondCandidates.length,
      pearlCandidates: pearlCandidates.length
    });
  }

  /**
   * ダイヤモンド富士候補を抽出
   */
  private async extractDiamondCandidates(year: number): Promise<FujiCandidateTime[]> {
    this.logger.debug('ダイヤモンド富士候補抽出開始', { year });
    
    // 天体データから太陽の位置データを取得（富士山方向の範囲のみ）
    const sunData = await this.db.allAdapted<{
      datetimeJst: string;
      sunAzimuth: number;
      sunAltitude: number;
    }>(`
      SELECT datetime_jst, sun_azimuth, sun_altitude
      FROM celestial_data
      WHERE calculation_year = ?
        AND sun_azimuth BETWEEN ? AND ?
        AND sun_altitude BETWEEN ? AND ?
        AND (
          EXTRACT(MONTH FROM datetime_jst) IN (${this.DIAMOND_SEASON_MONTHS.join(',')})
          OR 
          -- 春分・秋分前後の特別期間も含める
          (
            EXTRACT(MONTH FROM datetime_jst) IN (3, 9) AND
            EXTRACT(DAY FROM datetime_jst) BETWEEN 6 AND 36
          )
        )
      ORDER BY datetime_jst
    `, [
      year, 
      this.FUJI_AZIMUTH_MIN, 
      this.FUJI_AZIMUTH_MAX,
      this.SUITABLE_ALTITUDE_MIN, 
      this.SUITABLE_ALTITUDE_MAX
    ]);

    const candidates: FujiCandidateTime[] = [];

    for (const data of sunData) {
      const candidateTime = new Date(data.datetimeJst);
      const candidateDate = new Date(candidateTime.getFullYear(), candidateTime.getMonth(), candidateTime.getDate());
      
      // 富士現象条件の判定
      const isFujiDirection = this.isInFujiDirection(data.sunAzimuth);
      const isSuitableAltitude = this.isSuitableAltitude(data.sunAltitude);
      const isDiamondSeason = this.isDiamondSeason(candidateDate);
      const isOptimalTime = this.isOptimalSunTime(candidateTime);
      
      // 品質スコア計算
      const qualityScore = this.calculateDiamondQualityScore(
        data.sunAzimuth,
        data.sunAltitude,
        candidateDate,
        candidateTime
      );
      
      // 最小品質を満たす場合のみ候補として採用
      if (qualityScore >= this.QUALITY_THRESHOLD) {
        candidates.push({
          calculationYear: year,
          candidateDate,
          candidateTime,
          phenomenonType: 'diamond',
          celestialBody: 'sun',
          azimuth: data.sunAzimuth,
          altitude: data.sunAltitude,
          isFujiDirection,
          isSuitableAltitude,
          isBrightEnough: true, // 太陽は常に十分明るい
          isDiamondSeason,
          isOptimalTime,
          qualityScore,
          azimuthBucket: Math.floor(data.sunAzimuth / this.AZIMUTH_BUCKET_SIZE),
          altitudeBucket: Math.floor(data.sunAltitude / this.ALTITUDE_BUCKET_SIZE)
        });
      }
    }

    this.logger.debug('ダイヤモンド富士候補抽出完了', { 
      year, 
      rawDataCount: sunData.length,
      filteredCandidates: candidates.length 
    });
    
    return candidates;
  }

  /**
   * パール富士候補を抽出
   */
  private async extractPearlCandidates(year: number): Promise<FujiCandidateTime[]> {
    this.logger.debug('パール富士候補抽出開始', { year });
    
    // 天体データから月の位置データを取得（十分明るく、富士山方向の範囲のみ）
    const moonData = await this.db.allAdapted<{
      datetimeJst: string;
      moonAzimuth: number;
      moonAltitude: number;
      moonPhase: number;
      moonIllumination: number;
    }>(`
      SELECT datetime_jst, moon_azimuth, moon_altitude, moon_phase, moon_illumination
      FROM celestial_data
      WHERE calculation_year = ?
        AND moon_azimuth BETWEEN ? AND ?
        AND moon_altitude BETWEEN ? AND ?
        AND moon_illumination >= ?
      ORDER BY datetime_jst
    `, [
      year,
      this.FUJI_AZIMUTH_MIN, 
      this.FUJI_AZIMUTH_MAX,
      this.SUITABLE_ALTITUDE_MIN, 
      this.SUITABLE_ALTITUDE_MAX,
      this.MIN_MOON_ILLUMINATION
    ]);

    const candidates: FujiCandidateTime[] = [];

    for (const data of moonData) {
      const candidateTime = new Date(data.datetimeJst);
      const candidateDate = new Date(candidateTime.getFullYear(), candidateTime.getMonth(), candidateTime.getDate());
      
      // 富士現象条件の判定
      const isFujiDirection = this.isInFujiDirection(data.moonAzimuth);
      const isSuitableAltitude = this.isSuitableAltitude(data.moonAltitude);
      const isBrightEnough = data.moonIllumination >= this.MIN_MOON_ILLUMINATION;
      const isOptimalTime = this.isOptimalMoonTime(candidateTime);
      
      // 品質スコア計算
      const qualityScore = this.calculatePearlQualityScore(
        data.moonAzimuth,
        data.moonAltitude,
        data.moonIllumination,
        data.moonPhase,
        candidateTime
      );
      
      // 最小品質を満たす場合のみ候補として採用
      if (qualityScore >= this.QUALITY_THRESHOLD) {
        candidates.push({
          calculationYear: year,
          candidateDate,
          candidateTime,
          phenomenonType: 'pearl',
          celestialBody: 'moon',
          azimuth: data.moonAzimuth,
          altitude: data.moonAltitude,
          isFujiDirection,
          isSuitableAltitude,
          moonIllumination: data.moonIllumination,
          moonPhase: data.moonPhase,
          isBrightEnough,
          isDiamondSeason: false, // パール富士は季節関係なし
          isOptimalTime,
          qualityScore,
          azimuthBucket: Math.floor(data.moonAzimuth / this.AZIMUTH_BUCKET_SIZE),
          altitudeBucket: Math.floor(data.moonAltitude / this.ALTITUDE_BUCKET_SIZE)
        });
      }
    }

    this.logger.debug('パール富士候補抽出完了', { 
      year, 
      rawDataCount: moonData.length,
      filteredCandidates: candidates.length 
    });
    
    return candidates;
  }

  /**
   * 候補時刻から最適候補を選定
   */
  private async selectOptimalCandidates(year: number): Promise<void> {
    this.logger.info('最適候補選定開始', { year });
    
    // 既存データ削除
    await this.db.runAdapted(`DELETE FROM fuji_optimal_candidates WHERE calculation_year = ?`, [year]);
    
    // 高品質な候補時刻を日付・現象タイプ別にグループ化
    const groupedCandidates = await this.db.allAdapted<{
      candidateDate: string;
      phenomenonType: string;
      candidateCount: number;
      avgQuality: number;
      maxQuality: number;
      bestTime: string;
      bestAzimuth: number;
      bestAltitude: number;
      avgMoonIllumination: number;
    }>(`
      SELECT 
        candidate_date,
        phenomenon_type,
        count(*) as candidate_count,
        avg(quality_score) as avg_quality,
        max(quality_score) as max_quality,
        (array_agg(candidate_time ORDER BY quality_score DESC))[1] as best_time,
        (array_agg(azimuth ORDER BY quality_score DESC))[1] as best_azimuth,
        (array_agg(altitude ORDER BY quality_score DESC))[1] as best_altitude,
        avg(moon_illumination) as avg_moon_illumination
      FROM fuji_candidate_times
      WHERE calculation_year = ? 
        AND quality_score >= ?
      GROUP BY candidate_date, phenomenon_type
      HAVING max(quality_score) >= ?
      ORDER BY candidate_date, phenomenon_type
    `, [year, this.QUALITY_THRESHOLD, this.OPTIMAL_THRESHOLD]);

    const optimalCandidates: FujiOptimalCandidate[] = [];

    for (const group of groupedCandidates) {
      const eventDate = new Date(group.candidateDate);
      const peakTime = new Date(group.bestTime);
      
      // 最適時間窓を計算（ピーク時刻の前後）
      const windowMinutes = group.phenomenonType === 'diamond' ? 30 : 60;
      const optimalStartTime = new Date(peakTime.getTime() - windowMinutes * 60 * 1000);
      const optimalEndTime = new Date(peakTime.getTime() + windowMinutes * 60 * 1000);
      
      // 富士山方向への精度を計算
      const azimuthPrecision = this.calculateAzimuthPrecision(group.bestAzimuth);
      const altitudeSuitability = this.calculateAltitudeSuitability(group.bestAltitude);
      
      // 特別条件の判定
      const isEquinoxPeriod = this.isEquinoxPeriod(eventDate);
      const isWeekend = this.isWeekend(eventDate);
      
      // 月相説明（パール富士のみ）
      const moonPhaseDescription = group.phenomenonType === 'pearl' ? 
        this.getMoonPhaseDescription(group.avgMoonIllumination) : undefined;
      
      optimalCandidates.push({
        calculationYear: year,
        eventDate,
        phenomenonType: group.phenomenonType as 'diamond' | 'pearl',
        optimalStartTime,
        optimalEndTime,
        peakTime,
        peakAzimuth: group.bestAzimuth,
        peakAltitude: group.bestAltitude,
        azimuthPrecision,
        altitudeSuitability,
        overallQuality: group.maxQuality,
        moonIllumination: group.phenomenonType === 'pearl' ? group.avgMoonIllumination : undefined,
        moonPhaseDescription,
        isSupermoon: false, // TODO: スーパームーン判定を追加
        isEquinoxPeriod,
        isWeekend,
        notes: this.generateCandidateNotes(group, isEquinoxPeriod, isWeekend)
      });
    }

    await this.insertOptimalCandidatesBatch(optimalCandidates);
    
    this.logger.info('最適候補選定完了', { 
      year,
      totalOptimalCandidates: optimalCandidates.length,
      diamondOptimal: optimalCandidates.filter(c => c.phenomenonType === 'diamond').length,
      pearlOptimal: optimalCandidates.filter(c => c.phenomenonType === 'pearl').length,
      highQuality: optimalCandidates.filter(c => c.overallQuality >= 0.8).length
    });
  }

  /**
   * 日別サマリーを生成（トリガーの補完）
   */
  private async generateDailySummary(year: number): Promise<void> {
    this.logger.info('日別サマリー生成開始', { year });
    
    // PostgreSQLトリガーで自動生成されるが、念のため手動でも実行
    const summaryCount = await this.db.getAdapted<{ count: number }>(`
      SELECT count(*) as count FROM daily_fuji_summary WHERE calculation_year = ?
    `, [year]);
    
    this.logger.info('日別サマリー生成完了', { 
      year,
      summaryDays: summaryCount?.count || 0
    });
  }

  // =================================================================
  // ヘルパーメソッド
  // =================================================================

  private isInFujiDirection(azimuth: number): boolean {
    return azimuth >= this.FUJI_AZIMUTH_MIN && azimuth <= this.FUJI_AZIMUTH_MAX;
  }

  private isSuitableAltitude(altitude: number): boolean {
    return altitude >= this.SUITABLE_ALTITUDE_MIN && altitude <= this.SUITABLE_ALTITUDE_MAX;
  }

  private isDiamondSeason(date: Date): boolean {
    const month = date.getMonth() + 1;
    return this.DIAMOND_SEASON_MONTHS.includes(month);
  }

  private isOptimalSunTime(time: Date): boolean {
    const hour = time.getHours();
    // 日の出前後（5-8時）または日の入り前後（16-19時）
    return (hour >= 5 && hour <= 8) || (hour >= 16 && hour <= 19);
  }

  private isOptimalMoonTime(time: Date): boolean {
    const hour = time.getHours();
    // 月は時間帯の制限が少ないが、深夜は除外
    return hour >= 5 && hour <= 23;
  }

  private isEquinoxPeriod(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 春分前後（3月6日-4月5日）
    if (month === 3 && day >= 6) return true;
    if (month === 4 && day <= 5) return true;
    
    // 秋分前後（9月8日-10月8日）
    if (month === 9 && day >= 8) return true;
    if (month === 10 && day <= 8) return true;
    
    return false;
  }

  private isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 日曜日または土曜日
  }

  private calculateDiamondQualityScore(
    azimuth: number, 
    altitude: number, 
    date: Date, 
    time: Date
  ): number {
    let score = 0;
    
    // 方位角スコア（富士山方向に近いほど高得点）
    const azimuthCenter = (this.FUJI_AZIMUTH_MIN + this.FUJI_AZIMUTH_MAX) / 2;
    const azimuthDiff = Math.abs(azimuth - azimuthCenter);
    const azimuthScore = Math.max(0, 1 - azimuthDiff / 15); // 15度でスコア0
    score += azimuthScore * 0.4;
    
    // 高度スコア（適切な範囲内で高得点）
    let altitudeScore = 0;
    if (altitude >= -1 && altitude <= 5) altitudeScore = 1;
    else if (altitude >= this.SUITABLE_ALTITUDE_MIN && altitude <= this.SUITABLE_ALTITUDE_MAX) altitudeScore = 0.7;
    else altitudeScore = 0.3;
    score += altitudeScore * 0.3;
    
    // 季節スコア
    const seasonScore = this.isDiamondSeason(date) ? 1 : 0.5;
    score += seasonScore * 0.2;
    
    // 時間帯スコア
    const timeScore = this.isOptimalSunTime(time) ? 1 : 0.3;
    score += timeScore * 0.1;
    
    return Math.min(1, score);
  }

  private calculatePearlQualityScore(
    azimuth: number, 
    altitude: number, 
    illumination: number, 
    phase: number, 
    time: Date
  ): number {
    let score = 0;
    
    // 方位角スコア
    const azimuthCenter = (this.FUJI_AZIMUTH_MIN + this.FUJI_AZIMUTH_MAX) / 2;
    const azimuthDiff = Math.abs(azimuth - azimuthCenter);
    const azimuthScore = Math.max(0, 1 - azimuthDiff / 15);
    score += azimuthScore * 0.3;
    
    // 高度スコア
    let altitudeScore = 0;
    if (altitude >= 0 && altitude <= 8) altitudeScore = 1;
    else if (altitude >= this.SUITABLE_ALTITUDE_MIN && altitude <= this.SUITABLE_ALTITUDE_MAX) altitudeScore = 0.7;
    else altitudeScore = 0.3;
    score += altitudeScore * 0.25;
    
    // 輝面比スコア（明るいほど高得点）
    const illuminationScore = Math.min(1, illumination / 0.8); // 80%で最高得点
    score += illuminationScore * 0.3;
    
    // 月相スコア（満月前後が最高）
    const phaseDiff = Math.abs(phase - 0.5); // 満月は0.5
    const phaseScore = Math.max(0, 1 - phaseDiff * 2);
    score += phaseScore * 0.1;
    
    // 時間帯スコア
    const timeScore = this.isOptimalMoonTime(time) ? 1 : 0.5;
    score += timeScore * 0.05;
    
    return Math.min(1, score);
  }

  private calculateAzimuthPrecision(azimuth: number): number {
    const azimuthCenter = (this.FUJI_AZIMUTH_MIN + this.FUJI_AZIMUTH_MAX) / 2;
    const diff = Math.abs(azimuth - azimuthCenter);
    return Math.max(0, 1 - diff / 15);
  }

  private calculateAltitudeSuitability(altitude: number): number {
    if (altitude >= -1 && altitude <= 5) return 1.0;
    if (altitude >= this.SUITABLE_ALTITUDE_MIN && altitude <= this.SUITABLE_ALTITUDE_MAX) return 0.7;
    return Math.max(0, 1 - Math.abs(altitude - 2) / 10);
  }

  private getMoonPhaseDescription(illumination: number): string {
    if (illumination < 0.1) return 'new_moon';
    if (illumination < 0.3) return 'waxing_crescent';
    if (illumination < 0.7) return 'waxing_gibbous';
    if (illumination < 0.9) return 'full_moon';
    return 'waning_gibbous';
  }

  private generateCandidateNotes(
    group: any, 
    isEquinoxPeriod: boolean, 
    isWeekend: boolean
  ): string {
    const notes = [];
    
    if (group.maxQuality >= 0.9) notes.push('絶好の条件');
    else if (group.maxQuality >= 0.8) notes.push('良好な条件');
    
    if (isEquinoxPeriod) notes.push('春分・秋分期間');
    if (isWeekend) notes.push('週末');
    if (group.candidateCount > 10) notes.push('長時間チャンス');
    
    return notes.join('、');
  }

  // バッチ挿入メソッド
  private async insertCandidateTimesBatch(candidates: FujiCandidateTime[]): Promise<void> {
    if (candidates.length === 0) return;
    
    const batchSize = 1000;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      for (const candidate of batch) {
        await this.db.runAdapted(`
          INSERT INTO fuji_candidate_times (
            calculation_year, candidate_date, candidate_time, phenomenon_type, celestial_body,
            azimuth, altitude, is_fuji_direction, is_suitable_altitude,
            moon_illumination, moon_phase, is_bright_enough,
            is_diamond_season, is_optimal_time, quality_score,
            azimuth_bucket, altitude_bucket
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          candidate.calculationYear,
          candidate.candidateDate.toISOString().split('T')[0],
          candidate.candidateTime.toISOString(),
          candidate.phenomenonType,
          candidate.celestialBody,
          candidate.azimuth,
          candidate.altitude,
          candidate.isFujiDirection,
          candidate.isSuitableAltitude,
          candidate.moonIllumination || null,
          candidate.moonPhase || null,
          candidate.isBrightEnough,
          candidate.isDiamondSeason,
          candidate.isOptimalTime,
          candidate.qualityScore,
          candidate.azimuthBucket,
          candidate.altitudeBucket
        ]);
      }
      
      this.logger.debug('候補時刻バッチ挿入', { 
        batchStart: i + 1,
        batchEnd: Math.min(i + batchSize, candidates.length),
        total: candidates.length
      });
    }
  }

  private async insertOptimalCandidatesBatch(candidates: FujiOptimalCandidate[]): Promise<void> {
    if (candidates.length === 0) return;
    
    for (const candidate of candidates) {
      await this.db.runAdapted(`
        INSERT INTO fuji_optimal_candidates (
          calculation_year, event_date, phenomenon_type,
          optimal_start_time, optimal_end_time, peak_time,
          peak_azimuth, peak_altitude, azimuth_precision, altitude_suitability,
          overall_quality, moon_illumination, moon_phase_description,
          is_supermoon, is_equinox_period, is_weekend, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        candidate.calculationYear,
        candidate.eventDate.toISOString().split('T')[0],
        candidate.phenomenonType,
        candidate.optimalStartTime.toISOString(),
        candidate.optimalEndTime.toISOString(),
        candidate.peakTime.toISOString(),
        candidate.peakAzimuth,
        candidate.peakAltitude,
        candidate.azimuthPrecision,
        candidate.altitudeSuitability,
        candidate.overallQuality,
        candidate.moonIllumination || null,
        candidate.moonPhaseDescription || null,
        candidate.isSupermoon,
        candidate.isEquinoxPeriod,
        candidate.isWeekend,
        candidate.notes || null
      ]);
    }
  }
}

export const fujiOptimizedFilterService = new FujiOptimizedFilterService();