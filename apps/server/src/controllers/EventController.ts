import { Request, Response } from 'express';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '@fuji-calendar/utils';
import { FujiEvent, CalendarEvent } from '@fuji-calendar/types';

const logger = getComponentLogger('EventController');

export class EventController {
  private prisma = PrismaClientManager.getInstance();

  /**
   * 月間カレンダーデータを取得
   */
  async getMonthlyCalendar(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          message: '有効な年月を指定してください。'
        });
        return;
      }

      // 月の開始日と終了日を計算
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // イベントデータを取得
      const events = await this.prisma.locationFujiEvent.findMany({
        where: {
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          location: true
        },
        orderBy: [
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      // 日付ごとにグループ化
      const eventsByDate = new Map<string, FujiEvent[]>();
      
      events.forEach(event => {
        const dateKey = event.eventDate.toISOString().split('T')[0];
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        
        eventsByDate.get(dateKey)!.push(this.formatEvent(event));
      });

      // CalendarEvent形式に変換
      const calendarEvents: CalendarEvent[] = [];
      eventsByDate.forEach((dayEvents, dateStr) => {
        const types = new Set(dayEvents.map(e => e.type));
        const eventType = types.size > 1 ? 'both' : 
                         types.has('diamond') ? 'diamond' : 'pearl';

        calendarEvents.push({
          date: new Date(dateStr),
          type: eventType as 'diamond' | 'pearl' | 'both',
          events: dayEvents
        });
      });

      logger.info('月間カレンダー取得成功', {
        year,
        month,
        eventCount: events.length,
        daysWithEvents: calendarEvents.length
      });

      res.json({
        success: true,
        year,
        month,
        events: calendarEvents,
        totalEvents: events.length
      });
    } catch (error) {
      logger.error('月間カレンダー取得エラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'カレンダーデータの取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 特定日のイベントを取得
   */
  async getDayEvents(req: Request, res: Response): Promise<void> {
    try {
      const dateStr = req.params.date;
      const targetDate = new Date(dateStr);

      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date',
          message: '有効な日付を指定してください。(YYYY-MM-DD形式)'
        });
        return;
      }

      // その日のイベントを取得
      const events = await this.prisma.locationFujiEvent.findMany({
        where: {
          eventDate: targetDate
        },
        include: {
          location: true
        },
        orderBy: [
          { eventTime: 'asc' },
          { location: { name: 'asc' } }
        ]
      });

      const formattedEvents = events.map(event => this.formatEvent(event));

      logger.info('日別イベント取得成功', {
        date: dateStr,
        eventCount: events.length
      });

      res.json({
        success: true,
        date: dateStr,
        events: formattedEvents,
        count: events.length
      });
    } catch (error) {
      logger.error('日別イベント取得エラー', error, {
        date: req.params.date
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'イベントデータの取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 今後のイベントを取得
   */
  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const events = await this.prisma.locationFujiEvent.findMany({
        where: {
          eventDate: {
            gte: today
          }
        },
        include: {
          location: true
        },
        orderBy: [
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ],
        take: limit
      });

      const formattedEvents = events.map(event => this.formatEvent(event));

      logger.info('今後のイベント取得成功', {
        eventCount: events.length,
        limit
      });

      res.json({
        success: true,
        events: formattedEvents,
        count: events.length,
        limit
      });
    } catch (error) {
      logger.error('今後のイベント取得エラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '今後のイベント取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 特定地点の年間イベントを取得
   */
  async getLocationYearlyEvents(req: Request, res: Response): Promise<void> {
    try {
      const locationId = parseInt(req.params.locationId);
      const year = parseInt(req.params.year);

      if (isNaN(locationId) || isNaN(year)) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          message: '有効な地点IDと年を指定してください。'
        });
        return;
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const events = await this.prisma.locationFujiEvent.findMany({
        where: {
          locationId,
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          location: true
        },
        orderBy: [
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      const formattedEvents = events.map(event => this.formatEvent(event));

      logger.info('地点年間イベント取得成功', {
        locationId,
        year,
        eventCount: events.length
      });

      res.json({
        success: true,
        locationId,
        year,
        events: formattedEvents,
        count: events.length
      });
    } catch (error) {
      logger.error('地点年間イベント取得エラー', error, {
        locationId: req.params.locationId,
        year: req.params.year
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '地点の年間イベント取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * カレンダー統計情報を取得
   */
  async getCalendarStats(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.params.year);

      if (isNaN(year)) {
        res.status(400).json({
          success: false,
          error: 'Invalid year',
          message: '有効な年を指定してください。'
        });
        return;
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // 年間統計
      const totalEvents = await this.prisma.locationFujiEvent.count({
        where: {
          eventDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const diamondEvents = await this.prisma.locationFujiEvent.count({
        where: {
          eventDate: {
            gte: startDate,
            lte: endDate
          },
          eventType: {
            in: ['diamond_sunrise', 'diamond_sunset']
          }
        }
      });

      const pearlEvents = await this.prisma.locationFujiEvent.count({
        where: {
          eventDate: {
            gte: startDate,
            lte: endDate
          },
          eventType: {
            in: ['pearl_moonrise', 'pearl_moonset']
          }
        }
      });

      // 月別統計
      const monthlyBreakdown = [];
      for (let month = 1; month <= 12; month++) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const monthTotal = await this.prisma.locationFujiEvent.count({
          where: {
            eventDate: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });

        const monthDiamond = await this.prisma.locationFujiEvent.count({
          where: {
            eventDate: {
              gte: monthStart,
              lte: monthEnd
            },
            eventType: {
              in: ['diamond_sunrise', 'diamond_sunset']
            }
          }
        });

        const monthPearl = await this.prisma.locationFujiEvent.count({
          where: {
            eventDate: {
              gte: monthStart,
              lte: monthEnd
            },
            eventType: {
              in: ['pearl_moonrise', 'pearl_moonset']
            }
          }
        });

        monthlyBreakdown.push({
          month,
          totalEvents: monthTotal,
          diamondEvents: monthDiamond,
          pearlEvents: monthPearl
        });
      }

      logger.info('カレンダー統計取得成功', {
        year,
        totalEvents,
        diamondEvents,
        pearlEvents
      });

      res.json({
        success: true,
        year,
        totalEvents,
        diamondEvents,
        pearlEvents,
        monthlyBreakdown
      });
    } catch (error) {
      logger.error('カレンダー統計取得エラー', error, {
        year: req.params.year
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'カレンダー統計の取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * Prismaの LocationFujiEvent を API の FujiEvent 型に変換
   */
  private formatEvent(event: any): FujiEvent {
    // eventTypeを変換
    const getEventTypeAndSubType = (eventType: string) => {
      switch (eventType) {
        case 'diamond_sunrise':
          return { type: 'diamond' as const, subType: 'sunrise' as const };
        case 'diamond_sunset':
          return { type: 'diamond' as const, subType: 'sunset' as const };
        case 'pearl_moonrise':
          return { type: 'pearl' as const, subType: 'rising' as const };
        case 'pearl_moonset':
          return { type: 'pearl' as const, subType: 'setting' as const };
        default:
          return { type: 'diamond' as const, subType: 'sunrise' as const };
      }
    };

    const { type, subType } = getEventTypeAndSubType(event.eventType);

    return {
      id: event.id.toString(),
      type,
      subType,
      time: event.eventTime,
      location: {
        id: event.location.id,
        name: event.location.name,
        prefecture: event.location.prefecture,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        elevation: event.location.elevation,
        description: event.location.description,
        accessInfo: event.location.accessInfo,
        parkingInfo: event.location.parkingInfo,
        fujiAzimuth: event.location.fujiAzimuth,
        fujiElevation: event.location.fujiElevation,
        fujiDistance: event.location.fujiDistance,
        createdAt: event.location.createdAt,
        updatedAt: event.location.updatedAt
      },
      azimuth: event.azimuth,
      elevation: event.altitude,
      qualityScore: event.qualityScore,
      accuracy: event.accuracy as 'perfect' | 'excellent' | 'good' | 'fair' | undefined,
      moonPhase: event.moonPhase,
      moonIllumination: event.moonIllumination
    };
  }
}

export default EventController;