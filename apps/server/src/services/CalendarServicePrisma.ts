import { CalendarEvent, CalendarResponse, EventsResponse, FujiEvent, WeatherInfo, Location } from '@fuji-calendar/types';
import { PrismaClient, LocationEvent } from '@prisma/client';
import { PrismaClientManager } from '../database/prisma';
import { AstronomicalCalculatorImpl } from './AstronomicalCalculator';
import { EventAggregationService } from './EventAggregationService';
import { WeatherService, weatherService } from './WeatherService';
import { EventCacheService } from './EventCacheService';
import { timeUtils } from '@fuji-calendar/utils';
import { getComponentLogger, StructuredLogger } from '@fuji-calendar/utils';

/**
 * Prisma ベースの新しいカレンダーサービス
 * 事前計算されたデータベースからイベントを取得し、リアルタイム計算を置き換える
 */
export class CalendarServicePrisma {
  private logger: StructuredLogger;
  private eventCacheService: EventCacheService;
  private prisma = PrismaClientManager.getInstance();

  constructor() {
    this.logger = getComponentLogger('calendar-service-prisma');
    this.eventCacheService = new EventCacheService();
  }

  /**
   * 月間カレンダーデータを取得（事前計算データベースから）
   */
  async getMonthlyCalendar(year: number, month: number): Promise<CalendarResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('月間カレンダー取得開始（Prisma ベース）', { year, month });
      
      // 月の範囲を計算
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // カレンダー表示範囲の計算（前月末〜翌月初を含む）
      const calendarStartDate = new Date(startDate);
      calendarStartDate.setDate(calendarStartDate.getDate() - calendarStartDate.getDay());
      
      const calendarEndDate = new Date(endDate);
      calendarEndDate.setDate(calendarEndDate.getDate() + (6 - calendarEndDate.getDay()));
      
      // 全地点の富士現象イベントを取得
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany();
      const allEvents: FujiEvent[] = [];
      
      this.logger.debug('カレンダー表示範囲でのイベント取得', { 
        year, 
        month, 
        locationCount: locations.length,
        startDate: timeUtils.formatDateString(calendarStartDate),
        endDate: timeUtils.formatDateString(calendarEndDate)
      });
      
      // 各地点からイベントを取得（Prisma 直接アクセス）
      for (const location of locations) {
        const locationEvents = await this.prisma.locationEvent.findMany({
          where: {
            locationId: location.id,
            eventTime: {
              gte: calendarStartDate,
              lte: calendarEndDate
            }
          },
          orderBy: {
            eventTime: 'asc'
          }
        });
        
        // LocationEvent を FujiEvent に変換
        const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
        allEvents.push(...convertedEvents);
      }
      
      // 日付ごとにイベントをグループ化
      const calendarEvents = this.groupEventsByDate(allEvents);
      
      const responseTime = Date.now() - startTime;
      this.logger.info('月間カレンダー取得完了（Prisma ベース）', {
        year,
        month,
        locationCount: locations.length,
        totalEvents: allEvents.length,
        calendarEvents: calendarEvents.length,
        responseTimeMs: responseTime
      });
      
      return {
        year,
        month,
        events: calendarEvents
      };
      
    } catch (error) {
      this.logger.error('月間カレンダー取得エラー（Prisma ベース）', error, {
        year,
        month
      });
      
      // フォールバック：空のカレンダーを返す
      return {
        year,
        month,
        events: []
      };
    }
  }

  /**
   * 特定日のイベント詳細を取得（事前計算データベースから）
   */
  async getDayEvents(dateString: string): Promise<EventsResponse> {
    const startTime = Date.now();
    const date = new Date(dateString);
    
    try {
      this.logger.info('日次イベント取得開始（Prisma ベース）', { dateString });
      
      // 日の開始と終了時刻を設定
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // 全地点の富士現象イベントを取得
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany();
      const allEvents: FujiEvent[] = [];
      
      // 各地点からその日のイベントを取得（Prisma 直接アクセス）
      for (const location of locations) {
        const locationEvents = await this.prisma.locationEvent.findMany({
          where: {
            locationId: location.id,
            eventTime: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          orderBy: {
            eventTime: 'asc'
          }
        });
        
        // LocationEvent を FujiEvent に変換
        const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
        allEvents.push(...convertedEvents);
      }
      
      // 時刻順にソート
      allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
      
      // 天気情報を取得（OpenMeteo API 使用）
      const weather = await this.getWeatherInfo(date);
      
      const responseTime = Date.now() - startTime;
      this.logger.info('日次イベント取得完了（Prisma ベース）', {
        dateString,
        eventCount: allEvents.length,
        responseTimeMs: responseTime
      });
      
      return {
        date: dateString,
        events: allEvents,
        weather
      };
      
    } catch (error) {
      this.logger.error('日次イベント取得エラー（Prisma ベース）', error, { dateString });
      
      // フォールバック：空のイベントリストを返す
      return {
        date: dateString,
        events: [],
        weather: undefined
      };
    }
  }

  /**
   * 今後のイベントを取得（次の 30 日分）
   */
  async getUpcomingEvents(limit: number = 50): Promise<FujiEvent[]> {
    const now = timeUtils.getCurrentJst();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    try {
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany();
      const allEvents: FujiEvent[] = [];

      // 各地点から今後のイベントを取得（Prisma 直接アクセス）
      for (const location of locations) {
        const locationEvents = await this.prisma.locationEvent.findMany({
          where: {
            locationId: location.id,
            eventTime: {
              gte: now,
              lte: endDate
            }
          },
          orderBy: {
            eventTime: 'asc'
          }
        });
        
        // LocationEvent を FujiEvent に変換
        const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
        allEvents.push(...convertedEvents);
      }

      // 未来のイベントのみをフィルタリング
      const futureEvents = allEvents.filter(event => event.time > now);
      
      // 時刻順にソートして limit 件まで返す
      return futureEvents
        .sort((a, b) => a.time.getTime() - b.time.getTime())
        .slice(0, limit);
        
    } catch (error) {
      this.logger.error('今後のイベント取得エラー', error, { limit });
      return [];
    }
  }

  /**
   * 特定地点の年間イベントを取得
   */
  async getLocationYearlyEvents(locationId: number, year: number): Promise<FujiEvent[]> {
    try {
      const prisma = PrismaClientManager.getInstance();
      const location = await prisma.location.findUnique({
        where: { id: locationId }
      });
      if (!location) {
        throw new Error('Location not found');
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const locationEvents = await this.prisma.locationEvent.findMany({
        where: {
          locationId: locationId,
          eventTime: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          eventTime: 'asc'
        }
      });

      // LocationFujiEvent を FujiEvent に変換
      const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
      
      return convertedEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
      
    } catch (error) {
      this.logger.error('地点年間イベント取得エラー', error, { locationId, year });
      throw error;
    }
  }

  /**
   * ベストショットの日を推奨
   */
  async getBestShotDays(year: number, month: number): Promise<FujiEvent[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany();
      const allEvents: FujiEvent[] = [];

      // 各地点からその月のイベントを取得（Prisma 直接アクセス）
      for (const location of locations) {
        const locationEvents = await this.prisma.locationEvent.findMany({
          where: {
            locationId: location.id,
            eventTime: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            eventTime: 'asc'
          }
        });
        
        // LocationEvent を FujiEvent に変換
        const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
        allEvents.push(...convertedEvents);
      }

      // 条件の良いイベントを抽出（高精度のもの）
      const bestEvents = allEvents.filter(event => {
        // Prisma の accuracy フィールドを使用
        return event.accuracy && ['perfect', 'excellent', 'good'].includes(event.accuracy);
      });

      // 品質スコアでソート
      return bestEvents
        .sort((a, b) => this.calculateEventScore(b) - this.calculateEventScore(a))
        .slice(0, 10);
        
    } catch (error) {
      this.logger.error('ベストショット日取得エラー', error, { year, month });
      return [];
    }
  }

  /**
   * 撮影計画のサジェスト
   */
  async getSuggestedShootingPlan(
    startDate: Date, 
    endDate: Date, 
    preferredType?: 'diamond' | 'pearl'
  ): Promise<FujiEvent[]> {
    try {
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany();
      const allEvents: FujiEvent[] = [];

      // 各地点から期間内のイベントを取得（Prisma 直接アクセス）
      for (const location of locations) {
        const locationEvents = await this.prisma.locationEvent.findMany({
          where: {
            locationId: location.id,
            eventTime: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            eventTime: 'asc'
          }
        });
        
        // LocationEvent を FujiEvent に変換
        const convertedEvents = locationEvents.map(event => this.convertToFujiEvent(event, location));
        allEvents.push(...convertedEvents);
      }

      // タイプフィルタリング
      let filteredEvents = allEvents;
      if (preferredType) {
        filteredEvents = allEvents.filter(event => event.type === preferredType);
      }

      // スコアでソートして上位を返す
      return filteredEvents
        .sort((a, b) => this.calculateEventScore(b) - this.calculateEventScore(a))
        .slice(0, 20);
        
    } catch (error) {
      this.logger.error('撮影計画サジェスト取得エラー', error, { startDate, endDate, preferredType });
      return [];
    }
  }

  /**
   * LocationEvent を FujiEvent に変換
   */
  private convertToFujiEvent(event: LocationEvent, location: Location): FujiEvent {
    // EventType を FujiEvent の type と subType に変換
    let type: 'diamond' | 'pearl';
    let subType: 'sunrise' | 'sunset' | 'rising' | 'setting';

    switch (event.eventType) {
      case 'diamond_sunrise':
        type = 'diamond';
        subType = 'sunrise';
        break;
      case 'diamond_sunset':
        type = 'diamond';
        subType = 'sunset';
        break;
      case 'pearl_moonrise':
        type = 'pearl';
        subType = 'rising';
        break;
      case 'pearl_moonset':
        type = 'pearl';
        subType = 'setting';
        break;
      default:
        type = 'diamond';
        subType = 'sunrise';
    }

    return {
      id: `${event.eventType}-${event.locationId}-${event.eventDate.toISOString().split('T')[0]}`,
      type,
      subType,
      time: event.eventTime,
      location,
      azimuth: event.azimuth,
      elevation: event.altitude,
      qualityScore: event.qualityScore,
      accuracy: event.accuracy || undefined,
      moonPhase: event.moonPhase || undefined,
      moonIllumination: event.moonIllumination || undefined
    };
  }

  /**
   * イベントを日付ごとにグループ化（JST 基準）
   */
  private groupEventsByDate(events: FujiEvent[]): CalendarEvent[] {
    const eventsByDate = new Map<string, FujiEvent[]>();

    events.forEach(event => {
      const dateKey = timeUtils.formatDateString(event.time);
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    const calendarEvents: CalendarEvent[] = [];
    eventsByDate.forEach((dayEvents, dateString) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // イベントタイプを判定
      const hasDiamond = dayEvents.some(e => e.type === 'diamond');
      const hasPearl = dayEvents.some(e => e.type === 'pearl');
      
      let type: 'diamond' | 'pearl' | 'both';
      if (hasDiamond && hasPearl) {
        type = 'both';
      } else if (hasDiamond) {
        type = 'diamond';
      } else {
        type = 'pearl';
      }

      calendarEvents.push({
        date,
        type,
        events: dayEvents.sort((a, b) => a.time.getTime() - b.time.getTime())
      });
    });

    return calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * イベントの評価スコアを計算
   */
  private calculateEventScore(event: FujiEvent): number {
    let score = 0;

    // 品質スコアがあれば使用
    if (event.qualityScore) {
      score += event.qualityScore * 100;
    }

    // accuracy による評価
    if (event.accuracy) {
      switch (event.accuracy) {
        case 'perfect': score += 50; break;
        case 'excellent': score += 40; break;
        case 'good': score += 30; break;
        case 'fair': score += 20; break;
      }
    }

    // 高度による評価（適度な高度が良い）
    if (event.elevation) {
      if (event.elevation >= 2 && event.elevation <= 10) {
        score += 30;
      } else if (event.elevation >= 1 && event.elevation <= 15) {
        score += 20;
      } else if (event.elevation > 0) {
        score += 10;
      }
    }

    // 時刻による評価（早朝・夕方が撮影しやすい）
    const hour = event.time.getHours();
    if ((hour >= 5 && hour <= 7) || (hour >= 16 && hour <= 18)) {
      score += 20;
    } else if ((hour >= 4 && hour <= 8) || (hour >= 15 && hour <= 19)) {
      score += 10;
    }

    // アクセス性による評価（標高が低い方がアクセスしやすい）
    if (event.location.elevation < 500) {
      score += 15;
    } else if (event.location.elevation < 1000) {
      score += 10;
    } else if (event.location.elevation < 1500) {
      score += 5;
    }

    // 撮影タイプによる評価
    if (event.type === 'diamond') {
      score += 5;
    }

    return score;
  }

  /**
   * 天気情報を取得（OpenMeteo API 使用）
   */
  private async getWeatherInfo(date: Date): Promise<WeatherInfo | undefined> {
    // 海ほたる PA の座標を使用（将来的には地点ごとに取得可能）
    const latitude = 35.464815;
    const longitude = 139.872861;
    
    return await weatherService.getWeatherInfo(latitude, longitude, date);
  }

  /**
   * システムの健康状態をチェック
   */
  async checkSystemHealth(year: number = new Date().getFullYear()) {
    try {
      const prisma = PrismaClientManager.getInstance();
      
      // データベース接続チェック
      await prisma.$queryRaw`SELECT 1`;
      
      // 年間データ存在チェック
      const eventCount = await prisma.locationEvent.count({
        where: { calculationYear: year }
      });
      
      // 地点数チェック
      const locationCount = await prisma.location.count();
      
      return {
        healthy: true,
        year,
        eventCount,
        locationCount,
        recommendations: eventCount === 0 && locationCount > 0 ? 
          ['地点データはありますがイベントデータがありません。年間キャッシュを生成してください。'] : []
      };
    } catch (error) {
      return {
        healthy: false,
        year,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['データベース接続を確認してください。']
      };
    }
  }

  /**
   * 年次データ計算を実行
   */
  async executeYearlyCalculation(year: number) {
    return await this.eventCacheService.generateYearlyCache(year);
  }

  /**
   * 新地点追加時の計算を実行
   */
  async executeLocationAddCalculation(locationId: number, year: number) {
    return await this.eventCacheService.generateLocationCache(locationId, year);
  }
}

// シングルトンインスタンスをエクスポート
export const calendarServicePrisma = new CalendarServicePrisma();