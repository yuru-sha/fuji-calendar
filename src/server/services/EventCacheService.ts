import { prisma } from '../database/prisma';
import { AstronomicalCalculatorImpl } from './AstronomicalCalculator';
import { Location, FujiEvent } from '../../shared/types';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

/**
 * イベントキャッシュサービス
 * 事前計算されたダイヤモンド・パール富士データの管理
 */
export class EventCacheService {
  private astronomicalCalculator: AstronomicalCalculatorImpl;
  private logger: StructuredLogger;

  constructor() {
    this.astronomicalCalculator = new AstronomicalCalculatorImpl();
    this.logger = getComponentLogger('event-cache-service');
  }

  /**
   * 全地点の年間データを事前計算・保存
   */
  async generateYearlyCache(year: number): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
    error?: Error;
  }> {
    const startTime = Date.now();
    
    try {
      this.logger.info('年間キャッシュ生成開始', { year });

      // 既存データを削除
      await prisma.locationFujiEvent.deleteMany({
        where: { calculationYear: year }
      });

      // 全地点を取得
      const locations = await prisma.location.findMany();
      const locationTyped: Location[] = locations.map(loc => ({
        ...loc,
        description: loc.description || undefined,
        accessInfo: loc.accessInfo || undefined,
        parkingInfo: loc.parkingInfo || undefined,
        fujiAzimuth: loc.fujiAzimuth || undefined,
        fujiElevation: loc.fujiElevation || undefined,
        fujiDistance: loc.fujiDistance || undefined
      }));

      // 年間イベントを計算
      const events = this.astronomicalCalculator.calculateYearlyEvents(year, locationTyped);

      // データベースに保存
      const savedEvents = await Promise.all(
        events.map(event => 
          prisma.locationFujiEvent.create({
            data: {
              locationId: event.location.id,
              eventDate: new Date(event.time.toDateString()),
              eventTime: event.time,
              azimuth: event.azimuth || 0,
              altitude: event.elevation || 0,
              qualityScore: this.getQualityScore(event.accuracy),
              moonPhase: event.moonPhase,
              moonIllumination: event.moonIllumination,
              calculationYear: year,
              eventType: this.getEventType(event),
              accuracy: this.mapAccuracy(event.accuracy)
            }
          })
        )
      );

      const endTime = Date.now();
      
      this.logger.info('年間キャッシュ生成完了', {
        year,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime
      };

    } catch (error) {
      this.logger.error('年間キャッシュ生成エラー', error, { year });
      return {
        success: false,
        totalEvents: 0,
        timeMs: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * 単一地点の年間データを生成・保存（地点登録時用）
   */
  async generateLocationCache(locationId: number, year: number): Promise<{
    success: boolean;
    totalEvents: number;
    timeMs: number;
  }> {
    const startTime = Date.now();

    try {
      this.logger.info('地点キャッシュ生成開始', { locationId, year });

      // 地点情報を取得
      const location = await prisma.location.findUnique({
        where: { id: locationId }
      });

      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      const locationTyped: Location = {
        ...location,
        description: location.description || undefined,
        accessInfo: location.accessInfo || undefined,
        parkingInfo: location.parkingInfo || undefined,
        fujiAzimuth: location.fujiAzimuth || undefined,
        fujiElevation: location.fujiElevation || undefined,
        fujiDistance: location.fujiDistance || undefined
      };

      // 既存データを削除
      await prisma.locationFujiEvent.deleteMany({
        where: { 
          locationId: locationId,
          calculationYear: year 
        }
      });

      // 年間イベントを計算
      const events = this.astronomicalCalculator.calculateLocationYearlyEvents(year, locationTyped);

      // データベースに保存
      const savedEvents = await Promise.all(
        events.map(event => 
          prisma.locationFujiEvent.create({
            data: {
              locationId: event.location.id,
              eventDate: new Date(event.time.toDateString()),
              eventTime: event.time,
              azimuth: event.azimuth || 0,
              altitude: event.elevation || 0,
              qualityScore: this.getQualityScore(event.accuracy),
              moonPhase: event.moonPhase,
              moonIllumination: event.moonIllumination,
              calculationYear: year,
              eventType: this.getEventType(event),
              accuracy: this.mapAccuracy(event.accuracy)
            }
          })
        )
      );

      const endTime = Date.now();
      
      this.logger.info('地点キャッシュ生成完了', {
        locationId,
        year,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime
      });

      return {
        success: true,
        totalEvents: savedEvents.length,
        timeMs: endTime - startTime
      };

    } catch (error) {
      this.logger.error('地点キャッシュ生成エラー', error, { locationId, year });
      throw error;
    }
  }

  /**
   * 精度レベルから品質スコアを計算
   */
  private getQualityScore(accuracy?: 'perfect' | 'excellent' | 'good' | 'fair'): number {
    switch (accuracy) {
      case 'perfect': return 1.0;
      case 'excellent': return 0.8;
      case 'good': return 0.6;
      case 'fair': return 0.4;
      default: return 0.0;
    }
  }

  /**
   * イベントタイプをEnum値にマッピング
   */
  private getEventType(event: FujiEvent): 'diamond_sunrise' | 'diamond_sunset' | 'pearl_moonrise' | 'pearl_moonset' {
    if (event.type === 'diamond') {
      return event.subType === 'sunrise' ? 'diamond_sunrise' : 'diamond_sunset';
    } else {
      return event.subType === 'rising' ? 'pearl_moonrise' : 'pearl_moonset';
    }
  }

  /**
   * 精度レベルをEnum値にマッピング
   */
  private mapAccuracy(accuracy?: 'perfect' | 'excellent' | 'good' | 'fair'): 'perfect' | 'excellent' | 'good' | 'fair' | null {
    switch (accuracy) {
      case 'perfect': return 'perfect';
      case 'excellent': return 'excellent';
      case 'good': return 'good';
      case 'fair': return 'fair';
      default: return null;
    }
  }
}

export const eventCacheService = new EventCacheService();