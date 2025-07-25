import { prisma } from '../database/prisma';
import { LocationFujiEvent, EventType, Accuracy, Location, CelestialOrbitData } from '@prisma/client';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
import { timeUtils } from '../../shared/utils/timeUtils';

// 高精度ダイヤモンド富士検出用定数
const FUJI_SUMMIT_WIDTH = 800; // 富士山山頂の物理的な幅（メートル）
const SUN_RADIUS = 0.265; // 太陽の視半径（度）
const IDEAL_OFFSET = 0.594; // 太陽下端が富士山山頂に接触する理想的オフセット（実測値）
const OFFSET_TOLERANCE = 0.12; // 許容範囲（±0.12度）

interface FujiEventCandidate {
  locationId: number;
  eventDate: Date;
  eventTime: Date;
  eventType: EventType;
  azimuth: number;
  altitude: number;
  qualityScore: number;
  accuracy: Accuracy;
  moonPhase?: number;
  moonIllumination?: number;
  calculationYear: number;
}

/**
 * 地点別富士現象イベントサービス
 * AstronomicalDataと各地点をマッチングして最終的な富士現象時刻を計算・保存
 */
export class LocationFujiEventService {
  private logger: StructuredLogger;

  // 高精度マッチング基準（物理的精度重視）
  private readonly PERFECT_THRESHOLD = 0.05;   // 完璧マッチ（0.05度以内）- 実測レベル
  private readonly EXCELLENT_THRESHOLD = 0.08; // 優秀マッチ（0.08度以内）- 高精度
  private readonly GOOD_THRESHOLD = 0.12;      // 良好マッチ（0.12度以内）- OFFSET_TOLERANCE内

  constructor() {
    this.logger = getComponentLogger('location-fuji-event');
  }

  /**
   * 全地点での富士現象マッチング実行
   */
  async matchAllLocations(year: number): Promise<{
    success: boolean;
    totalEvents: number;
    locationCount: number;
    diamondEvents: number;
    pearlEvents: number;
    timeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.info('全地点富士現象マッチング開始', { year });

    try {
      // 富士山データが設定された全地点を取得
      const locations = await this.getLocationsWithFujiData();
      
      if (locations.length === 0) {
        this.logger.warn('富士山データが設定された地点が見つかりません');
        return {
          success: false,
          totalEvents: 0,
          locationCount: 0,
          diamondEvents: 0,
          pearlEvents: 0,
          timeMs: Date.now() - startTime
        };
      }

      // 既存の現象データをクリア
      await this.clearYearEvents(year);

      let totalEvents = 0;
      let diamondEvents = 0;
      let pearlEvents = 0;

      // 各地点で富士現象をマッチング
      for (const location of locations) {
        const locationEvents = await this.matchLocationWithCandidates(location, year);
        totalEvents += locationEvents.length;
        
        // イベントタイプ別カウント
        diamondEvents += locationEvents.filter(e => 
          e.eventType === 'diamond_sunrise' || e.eventType === 'diamond_sunset'
        ).length;
        pearlEvents += locationEvents.filter(e => 
          e.eventType === 'pearl_moonrise' || e.eventType === 'pearl_moonset'
        ).length;

        this.logger.debug('地点マッチング完了', {
          locationId: location.id,
          locationName: location.name,
          eventCount: locationEvents.length
        });
      }

      const totalTime = Date.now() - startTime;

      this.logger.info('全地点富士現象マッチング完了', {
        year,
        locationCount: locations.length,
        totalEvents,
        diamondEvents,
        pearlEvents,
        avgEventsPerLocation: Math.round(totalEvents / locations.length),
        totalTimeMs: totalTime
      });

      return {
        success: true,
        totalEvents,
        locationCount: locations.length,
        diamondEvents,
        pearlEvents,
        timeMs: totalTime
      };

    } catch (error) {
      this.logger.error('全地点富士現象マッチングエラー', error, { year });
      return {
        success: false,
        totalEvents: 0,
        locationCount: 0,
        diamondEvents: 0,
        pearlEvents: 0,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 特定地点での富士現象マッチング（新地点追加時用）
   */
  async matchSingleLocation(locationId: number, year: number): Promise<{
    success: boolean;
    eventCount: number;
    timeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.info('単一地点富士現象マッチング開始', { locationId, year });

    try {
      const location = await this.getLocationWithFujiData(locationId);
      if (!location) {
        throw new Error(`Location not found or missing Fuji data: ${locationId}`);
      }

      // この地点の既存現象データをクリア
      await this.clearLocationEvents(locationId, year);

      const events = await this.matchLocationWithCandidates(location, year);

      const totalTime = Date.now() - startTime;

      this.logger.info('単一地点富士現象マッチング完了', {
        locationId,
        year,
        eventCount: events.length,
        timeMs: totalTime
      });

      return {
        success: true,
        eventCount: events.length,
        timeMs: totalTime
      };

    } catch (error) {
      this.logger.error('単一地点富士現象マッチングエラー', error, { locationId, year });
      return {
        success: false,
        eventCount: 0,
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * 地点と天文候補データの高精度マッチング処理
   * Gemini理論計算 + 実測値統合 + 太陽視半径考慮
   */
  private async matchLocationWithCandidates(
    location: Location & {
      fujiAzimuth: number;
      fujiElevation: number;
      fujiDistance: number;
    },
    year: number
  ): Promise<FujiEventCandidate[]> {
    
    // 年間の天体軌道データを直接取得（JST基準）
    const startDate = timeUtils.getMonthStart(year, 1); // JST 1月1日 00:00
    const endDate = timeUtils.getMonthEnd(year, 12);    // JST 12月31日 23:59
    
    this.logger.info('CelestialOrbitDataから富士現象候補を検索', {
      locationId: location.id,
      year,
      startDate,
      endDate,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation
    });

    // 高精度検索用の条件設定（既存の物理的範囲）
    const fujiApparentWidth = this.calculateFujiApparentWidth(location.fujiDistance);
    const azimuthTolerance = Math.min(
      (fujiApparentWidth / 2) + SUN_RADIUS,
      5.0 // 最大5度までに制限
    );
    
    // ダイヤモンド富士の物理的方位角範囲を適用
    const validAzimuthRanges: Array<{min: number, max: number}> = [];
    
    // 朝のダイヤモンド富士範囲（70-110度）
    const morningMin = Math.max(70, location.fujiAzimuth - azimuthTolerance);
    const morningMax = Math.min(110, location.fujiAzimuth + azimuthTolerance);
    if (morningMin <= morningMax && location.fujiAzimuth >= 70 && location.fujiAzimuth <= 110) {
      validAzimuthRanges.push({min: morningMin, max: morningMax});
    }
    
    // 夕のダイヤモンド富士範囲（250-280度）
    const eveningMin = Math.max(250, location.fujiAzimuth - azimuthTolerance);
    const eveningMax = Math.min(280, location.fujiAzimuth + azimuthTolerance);
    if (eveningMin <= eveningMax && location.fujiAzimuth >= 250 && location.fujiAzimuth <= 280) {
      validAzimuthRanges.push({min: eveningMin, max: eveningMax});
    }
    
    // 有効な方位角範囲がない場合は処理終了
    if (validAzimuthRanges.length === 0) {
      this.logger.info('ダイヤモンド富士観測不可能な地点', {
        locationId: location.id,
        fujiAzimuth: location.fujiAzimuth
      });
      return [];
    }
    
    // 検索範囲を物理的に意味のある範囲に限定
    const elevationMargin = 2.0; // 安全マージン
    const minElevation = location.fujiElevation - elevationMargin;
    const maxElevation = location.fujiElevation + elevationMargin;

    this.logger.info('高精度検索パラメータ', {
      locationId: location.id,
      fujiApparentWidth: fujiApparentWidth.toFixed(3),
      azimuthTolerance: azimuthTolerance.toFixed(3),
      validRanges: validAzimuthRanges.map(r => `${r.min.toFixed(1)}-${r.max.toFixed(1)}°`),
      elevationRange: `${minElevation.toFixed(1)}-${maxElevation.toFixed(1)}°`
    });

    // 複数の方位角範囲でクエリを実行
    const allCandidates: CelestialOrbitData[] = [];
    
    for (const range of validAzimuthRanges) {
      const whereConditions: any = {
        date: {
          gte: startDate,
          lte: endDate
        },
        visible: true,
        elevation: {
          gte: minElevation,
          lte: maxElevation
        },
        azimuth: {
          gte: range.min,
          lte: range.max
        }
      };

      const rangeCandidates = await prisma.celestialOrbitData.findMany({
        where: whereConditions,
        orderBy: [
          { date: 'asc' },
          { time: 'asc' }
        ]
      });
      
      allCandidates.push(...rangeCandidates);
    }
    
    // 時刻順でソート
    const candidates = allCandidates.sort((a, b) => 
      a.date.getTime() - b.date.getTime() || a.time.getTime() - b.time.getTime()
    );

    this.logger.info('高精度候補データ取得完了', {
      locationId: location.id,
      candidateCount: candidates.length
    });

    const matchedEvents: FujiEventCandidate[] = [];

    // 日付ごとにグループ分けして高精度検出（JST基準）
    const dataByDate = new Map<string, CelestialOrbitData[]>();
    for (const candidate of candidates) {
      // JST基準の日付文字列を使用
      const dateKey = timeUtils.formatDateString(candidate.date);
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, []);
      }
      dataByDate.get(dateKey)!.push(candidate);
    }

    // 各日付で高精度ダイヤモンド富士検出
    for (const [dateKey, dayData] of dataByDate) {
      const sunData = dayData.filter(d => d.celestialType === 'sun');
      const moonData = dayData.filter(d => d.celestialType === 'moon');

      // ダイヤモンド富士検出（太陽）
      if (sunData.length > 0) {
        const diamondResult = this.findEnhancedDiamondFuji(sunData, location);
        if (diamondResult) {
          matchedEvents.push({
            locationId: location.id,
            eventDate: diamondResult.data.date,
            eventTime: diamondResult.data.time,
            eventType: diamondResult.eventType,
            azimuth: diamondResult.data.azimuth,
            altitude: diamondResult.data.elevation,
            qualityScore: diamondResult.qualityScore,
            accuracy: diamondResult.accuracy,
            calculationYear: year
          });

          this.logger.debug('高精度ダイヤモンド富士検出', {
            locationId: location.id,
            date: dateKey,
            eventType: diamondResult.eventType,
            qualityScore: diamondResult.qualityScore.toFixed(3),
            accuracy: diamondResult.accuracy,
            offsetDiff: diamondResult.offsetDiff.toFixed(3)
          });
        }
      }

      // パール富士検出（月）- 従来ロジック継続
      for (const candidate of moonData) {
        const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
        const altitudeDiff = Math.abs(candidate.elevation - location.fujiElevation);
        const totalDiff = Math.sqrt(azimuthDiff ** 2 + altitudeDiff ** 2);

        if (totalDiff <= 5.0) { // パール富士は条件を緩く
          const accuracy = this.determineMatchingAccuracy(totalDiff);
          const qualityScore = this.calculateLocationQualityScore(
            azimuthDiff,
            altitudeDiff,
            'good',
            location.fujiDistance / 1000
          );

          const eventType = this.determineEventTypeFromCelestialData(candidate);

          matchedEvents.push({
            locationId: location.id,
            eventDate: candidate.date,
            eventTime: candidate.time,
            eventType,
            azimuth: candidate.azimuth,
            altitude: candidate.elevation,
            qualityScore,
            accuracy,
            moonPhase: candidate.moonPhase || undefined,
            moonIllumination: candidate.moonIllumination || undefined,
            calculationYear: year
          });
        }
      }
    }

    // 重複する現象を除去（同日同種の現象で最高品質のもののみ残す）
    const uniqueEvents = this.removeDuplicateEvents(matchedEvents);

    // データベースに保存
    if (uniqueEvents.length > 0) {
      await this.insertEventsBatch(uniqueEvents);
    }

    return uniqueEvents;
  }

  /**
   * 富士山データ付きの全地点を取得
   */
  private async getLocationsWithFujiData(): Promise<Array<Location & {
    fujiAzimuth: number;
    fujiElevation: number;
    fujiDistance: number;
  }>> {
    const locations = await prisma.location.findMany({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      },
      orderBy: { id: 'asc' }
    });

    // 型アサーション（NULLでないことを確認済み）
    return locations.map(loc => ({
      ...loc,
      fujiAzimuth: loc.fujiAzimuth!,
      fujiElevation: loc.fujiElevation!,
      fujiDistance: loc.fujiDistance!
    }));
  }

  /**
   * 特定地点の富士山データを取得
   */
  private async getLocationWithFujiData(locationId: number): Promise<(Location & {
    fujiAzimuth: number;
    fujiElevation: number;
    fujiDistance: number;
  }) | null> {
    const location = await prisma.location.findUnique({
      where: {
        id: locationId,
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      }
    });

    if (!location || !location.fujiAzimuth || !location.fujiElevation || !location.fujiDistance) {
      return null;
    }

    return {
      ...location,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation,
      fujiDistance: location.fujiDistance
    };
  }

  /**
   * 指定年の全イベントをクリア
   */
  private async clearYearEvents(year: number): Promise<void> {
    const startDate = timeUtils.getMonthStart(year, 1);
    const endDate = timeUtils.getMonthStart(year + 1, 1);

    const deleteResult = await prisma.locationFujiEvent.deleteMany({
      where: {
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    this.logger.info('既存富士現象イベント削除完了', {
      year,
      deletedCount: deleteResult.count
    });
  }

  /**
   * 特定地点の指定年イベントをクリア
   */
  private async clearLocationEvents(locationId: number, year: number): Promise<void> {
    const startDate = timeUtils.getMonthStart(year, 1);
    const endDate = timeUtils.getMonthStart(year + 1, 1);

    const deleteResult = await prisma.locationFujiEvent.deleteMany({
      where: {
        locationId,
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    this.logger.debug('地点別富士現象イベント削除完了', {
      locationId,
      year,
      deletedCount: deleteResult.count
    });
  }

  /**
   * マッチング精度を判定（高精度基準）
   */
  private determineMatchingAccuracy(totalDifference: number): Accuracy {
    if (totalDifference <= this.PERFECT_THRESHOLD) return 'perfect';
    if (totalDifference <= this.EXCELLENT_THRESHOLD) return 'excellent';
    if (totalDifference <= this.GOOD_THRESHOLD) return 'good';
    return 'fair';
  }


  /**
   * CelestialOrbitDataからイベントタイプを決定
   * docs/diamond-pearl-fuji-conditions.mdの条件を考慮
   */
  private determineEventTypeFromCelestialData(celestialData: CelestialOrbitData): EventType {
    if (celestialData.celestialType === 'sun') {
      // ダイヤモンド富士の時間帯条件
      // 昇るダイヤモンド富士: 4:00〜9:59
      // 沈むダイヤモンド富士: 14:00〜19:59
      const hour = celestialData.hour;
      if (hour >= 4 && hour < 10) {
        return 'diamond_sunrise';
      } else if (hour >= 14 && hour < 20) {
        return 'diamond_sunset';
      } else {
        // 時間帯外は適当に判定
        return hour < 12 ? 'diamond_sunrise' : 'diamond_sunset';
      }
    } else {
      // パール富士は時間帯の制限が緩い
      return celestialData.hour < 12 ? 'pearl_moonrise' : 'pearl_moonset';
    }
  }


  /**
   * 富士山の見かけの角度幅を計算
   */
  private calculateFujiApparentWidth(distanceToFuji: number): number {
    const angleRad = 2 * Math.atan(FUJI_SUMMIT_WIDTH / (2 * distanceToFuji));
    return angleRad * 180 / Math.PI;
  }

  /**
   * 高精度ダイヤモンド富士検出
   * 実測値ベース + 太陽視半径考慮 + 理想オフセット適用
   */
  private findEnhancedDiamondFuji(
    celestialData: CelestialOrbitData[],
    location: Location & {
      fujiAzimuth: number;
      fujiElevation: number;
      fujiDistance: number;
    }
  ): {
    data: CelestialOrbitData;
    eventType: EventType;
    qualityScore: number;
    accuracy: Accuracy;
    offsetDiff: number;
    sunBottomElevation: number;
    actualOffset: number;
  } | null {
    const fujiApparentWidth = this.calculateFujiApparentWidth(location.fujiDistance);
    const azimuthTolerance = (fujiApparentWidth / 2) + SUN_RADIUS;

    // 時刻順にソート
    const sortedData = celestialData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    let bestMatch: any = null;
    let minOffsetDiff = Infinity;
    
    for (const data of sortedData) {
      // 厳密な方位角チェック（実測値ベースの非対称フィルタ）
      const azimuthDiff = data.azimuth - location.fujiAzimuth;
      const normalizedAzimuthDiff = this.normalizeAzimuthDifference(azimuthDiff);
      
      // 実測値ベースの範囲制限（-0.52度から+0.08度）
      const AZIMUTH_MIN_OFFSET = -0.52; // 実測値による最小オフセット
      const AZIMUTH_MAX_OFFSET = 0.08;  // 実測値による最大オフセット
      
      if (normalizedAzimuthDiff < AZIMUTH_MIN_OFFSET || normalizedAzimuthDiff > AZIMUTH_MAX_OFFSET) continue;
      
      // 太陽下端の仰角を計算
      const sunBottomElevation = data.elevation - SUN_RADIUS;
      const actualOffset = sunBottomElevation - location.fujiElevation;
      const offsetDiff = Math.abs(actualOffset - IDEAL_OFFSET);
      
      // 理想オフセットとの比較
      if (offsetDiff <= OFFSET_TOLERANCE && offsetDiff < minOffsetDiff) {
        minOffsetDiff = offsetDiff;
        
        // 品質スコア計算（実測値ベース）
        let qualityScore = 0.95; // 実測値ベースの高品質
        
        // オフセット精度による調整
        if (offsetDiff <= this.PERFECT_THRESHOLD) qualityScore = 1.0; // 完璧
        else if (offsetDiff <= this.EXCELLENT_THRESHOLD) qualityScore = 0.98; // 優秀
        else if (offsetDiff <= this.GOOD_THRESHOLD) qualityScore = 0.95; // 良好
        else qualityScore = 0.90; // 標準
        
        // 方位角精度による調整
        if (normalizedAzimuthDiff <= azimuthTolerance * 0.5) {
          qualityScore += 0.02; // 方位角ボーナス
        }
        
        // スコア範囲制限
        qualityScore = Math.max(0.5, Math.min(1.0, qualityScore));
        
        // 精度判定
        const accuracy: Accuracy = 
          offsetDiff <= this.PERFECT_THRESHOLD ? 'perfect' :
          offsetDiff <= this.EXCELLENT_THRESHOLD ? 'excellent' :
          offsetDiff <= this.GOOD_THRESHOLD ? 'good' : 'fair';

        // イベントタイプ決定
        const eventType: EventType = data.hour < 12 ? 'diamond_sunrise' : 'diamond_sunset';
        
        bestMatch = {
          data,
          eventType,
          sunBottomElevation,
          actualOffset,
          offsetDiff,
          azimuthDiff: normalizedAzimuthDiff,
          qualityScore,
          accuracy
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * 地点固有の品質スコアを計算
   */
  private calculateLocationQualityScore(
    azimuthDiff: number,
    altitudeDiff: number,
    baseQuality: string,
    distanceKm: number
  ): number {
    let score = 0.5; // ベーススコア

    // ベース品質による補正
    switch (baseQuality) {
      case 'excellent': score = 0.9; break;
      case 'good': score = 0.7; break;
      case 'fair': score = 0.5; break;
      default: score = 0.3; break;
    }

    // 角度精度による補正
    const anglePrecision = 1 - (azimuthDiff + altitudeDiff) / 4; // 4度で0点
    score *= Math.max(0.1, anglePrecision);

    // 距離による補正（遠すぎる地点は少し減点）
    let distanceMultiplier = 1.0;
    if (distanceKm > 150) {
      distanceMultiplier = Math.max(0.8, 1 - (distanceKm - 150) / 200);
    }
    score *= distanceMultiplier;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * 重複イベントを除去（同日同種で最高品質のみ残す）
   */
  private removeDuplicateEvents(events: FujiEventCandidate[]): FujiEventCandidate[] {
    const groupedEvents = new Map<string, FujiEventCandidate[]>();

    // 日付+現象タイプでグループ化（JST基準）
    for (const event of events) {
      const dateKey = timeUtils.formatDateString(event.eventDate);
      const groupKey = `${dateKey}-${event.eventType}`;

      if (!groupedEvents.has(groupKey)) {
        groupedEvents.set(groupKey, []);
      }
      groupedEvents.get(groupKey)!.push(event);
    }

    // 各グループから最高品質のものを選択
    const uniqueEvents: FujiEventCandidate[] = [];
    for (const [, groupEvents] of groupedEvents) {
      // 品質スコア順でソート
      groupEvents.sort((a, b) => b.qualityScore - a.qualityScore);

      // 最高品質のもののみ採用
      const bestEvent = groupEvents[0];
      uniqueEvents.push(bestEvent);

      // 品質差が僅かで時間が離れている場合は複数採用
      for (let i = 1; i < groupEvents.length; i++) {
        const event = groupEvents[i];
        const qualityDiff = bestEvent.qualityScore - event.qualityScore;
        const timeDiff = Math.abs(bestEvent.eventTime.getTime() - event.eventTime.getTime());

        // 品質差0.1以内かつ時間差2時間以上なら追加採用
        if (qualityDiff <= 0.1 && timeDiff >= 2 * 60 * 60 * 1000) {
          uniqueEvents.push(event);
        }
      }
    }

    return uniqueEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  /**
   * イベントをバッチ挿入
   */
  private async insertEventsBatch(events: FujiEventCandidate[]): Promise<void> {
    if (events.length === 0) return;

    await prisma.locationFujiEvent.createMany({
      data: events.map(event => ({
        locationId: event.locationId,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        eventType: event.eventType,
        azimuth: event.azimuth,
        altitude: event.altitude,
        qualityScore: event.qualityScore,
        accuracy: event.accuracy,
        moonPhase: event.moonPhase,
        moonIllumination: event.moonIllumination,
        calculationYear: event.calculationYear
      })),
      skipDuplicates: true
    });

    this.logger.debug('富士現象イベントバッチ挿入完了', {
      eventCount: events.length
    });
  }

  /**
   * 地点の富士現象イベントを取得（カレンダー表示用）
   */
  async getLocationEvents(
    locationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<LocationFujiEvent[]> {
    return await prisma.locationFujiEvent.findMany({
      where: {
        locationId,
        eventDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { eventDate: 'asc' },
        { eventTime: 'asc' }
      ]
    });
  }

  /**
   * 方位角差を正規化（-180度〜+180度の範囲に調整）
   */
  private normalizeAzimuthDifference(azimuthDiff: number): number {
    if (azimuthDiff > 180) return azimuthDiff - 360;
    if (azimuthDiff < -180) return azimuthDiff + 360;
    return azimuthDiff;
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(year?: number): Promise<{
    totalEvents: number;
    locationCount: number;
    eventTypeDistribution: {
      diamond_sunrise: number;
      diamond_sunset: number;
      pearl_moonrise: number;
      pearl_moonset: number;
    };
    accuracyDistribution: {
      perfect: number;
      excellent: number;
      good: number;
      fair: number;
    };
    avgEventsPerLocation: number;
  }> {
    const whereClause = year ? {
      eventDate: {
        gte: timeUtils.getMonthStart(year, 1),
        lt: timeUtils.getMonthStart(year + 1, 1)
      }
    } : {};

    const [
      totalEvents,
      locationCount,
      diamondSunriseCount,
      diamondSunsetCount,
      pearlMoonriseCount,
      pearlMoonsetCount,
      perfectCount,
      excellentCount,
      goodCount,
      fairCount
    ] = await Promise.all([
      prisma.locationFujiEvent.count({ where: whereClause }),
      prisma.locationFujiEvent.findMany({
        where: whereClause,
        select: { locationId: true },
        distinct: ['locationId']
      }).then(results => results.length),
      prisma.locationFujiEvent.count({ where: { ...whereClause, eventType: 'diamond_sunrise' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, eventType: 'diamond_sunset' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, eventType: 'pearl_moonrise' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, eventType: 'pearl_moonset' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, accuracy: 'perfect' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, accuracy: 'excellent' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, accuracy: 'good' } }),
      prisma.locationFujiEvent.count({ where: { ...whereClause, accuracy: 'fair' } })
    ]);

    return {
      totalEvents,
      locationCount,
      eventTypeDistribution: {
        diamond_sunrise: diamondSunriseCount,
        diamond_sunset: diamondSunsetCount,
        pearl_moonrise: pearlMoonriseCount,
        pearl_moonset: pearlMoonsetCount
      },
      accuracyDistribution: {
        perfect: perfectCount,
        excellent: excellentCount,
        good: goodCount,
        fair: fairCount
      },
      avgEventsPerLocation: locationCount > 0 ? Math.round(totalEvents / locationCount * 10) / 10 : 0
    };
  }
}

export const locationFujiEventService = new LocationFujiEventService();