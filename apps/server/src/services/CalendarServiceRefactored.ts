import { FujiEvent, CalendarStats, WeatherInfo } from '@fuji-calendar/types';
import { CalendarService } from './interfaces/CalendarService';
import { CalendarRepository } from '../repositories/interfaces/CalendarRepository';
import { getComponentLogger, timeUtils } from '@fuji-calendar/utils';

const logger = getComponentLogger('calendar-service');

export class CalendarServiceImpl implements CalendarService {
  constructor(private calendarRepository: CalendarRepository) {}

  async getMonthlyCalendar(year: number, month: number): Promise<{
    year: number;
    month: number;
    events: Array<{
      date: string;
      type: string;
      events: FujiEvent[];
    }>;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('月間カレンダーデータ取得開始', { year, month });

      const events = await this.calendarRepository.getMonthlyEvents(year, month);
      
      // カレンダーの日付範囲を動的に計算
      const monthStartDate = new Date(year, month - 1, 1);
      const monthEndDate = new Date(year, month, 0);
      
      // カレンダーの開始日（月初の週の日曜日）
      const calendarStartDate = new Date(monthStartDate);
      calendarStartDate.setDate(calendarStartDate.getDate() - calendarStartDate.getDay());
      
      // カレンダーの終了日（月末が含まれる週の土曜日）
      const calendarEndDate = new Date(monthEndDate);
      calendarEndDate.setDate(calendarEndDate.getDate() + (6 - calendarEndDate.getDay()));
      
      // 日付ごとにイベントをグループ化
      const eventsByDate = new Map<string, FujiEvent[]>();
      events.forEach(event => {
        const dateStr = timeUtils.formatDateString(new Date(event.time));
        if (!eventsByDate.has(dateStr)) {
          eventsByDate.set(dateStr, []);
        }
        eventsByDate.get(dateStr)!.push(event);
      });

      // 42 日分すべての日付に対してレスポンスを作成
      const responseEvents = [];
      const currentDate = new Date(calendarStartDate);
      
      while (currentDate <= calendarEndDate) {
        const dateStr = timeUtils.formatDateString(currentDate);
        const dayEvents = eventsByDate.get(dateStr) || [];
        
        responseEvents.push({
          date: dateStr,
          type: dayEvents.length > 0 ? this.determineEventType(dayEvents) : 'diamond',
          events: dayEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const processingTime = Date.now() - startTime;
      logger.info('月間カレンダーデータ取得完了', {
        year,
        month,
        eventDays: responseEvents.length,
        totalEvents: events.length,
        processingTime
      });

      return {
        year,
        month,
        events: responseEvents, // 既にソート済み（日付順）
      };
    } catch (error) {
      logger.error('月間カレンダーデータ取得エラー', { year, month, error });
      throw error;
    }
  }

  async getDayEvents(date: string): Promise<{ events: FujiEvent[] }> {
    try {
      logger.info('日別イベント取得開始', { date });

      const events = await this.calendarRepository.getDayEvents(date);
      
      // 時刻順でソート
      const sortedEvents = events.sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      logger.info('日別イベント取得完了', { 
        date, 
        eventCount: sortedEvents.length 
      });

      return { events: sortedEvents };
    } catch (error) {
      logger.error('日別イベント取得エラー', { date, error });
      throw error;
    }
  }

  async getUpcomingEvents(limit: number = 50): Promise<FujiEvent[]> {
    try {
      logger.info('今後のイベント取得開始', { limit });

      const events = await this.calendarRepository.getUpcomingEvents(limit);

      logger.info('今後のイベント取得完了', { 
        eventCount: events.length,
        limit 
      });

      return events;
    } catch (error) {
      logger.error('今後のイベント取得エラー', { limit, error });
      throw error;
    }
  }

  async getLocationYearlyEvents(locationId: number, year: number): Promise<FujiEvent[]> {
    try {
      logger.info('地点別年間イベント取得開始', { locationId, year });

      const events = await this.calendarRepository.getLocationYearlyEvents(locationId, year);

      logger.info('地点別年間イベント取得完了', {
        locationId,
        year,
        eventCount: events.length
      });

      return events;
    } catch (error) {
      logger.error('地点別年間イベント取得エラー', { locationId, year, error });
      throw error;
    }
  }

  async getCalendarStats(year: number): Promise<CalendarStats> {
    try {
      logger.info('カレンダー統計情報取得開始', { year });

      const stats = await this.calendarRepository.getCalendarStats(year);

      logger.info('カレンダー統計情報取得完了', {
        year,
        stats: {
          totalEvents: stats.totalEvents,
          diamondEvents: stats.diamondEvents,
          pearlEvents: stats.pearlEvents,
          activeLocations: stats.activeLocations
        }
      });

      return stats;
    } catch (error) {
      logger.error('カレンダー統計情報取得エラー', { year, error });
      throw error;
    }
  }

  async getWeatherInfo(eventDate: string): Promise<WeatherInfo | null> {
    try {
      // 現在の日付から 7 日以内の未来の日付のみ天気情報を提供
      const now = new Date();
      const targetDate = new Date(eventDate);
      const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || diffDays > 7) {
        return null;
      }

      // 模擬天気データ生成
      const weatherConditions = ['晴れ', '曇り', '雨', '雪', '晴れ時々曇り'];
      const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
      
      let cloudCover: number;
      let visibility: number;
      let recommendation: WeatherInfo['recommendation'];

      switch (condition) {
        case '晴れ':
        case '晴れ時々曇り':
          cloudCover = Math.floor(Math.random() * 30);
          visibility = 15 + Math.floor(Math.random() * 15);
          recommendation = cloudCover < 20 ? 'excellent' : 'good';
          break;
        case '曇り':
          cloudCover = 60 + Math.floor(Math.random() * 30);
          visibility = 8 + Math.floor(Math.random() * 12);
          recommendation = 'fair';
          break;
        case '雨':
        case '雪':
          cloudCover = 80 + Math.floor(Math.random() * 20);
          visibility = 3 + Math.floor(Math.random() * 7);
          recommendation = 'poor';
          break;
        default:
          cloudCover = 50;
          visibility = 10;
          recommendation = 'fair';
      }

      return {
        condition,
        cloudCover,
        visibility,
        recommendation,
      };
    } catch (error) {
      logger.error('天気情報取得エラー', { eventDate, error });
      return null;
    }
  }

  private determineEventType(events: FujiEvent[]): string {
    const hasDepth = events.some(event => event.type === 'diamond');
    const hasPearl = events.some(event => event.type === 'pearl');
    
    if (hasDepth && hasPearl) {
      return 'mixed';
    } else if (hasDepth) {
      return 'diamond';
    } else if (hasPearl) {
      return 'pearl';
    }
    
    return 'unknown';
  }
}