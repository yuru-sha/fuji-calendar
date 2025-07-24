import { prisma } from '../database/prisma';
import { LocationFujiEvent, EventType, Accuracy, Location, CelestialOrbitData } from '@prisma/client';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';
// AstronomicalDataService は削除されました

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

  // マッチング精度基準（高精度化）
  private readonly PERFECT_THRESHOLD = 0.3;   // 完璧マッチ（0.3度以内）- より厳密に
  private readonly EXCELLENT_THRESHOLD = 0.7; // 優秀マッチ（0.7度以内）- より厳密に  
  private readonly GOOD_THRESHOLD = 1.2;      // 良好マッチ（1.2度以内）- より厳密に
  private readonly FAIR_THRESHOLD = 2.5;      // 許容マッチ（2.5度以内）- より厳密に

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
   * 地点と天文候補データのマッチング処理
   */
  private async matchLocationWithCandidates(
    location: Location & {
      fujiAzimuth: number;
      fujiElevation: number;
      fujiDistance: number;
    },
    year: number
  ): Promise<FujiEventCandidate[]> {
    
    // 年間の天体軌道データを直接取得
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    this.logger.info('CelestialOrbitDataから富士現象候補を検索', {
      locationId: location.id,
      year,
      startDate,
      endDate,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation
    });

    // celestial_orbit_dataから候補を取得
    const candidates = await prisma.celestialOrbitData.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        visible: true,
        elevation: {
          gte: -5 // 地平線下まで含める（10月の低い太陽位置に対応）
        }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });

    const matchedEvents: FujiEventCandidate[] = [];

    for (const candidate of candidates) {
      // ダイヤモンド富士の条件チェック
      const isDiamondCandidate = this.isDiamondFujiCandidate(candidate, location);
      if (!isDiamondCandidate && candidate.celestialType === 'sun') {
        continue; // ダイヤモンド富士の条件を満たさない太陽データはスキップ
      }

      // 地点の富士山データと候補の天体位置を比較
      const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
      const altitudeDiff = Math.abs(candidate.elevation - location.fujiElevation);
      const totalDiff = Math.sqrt(azimuthDiff ** 2 + altitudeDiff ** 2);

      // 許容範囲内かチェック
      if (totalDiff <= this.FAIR_THRESHOLD) {
        // マッチング精度を判定
        const accuracy = this.determineMatchingAccuracy(totalDiff);

        // 地点固有の品質スコアを計算
        const qualityScore = this.calculateLocationQualityScore(
          azimuthDiff,
          altitudeDiff,
          'good', // CelestialOrbitDataにはqualityフィールドがないため固定値
          location.fujiDistance / 1000 // kmに変換
        );

        // イベントタイプを決定（CelestialOrbitDataの構造に基づく）
        const eventType = this.determineEventTypeFromCelestialData(candidate);

        matchedEvents.push({
          locationId: location.id,
          eventDate: candidate.date,
          eventTime: candidate.time, // CelestialOrbitDataのtimeフィールド
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
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

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
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

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
   * マッチング精度を判定
   */
  private determineMatchingAccuracy(totalDifference: number): Accuracy {
    if (totalDifference <= this.PERFECT_THRESHOLD) return 'perfect';
    if (totalDifference <= this.EXCELLENT_THRESHOLD) return 'excellent';
    if (totalDifference <= this.GOOD_THRESHOLD) return 'good';
    return 'fair';
  }

  /**
   * ダイヤモンド富士候補の条件判定
   * docs/diamond-pearl-fuji-conditions.mdの条件を参考
   */
  private isDiamondFujiCandidate(celestialData: CelestialOrbitData, location: any): boolean {
    if (celestialData.celestialType !== 'sun') {
      return true; // 月（パール富士）は条件を緩く
    }

    const hour = celestialData.hour;
    const azimuth = celestialData.azimuth;

    // 時間帯チェック
    const isValidTime = (hour >= 4 && hour < 10) || (hour >= 14 && hour < 20);
    if (!isValidTime) {
      return false;
    }

    // 方位角チェック（docs条件を参考）
    if (hour >= 4 && hour < 10) {
      // 日の出時: 70-110度付近（富士山の西側）
      if (azimuth < 70 || azimuth > 110) {
        return false;
      }
    } else if (hour >= 14 && hour < 20) {
      // 日没時: 250-280度付近（富士山の東側）
      if (azimuth < 250 || azimuth > 280) {
        return false;
      }
    }

    // 距離チェック（300km以内）
    if (location.fujiDistance > 300000) { // メートル単位
      return false;
    }

    return true;
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
   * イベントタイプを決定（旧版 - 廃止予定）
   */
  private determineEventType(pattern: string, timeOfDay: string): EventType {
    if (pattern === 'diamond') {
      return timeOfDay === 'morning' ? 'diamond_sunrise' : 'diamond_sunset';
    } else {
      return timeOfDay === 'morning' ? 'pearl_moonrise' : 'pearl_moonset';
    }
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

    // 日付+現象タイプでグループ化
    for (const event of events) {
      const dateKey = event.eventDate.toISOString().split('T')[0];
      const groupKey = `${dateKey}-${event.eventType}`;

      if (!groupedEvents.has(groupKey)) {
        groupedEvents.set(groupKey, []);
      }
      groupedEvents.get(groupKey)!.push(event);
    }

    // 各グループから最高品質のものを選択
    const uniqueEvents: FujiEventCandidate[] = [];
    for (const [groupKey, groupEvents] of groupedEvents) {
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
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
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