import { Request, Response } from 'express';
import { CalendarService } from '../services/interfaces/CalendarService';
import { timeUtils } from '@fuji-calendar/utils';
import { getComponentLogger } from '@fuji-calendar/utils';

export class CalendarControllerRefactored {
  private logger = getComponentLogger('calendar-controller');

  constructor(private calendarService: CalendarService) {}

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

      if (year < 2020 || year > 2030) {
        return res.status(400).json({
          error: 'Invalid year range',
          message: '年は 2020 年から 2030 年の範囲で指定してください。'
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          error: 'Invalid month range',
          message: '月は 1 から 12 の範囲で指定してください。'
        });
      }

      this.logger.info('月間カレンダー取得リクエスト', { year, month });

      const result = await this.calendarService.getMonthlyCalendar(year, month);

      const processingTime = Date.now() - startTime;
      this.logger.info('月間カレンダー取得完了', { 
        year, 
        month, 
        eventDays: result.events.length,
        processingTime
      });

      res.json(result);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('月間カレンダー取得エラー', { 
        year: req.params.year,
        month: req.params.month,
        error,
        processingTime
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'カレンダーデータの取得に失敗しました。'
      });
    }
  }

  // 日別イベント取得
  // GET /api/events/:date
  async getDayEvents(req: Request, res: Response) {
    try {
      const { date } = req.params;

      // 日付形式の簡易バリデーション
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: '日付は YYYY-MM-DD 形式で指定してください。'
        });
      }

      this.logger.info('日別イベント取得リクエスト', { date });

      const result = await this.calendarService.getDayEvents(date);

      this.logger.info('日別イベント取得完了', { 
        date, 
        eventCount: result.events.length 
      });

      res.json(result);
    } catch (error) {
      this.logger.error('日別イベント取得エラー', { 
        date: req.params.date, 
        error 
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'イベントデータの取得に失敗しました。'
      });
    }
  }

  // 今後のイベント取得
  // GET /api/events/upcoming
  async getUpcomingEvents(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      if (limit > 200) {
        return res.status(400).json({
          error: 'Invalid limit',
          message: 'リミットは 200 以下で指定してください。'
        });
      }

      this.logger.info('今後のイベント取得リクエスト', { limit });

      const events = await this.calendarService.getUpcomingEvents(limit);

      this.logger.info('今後のイベント取得完了', { 
        limit, 
        eventCount: events.length 
      });

      res.json({ events });
    } catch (error) {
      this.logger.error('今後のイベント取得エラー', { error });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: '今後のイベントデータの取得に失敗しました。'
      });
    }
  }

  // 地点別年間イベント取得
  // GET /api/calendar/location/:locationId/:year
  async getLocationYearlyEvents(req: Request, res: Response) {
    try {
      const locationId = parseInt(req.params.locationId);
      const year = parseInt(req.params.year);

      if (isNaN(locationId) || isNaN(year)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'locationId と year は数値で指定してください。'
        });
      }

      if (year < 2020 || year > 2030) {
        return res.status(400).json({
          error: 'Invalid year range',
          message: '年は 2020 年から 2030 年の範囲で指定してください。'
        });
      }

      this.logger.info('地点別年間イベント取得リクエスト', { locationId, year });

      const events = await this.calendarService.getLocationYearlyEvents(locationId, year);

      this.logger.info('地点別年間イベント取得完了', { 
        locationId, 
        year, 
        eventCount: events.length 
      });

      res.json({ events });
    } catch (error) {
      this.logger.error('地点別年間イベント取得エラー', { 
        locationId: req.params.locationId,
        year: req.params.year,
        error 
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: '地点別イベントデータの取得に失敗しました。'
      });
    }
  }

  // カレンダー統計情報取得
  // GET /api/calendar/stats/:year
  async getCalendarStats(req: Request, res: Response) {
    try {
      const year = parseInt(req.params.year);

      if (isNaN(year)) {
        return res.status(400).json({
          error: 'Invalid year',
          message: '年は数値で指定してください。'
        });
      }

      if (year < 2020 || year > 2030) {
        return res.status(400).json({
          error: 'Invalid year range',
          message: '年は 2020 年から 2030 年の範囲で指定してください。'
        });
      }

      this.logger.info('カレンダー統計情報取得リクエスト', { year });

      const stats = await this.calendarService.getCalendarStats(year);

      this.logger.info('カレンダー統計情報取得完了', { year, stats });

      res.json(stats);
    } catch (error) {
      this.logger.error('カレンダー統計情報取得エラー', { 
        year: req.params.year,
        error 
      });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: '統計情報の取得に失敗しました。'
      });
    }
  }
}