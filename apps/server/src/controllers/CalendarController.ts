import { Request, Response } from 'express';
import { CalendarServicePrisma } from '../services/CalendarServicePrisma';
import { timeUtils } from '@fuji-calendar/utils';
import { getComponentLogger } from '@fuji-calendar/utils';

export class CalendarController {
  private calendarService: CalendarServicePrisma;
  private logger = getComponentLogger('calendar-controller');

  constructor() {
    this.calendarService = new CalendarServicePrisma();
  }

  // 月間カレンダーデータを取得（キャッシュ対応）
  // GET /api/calendar/:year/:month
  async getMonthlyCalendar(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      // バリデーション
      if (isNaN(year) || isNaN(month)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: '年月の形式が正しくありません。'
        });
      }

      if (year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          error: 'Invalid month',
          message: '月は1から12の間で指定してください。'
        });
      }

      // Prismaベースで直接取得
      this.logger.info('Computing monthly calendar', { year, month });
      const calendarData = await this.calendarService.getMonthlyCalendar(year, month);

      const responseTime = Date.now() - startTime;
      
      // パフォーマンスログ
      this.logger.info('Monthly calendar response', {
        year,
        month,
        responseTimeMs: responseTime,
        eventCount: calendarData.events.reduce((total: number, event: any) => total + event.events.length, 0)
      });
      
      res.json({
        success: true,
        data: {
          year: calendarData.year,
          month: calendarData.month,
          events: calendarData.events.map((event: any) => ({
            date: timeUtils.formatDateString(event.date),
            type: event.type,
            events: event.events.map((fujiEvent: any) => ({
              ...fujiEvent,
              time: timeUtils.formatDateTimeString(fujiEvent.time) // JST時刻として文字列化
            }))
          }))
        },
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Calendar controller error', {
        year: req.params.year,
        month: req.params.month,
        responseTimeMs: responseTime,
        error: error.message
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'カレンダーデータの取得中にエラーが発生しました。'
      });
    }
  }

  // 特定日のイベント詳細を取得（キャッシュ対応）
  // GET /api/events/:date
  async getDayEvents(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const dateString = req.params.date;

      // 日付形式のバリデーション (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateString)) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: '日付はYYYY-MM-DD形式で指定してください。'
        });
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          error: 'Invalid date',
          message: '有効な日付を指定してください。'
        });
      }

      // Prismaベースで直接取得
      this.logger.info('Computing day events', { date: dateString });
      const eventsData = await this.calendarService.getDayEvents(dateString);

      const responseTime = Date.now() - startTime;
      
      // パフォーマンスログ
      this.logger.info('Day events response', {
        date: dateString,
        responseTimeMs: responseTime,
        eventCount: eventsData.events.length
      });
      
      res.json({
        success: true,
        data: {
          date: eventsData.date,
          events: eventsData.events.map((event: any) => ({
            ...event,
            time: timeUtils.formatDateTimeString(event.time) // JST時刻として文字列化
          })),
          weather: eventsData.weather
        },
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Day events controller error', {
        date: req.params.date,
        responseTimeMs: responseTime,
        error: error.message
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'イベントデータの取得中にエラーが発生しました。'
      });
    }
  }

  // 今後のイベントを取得（キャッシュ対応）
  // GET /api/events/upcoming?limit=50
  async getUpcomingEvents(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: 'Invalid limit',
          message: 'limitは1から100の間で指定してください。'
        });
      }

      // Prismaベースで直接取得
      this.logger.info('Computing upcoming events', { limit });
      const events = await this.calendarService.getUpcomingEvents(limit);

      const responseTime = Date.now() - startTime;
      
      // パフォーマンスログ
      this.logger.info('Upcoming events response', {
        limit,
        responseTimeMs: responseTime,
        eventCount: events.length
      });
      
      res.json({
        success: true,
        data: {
          events,
          count: events.length,
          limit
        },
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Upcoming events controller error', {
        limit: req.query.limit,
        responseTimeMs: responseTime,
        error: error.message
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: '今後のイベント取得中にエラーが発生しました。'
      });
    }
  }

  // ベストショットの日を推奨
  // GET /api/calendar/:year/:month/best
  async getBestShotDays(req: Request, res: Response) {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      // バリデーション
      if (isNaN(year) || isNaN(month)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: '年月の形式が正しくありません。'
        });
      }

      if (year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          error: 'Invalid month',
          message: '月は1から12の間で指定してください。'
        });
      }

      const bestDays = await this.calendarService.getBestShotDays(year, month);
      
      res.json({
        success: true,
        data: {
          year,
          month,
          recommendations: bestDays
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      console.error('Best shot days controller error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'おすすめ撮影日の取得中にエラーが発生しました。'
      });
    }
  }

  // 撮影計画のサジェスト
  // POST /api/calendar/suggest
  async getSuggestedPlan(req: Request, res: Response) {
    try {
      const { startDate, endDate, preferredType } = req.body;

      // バリデーション
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Missing parameters',
          message: '開始日と終了日を指定してください。'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date',
          message: '有効な日付を指定してください。'
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: '開始日は終了日より前の日付を指定してください。'
        });
      }

      // 期間は最大30日まで
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        return res.status(400).json({
          error: 'Date range too long',
          message: '期間は最大30日までです。'
        });
      }

      if (preferredType && !['diamond', 'pearl'].includes(preferredType)) {
        return res.status(400).json({
          error: 'Invalid preferred type',
          message: 'preferredTypeは"diamond"または"pearl"を指定してください。'
        });
      }

      const suggestions = await this.calendarService.getSuggestedShootingPlan(
        start, 
        end, 
        preferredType
      );
      
      res.json({
        success: true,
        data: {
          period: {
            startDate: timeUtils.formatDateString(start),
            endDate: timeUtils.formatDateString(end)
          },
          preferredType: preferredType || 'all',
          suggestions,
          count: suggestions.length
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      console.error('Suggested plan controller error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影計画の取得中にエラーが発生しました。'
      });
    }
  }

  // 特定地点の年間イベントを取得
  // GET /api/calendar/location/:locationId/:year
  async getLocationYearlyEvents(req: Request, res: Response) {
    try {
      const locationId = parseInt(req.params.locationId);
      const year = parseInt(req.params.year);

      // バリデーション
      if (isNaN(locationId) || isNaN(year)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'パラメータの形式が正しくありません。'
        });
      }

      if (year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      const events = await this.calendarService.getLocationYearlyEvents(locationId, year);
      
      res.json({
        success: true,
        data: {
          locationId,
          year,
          events,
          count: events.length
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      console.error('Location yearly events controller error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Location not found',
          message: '指定された撮影地点が見つかりません。'
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: '地点別イベントの取得中にエラーが発生しました。'
      });
    }
  }

  // カレンダー統計情報を取得（キャッシュ対応）
  // GET /api/calendar/stats/:year
  async getCalendarStats(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const year = parseInt(req.params.year);

      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は2000年から2100年の間で指定してください。'
        });
      }

      // Prismaベースで直接計算
      this.logger.info('Computing calendar stats', { year });
      
      // 年間統計を計算
      const stats = {
        year,
        totalEvents: 0,
        diamondEvents: 0,
        pearlEvents: 0,
        monthlyBreakdown: [] as any[]
      };

      for (let month = 1; month <= 12; month++) {
        const monthlyData = await this.calendarService.getMonthlyCalendar(year, month);

        const monthEvents = monthlyData.events.reduce((total: number, event: any) => total + event.events.length, 0);
        const monthDiamond = monthlyData.events.reduce((total: number, event: any) => 
          total + event.events.filter((e: any) => e.type === 'diamond').length, 0);
        const monthPearl = monthlyData.events.reduce((total: number, event: any) => 
          total + event.events.filter((e: any) => e.type === 'pearl').length, 0);

        stats.totalEvents += monthEvents;
        stats.diamondEvents += monthDiamond;
        stats.pearlEvents += monthPearl;

        stats.monthlyBreakdown.push({
          month,
          totalEvents: monthEvents,
          diamondEvents: monthDiamond,
          pearlEvents: monthPearl
        });
      }
      
      this.logger.info('Calendar stats computed', { year, totalEvents: stats.totalEvents });

      const responseTime = Date.now() - startTime;
      
      // パフォーマンスログ
      this.logger.info('Calendar stats response', {
        year,
        responseTimeMs: responseTime,
        totalEvents: stats.totalEvents
      });

      res.json({
        success: true,
        data: stats,
        meta: {
          responseTimeMs: responseTime
        },
        timestamp: timeUtils.getCurrentJst()
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Calendar stats controller error', {
        year: req.params.year,
        responseTimeMs: responseTime,
        error: error.message
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: '統計情報の取得中にエラーが発生しました。'
      });
    }
  }
}

export default CalendarController;