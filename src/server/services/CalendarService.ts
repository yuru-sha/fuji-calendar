import { CalendarEvent, CalendarResponse, EventsResponse, FujiEvent, WeatherInfo, Location } from '../../shared/types';
import { astronomicalCalculator } from './AstronomicalCalculatorAstronomyEngine';
import { LocationModel } from '../models/Location';
import { EventsCacheModel } from '../models/EventsCache';
// import { BatchCalculationService } from './BatchCalculationService'; // SunCalc直接使用のため無効化
import { timeUtils } from '../../shared/utils/timeUtils';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

export class CalendarService {
  private locationModel: LocationModel;
  private cacheModel: EventsCacheModel;
  // private batchService: BatchCalculationService; // SunCalc直接使用のため無効化
  private logger: StructuredLogger;

  constructor() {
    this.locationModel = new LocationModel();
    this.cacheModel = new EventsCacheModel();
    // this.batchService = new BatchCalculationService(); // SunCalc直接使用のため無効化
    this.logger = getComponentLogger('calendar-service');
  }

  // 月間カレンダーデータを取得（キャッシュ優先）
  async getMonthlyCalendar(year: number, month: number): Promise<CalendarResponse> {
    const startTime = Date.now();
    
    try {
      // 全ての撮影地点を取得
      const locations = await this.locationModel.findAll();
      
      if (locations.length === 0) {
        this.logger.warn('撮影地点が見つからないため空のカレンダーを返却', {
          year,
          month
        });
        return {
          year,
          month,
          events: []
        };
      }
      
      this.logger.info('月間カレンダー取得開始', {
        year,
        month,
        locationCount: locations.length,
        strategy: 'cache-first'
      });
      
      // 直接Astronomy Engine計算（キャッシュなし）
      const allEvents: FujiEvent[] = [];
      
      this.logger.info('Astronomy Engine月間計算開始', {
        year,
        month,
        locationCount: locations.length
      });
      
      // 各地点ごとに計算
      const locationEvents = await astronomicalCalculator.calculateMonthlyEvents(year, month, locations);
      allEvents.push(...locationEvents);
      
      // 日付ごとにイベントをグループ化
      const calendarEvents = this.groupEventsByDate(allEvents);
      
      const responseTime = Date.now() - startTime;
      this.logger.info('Astronomy Engine月間カレンダー取得完了', {
        year,
        month,
        locationCount: locations.length,
        totalEvents: allEvents.length,
        calendarEvents: calendarEvents.length,
        responseTimeMs: responseTime,
        eventsPreview: allEvents.slice(0, 3).map(e => ({ 
          type: e.type, 
          time: e.time.toISOString(), 
          location: e.location.name 
        }))
      });
      
      // 次月プリロード無効化（Astronomy Engine直接計算では不要）
      // this.triggerNextMonthPreload(year, month);
      
      return {
        year,
        month,
        events: calendarEvents
      };
      
    } catch (error) {
      this.logger.error('月間カレンダー取得エラー', error, {
        year,
        month
      });
      
      // エラー時のフォールバック：短縮計算
      return this.getFallbackCalendar(year, month);
    }
  }

  // 特定日のイベント詳細を取得（キャッシュ優先）
  async getDayEvents(dateString: string): Promise<EventsResponse> {
    const startTime = Date.now();
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    try {
      this.logger.info('日次イベント取得開始', {
        dateString,
        year,
        month,
        day,
        strategy: 'cache-first'
      });
      
      // 直接Astronomy Engine計算（キャッシュなし）
      const locations = await this.locationModel.findAll();
      const allEvents: FujiEvent[] = [];
      
      this.logger.info('Astronomy Engine直接計算開始', { dateString, locationCount: locations.length });
      
      for (const location of locations) {
        const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(date, location);
        const pearlEvents = await astronomicalCalculator.calculatePearlFuji(date, location);
        allEvents.push(...diamondEvents, ...pearlEvents);
      }
      
      // 時刻順にソート
      allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
      
      // 天気情報を取得（模擬実装）
      const weather = await this.getWeatherInfo(date);
      
      const responseTime = Date.now() - startTime;
      this.logger.info('日次イベント取得完了', {
        dateString,
        eventCount: allEvents.length,
        responseTimeMs: responseTime,
        eventsPreview: allEvents.map(e => ({ type: e.type, time: e.time.toISOString(), location: e.location.name }))
      });
      
      return {
        date: dateString,
        events: allEvents,
        weather
      };
      
    } catch (error) {
      this.logger.error('日次イベント取得エラー（フォールバック実行）', error, { dateString });
      
      // フォールバック：直接計算（キャッシュなし）
      const locations = await this.locationModel.findAll();
      const allEvents: FujiEvent[] = [];
      
      this.logger.info('フォールバック計算開始', { dateString, locationCount: locations.length });
      
      // 各地点ごとに計算
      for (const location of locations) {
        const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(date, location);
        const pearlEvents = await astronomicalCalculator.calculatePearlFuji(date, location);
        allEvents.push(...diamondEvents, ...pearlEvents);
      }
      
      allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
      const weather = await this.getWeatherInfo(date);
      
      this.logger.info('フォールバック計算完了', {
        dateString,
        eventCount: allEvents.length,
        eventsPreview: allEvents.map(e => ({ type: e.type, time: e.time.toISOString(), location: e.location.name }))
      });
      
      return {
        date: dateString,
        events: allEvents,
        weather
      };
    }
  }

  // 特定地点の年間イベントを取得
  async getLocationYearlyEvents(locationId: number, year: number): Promise<FujiEvent[]> {
    const location = await this.locationModel.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    const events: FujiEvent[] = [];
    
    // 各月を計算
    for (let month = 1; month <= 12; month++) {
      const monthEvents = await astronomicalCalculator.calculateMonthlyEvents(year, month, [location]);
      events.push(...monthEvents);
    }
    
    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  // 今後のイベントを取得（次の30日分）
  async getUpcomingEvents(limit: number = 50): Promise<FujiEvent[]> {
    const now = timeUtils.getCurrentJst();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    const locations = await this.locationModel.findAll();
    const events: FujiEvent[] = [];

    // 30日分のイベントを計算
    for (let date = new Date(now); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dailyDate = new Date(date);
      
      // 各地点ごとに計算
      for (const location of locations) {
        const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(dailyDate, location);
        const pearlEvents = await astronomicalCalculator.calculatePearlFuji(dailyDate, location);
        
        events.push(...diamondEvents, ...pearlEvents);
      }
    }

    // 未来のイベントのみをフィルタリング
    const futureEvents = events.filter(event => event.time > now);
    
    // 時刻順にソートしてlimit件まで返す
    return futureEvents
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .slice(0, limit);
  }

  // ベストショットの日を推奨
  async getBestShotDays(year: number, month: number): Promise<FujiEvent[]> {
    const locations = await this.locationModel.findAll();
    const events: FujiEvent[] = [];
    
    // 各地点ごとに計算
    for (const location of locations) {
      const locationEvents = await astronomicalCalculator.calculateMonthlyEvents(year, month, [location]);
      events.push(...locationEvents);
    }

    // 条件の良いイベントを抽出
    const bestEvents = events.filter(event => {
      // 高度が適度にある（地平線近くすぎない）
      const elevationOk = event.elevation && event.elevation > 1 && event.elevation < 15;
      
      // パール富士の場合は月の満ち欠けも考慮
      if (event.type === 'pearl') {
        // 満月に近い方が良い（照光面積50%以上）
        // 実際の月の満ち欠けはAstronomicalCalculatorで取得する必要がある
        return elevationOk;
      }
      
      return elevationOk;
    });

    // 評価スコアでソート（高度、アクセス性などを考慮）
    return bestEvents
      .sort((a, b) => this.calculateEventScore(b) - this.calculateEventScore(a))
      .slice(0, 10); // 上位10件
  }

  // イベントを日付ごとにグループ化（JST基準）
  private groupEventsByDate(events: FujiEvent[]): CalendarEvent[] {
    const eventsByDate = new Map<string, FujiEvent[]>();

    events.forEach(event => {
      // UTC時刻をJST時刻に変換
      const jstTime = timeUtils.utcToJst(event.time);
      
      // 夕方のイベント（14時以降）は翌日の撮影予定として表示
      // これにより2025-02-17 17:15のイベントは2月18日に表示される
      let displayDate = jstTime;
      if (jstTime.getHours() >= 14) {
        displayDate = new Date(jstTime.getTime() + 24 * 60 * 60 * 1000); // 翌日
      }
      
      const dateKey = timeUtils.formatDateString(displayDate);
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    const calendarEvents: CalendarEvent[] = [];
    eventsByDate.forEach((dayEvents, dateString) => {
      const date = new Date(dateString);
      
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

  // イベントの評価スコアを計算
  private calculateEventScore(event: FujiEvent): number {
    let score = 0;

    // 高度による評価（適度な高度が良い）
    if (event.elevation) {
      if (event.elevation >= 2 && event.elevation <= 10) {
        score += 30; // 理想的な高度
      } else if (event.elevation >= 1 && event.elevation <= 15) {
        score += 20; // 良い高度
      } else if (event.elevation > 0) {
        score += 10; // 最低限の高度
      }
    }

    // 時刻による評価（早朝・夕方が撮影しやすい）
    const hour = event.time.getHours();
    if ((hour >= 5 && hour <= 7) || (hour >= 16 && hour <= 18)) {
      score += 20; // 理想的な時刻
    } else if ((hour >= 4 && hour <= 8) || (hour >= 15 && hour <= 19)) {
      score += 10; // 良い時刻
    }

    // アクセス性による評価（標高が低い方がアクセスしやすい）
    if (event.location.elevation < 500) {
      score += 15; // アクセスしやすい
    } else if (event.location.elevation < 1000) {
      score += 10; // 普通
    } else if (event.location.elevation < 1500) {
      score += 5; // やや困難
    }

    // 撮影タイプによる評価
    if (event.type === 'diamond') {
      score += 5; // ダイヤモンド富士は少し人気
    }

    return score;
  }

  // 天気情報を取得（模擬実装）
  private async getWeatherInfo(date: Date): Promise<WeatherInfo | undefined> {
    // 実際の実装では外部天気APIを使用
    // ここでは模擬データを返す
    
    const now = timeUtils.getCurrentJst();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // 未来の日付の場合のみ天気予報を返す
    if (diffDays >= 0 && diffDays <= 7) {
      // ランダムな天気情報を生成（実装用）
      const conditions = ['晴れ', '曇り', '雨', '雪'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const cloudCover = Math.floor(Math.random() * 100);
      
      let recommendation: 'excellent' | 'good' | 'fair' | 'poor';
      if (condition === '晴れ' && cloudCover < 30) {
        recommendation = 'excellent';
      } else if (condition === '晴れ' || (condition === '曇り' && cloudCover < 50)) {
        recommendation = 'good';
      } else if (condition === '曇り') {
        recommendation = 'fair';
      } else {
        recommendation = 'poor';
      }

      return {
        condition,
        cloudCover,
        visibility: Math.floor(Math.random() * 20) + 5, // 5-25km
        recommendation
      };
    }

    return undefined;
  }

  // 計算結果を非同期でキャッシュに保存
  private async asyncCacheResults(
    year: number, 
    month: number, 
    locations: Location[], 
    events: FujiEvent[]
  ): Promise<void> {
    try {
      // 地点別にイベントをグループ化
      const eventsByLocation = new Map<number, FujiEvent[]>();
      
      for (const event of events) {
        const locationId = event.location.id;
        if (!eventsByLocation.has(locationId)) {
          eventsByLocation.set(locationId, []);
        }
        eventsByLocation.get(locationId)!.push(event);
      }
      
      // 各地点のイベントをキャッシュに保存
      const cachePromises: Promise<void>[] = [];
      
      for (const location of locations) {
        const locationEvents = eventsByLocation.get(location.id) || [];
        
        const cachePromise = this.cacheModel.setCache(
          {
            year,
            month,
            locationId: location.id
          },
          locationEvents,
          0, // 計算時間は既に完了しているので0
          60 // 60日間有効
        );
        
        cachePromises.push(cachePromise);
      }
      
      await Promise.all(cachePromises);
      
      this.logger.info('非同期キャッシュ保存完了', {
        year,
        month,
        locationCount: locations.length,
        totalEvents: events.length
      });
      
    } catch (error) {
      this.logger.error('非同期キャッシュ保存失敗', error, {
        year,
        month,
        locationCount: locations.length
      });
      throw error;
    }
  }

  // 次月のプリロードを背景で開始
  private async triggerNextMonthPreload(year: number, month: number): Promise<void> {
    try {
      // 次月の計算
      let nextYear = year;
      let nextMonth = month + 1;
      
      if (nextMonth > 12) {
        nextYear += 1;
        nextMonth = 1;
      }
      
      this.logger.debug('次月プリロード開始', {
        currentYear: year,
        currentMonth: month,
        nextYear,
        nextMonth
      });
      
      // プリロード機能無効化（SunCalc直接計算では不要）
      // await this.batchService.calculateMonthlyEvents(nextYear, nextMonth, undefined, 'low');
      
    } catch (error) {
      this.logger.warn('次月プリロードエラー', error, {
        year,
        month
      });
      // プリロードエラーは致命的でないため、例外を再スローしない
    }
  }

  // エラー時のフォールバック：短縮計算
  private async getFallbackCalendar(year: number, month: number): Promise<CalendarResponse> {
    try {
      this.logger.warn('フォールバックカレンダー生成開始', { year, month });
      
      // 主要地点のみで計算（パフォーマンス重視）
      const allLocations = await this.locationModel.findAll();
      const majorLocations = allLocations
        .sort((a, b) => a.elevation - b.elevation) // アクセスしやすい地点優先
        .slice(0, Math.min(10, allLocations.length)); // 最大10地点
      
      // 5日おきの計算で負荷軽減
      const events: FujiEvent[] = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day += 5) {
        const date = new Date(year, month - 1, day);
        
        try {
          const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(date, majorLocations[0]);
          const pearlEvents = await astronomicalCalculator.calculatePearlFuji(date, majorLocations[0]);
          events.push(...diamondEvents, ...pearlEvents);
        } catch (dayError) {
          this.logger.debug('フォールバック日次計算エラー', dayError, { year, month, day });
          // 個別日のエラーは継続
        }
      }
      
      const calendarEvents = this.groupEventsByDate(events);
      
      this.logger.info('フォールバックカレンダー生成完了', {
        year,
        month,
        locationCount: majorLocations.length,
        eventCount: events.length,
        calendarEventCount: calendarEvents.length
      });
      
      return {
        year,
        month,
        events: calendarEvents
      };
      
    } catch (fallbackError) {
      this.logger.error('フォールバック処理も失敗', fallbackError, { year, month });
      
      // 最終的に空のカレンダーを返す
      return {
        year,
        month,
        events: []
      };
    }
  }

  // 撮影計画のサジェスト
  async getSuggestedShootingPlan(
    startDate: Date, 
    endDate: Date, 
    preferredType?: 'diamond' | 'pearl'
  ): Promise<FujiEvent[]> {
    const locations = await this.locationModel.findAll();
    const events: FujiEvent[] = [];

    // 期間内のイベントを計算
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dailyDate = new Date(date);
      
      // 各地点ごとに計算
      for (const location of locations) {
        const diamondEvents = await astronomicalCalculator.calculateDiamondFuji(dailyDate, location);
        const pearlEvents = await astronomicalCalculator.calculatePearlFuji(dailyDate, location);
        
        events.push(...diamondEvents, ...pearlEvents);
      }
    }

    // タイプフィルタリング
    let filteredEvents = events;
    if (preferredType) {
      filteredEvents = events.filter(event => event.type === preferredType);
    }

    // スコアでソートして上位を返す
    return filteredEvents
      .sort((a, b) => this.calculateEventScore(b) - this.calculateEventScore(a))
      .slice(0, 20);
  }
}

export default CalendarService;