import Redis from 'ioredis';
import { getComponentLogger } from '@/shared/utils/logger';
import { FujiEvent } from '@/shared/types';

/**
 * Redis 活用拡大サービス
 * 月間イベントキャッシュとセッション管理を統合
 */
export class RedisService {
  private redis: Redis;
  private logger = getComponentLogger('RedisService');

  // キャッシュキーのプレフィックス
  private static readonly PREFIXES = {
    MONTHLY_EVENTS: 'monthly_events:',
    SESSION: 'session:',
    USER_FAVORITES: 'favorites:',
    LOCATION_CACHE: 'location:',
    WEATHER_CACHE: 'weather:'
  } as const;

  // キャッシュ TTL 設定（秒）
  private static readonly TTL = {
    MONTHLY_EVENTS: 7 * 24 * 60 * 60, // 7 日
    SESSION: 24 * 60 * 60, // 24 時間
    USER_FAVORITES: 30 * 24 * 60 * 60, // 30 日
    LOCATION_CACHE: 60 * 60, // 1 時間
    WEATHER_CACHE: 30 * 60 // 30 分
  } as const;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Redis 接続イベント
    this.redis.on('connect', () => {
      this.logger.info('Redis 接続成功');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis 接続エラー', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis 接続切断');
    });
  }

  /**
   * 月間イベントキャッシュ
   */
  async cacheMonthlyEvents(
    year: number, 
    month: number, 
    events: FujiEvent[]
  ): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.MONTHLY_EVENTS}${year}-${month.toString().padStart(2, '0')}`;
      const value = JSON.stringify(events);
      
      await this.redis.setex(key, RedisService.TTL.MONTHLY_EVENTS, value);
      
      this.logger.debug('月間イベントキャッシュ保存', {
        year,
        month,
        eventsCount: events.length,
        cacheKey: key
      });
    } catch (error) {
      this.logger.error('月間イベントキャッシュ保存エラー', error, { year, month });
    }
  }

  /**
   * 月間イベントキャッシュ取得
   */
  async getMonthlyEvents(year: number, month: number): Promise<FujiEvent[] | null> {
    try {
      const key = `${RedisService.PREFIXES.MONTHLY_EVENTS}${year}-${month.toString().padStart(2, '0')}`;
      const cached = await this.redis.get(key);
      
      if (!cached) {
        return null;
      }

      const events = JSON.parse(cached) as FujiEvent[];
      
      this.logger.debug('月間イベントキャッシュ取得', {
        year,
        month,
        eventsCount: events.length,
        cacheKey: key
      });

      return events;
    } catch (error) {
      this.logger.error('月間イベントキャッシュ取得エラー', error, { year, month });
      return null;
    }
  }

  /**
   * 月間イベントキャッシュ削除
   */
  async invalidateMonthlyEvents(year: number, month: number): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.MONTHLY_EVENTS}${year}-${month.toString().padStart(2, '0')}`;
      await this.redis.del(key);
      
      this.logger.info('月間イベントキャッシュ削除', { year, month, cacheKey: key });
    } catch (error) {
      this.logger.error('月間イベントキャッシュ削除エラー', error, { year, month });
    }
  }

  /**
   * セッション管理
   */
  async createSession(sessionId: string, data: {
    userId?: string;
    adminId?: string;
    createdAt: string;
    lastAccess: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.SESSION}${sessionId}`;
      const value = JSON.stringify(data);
      
      await this.redis.setex(key, RedisService.TTL.SESSION, value);
      
      this.logger.debug('セッション作成', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: data.userId,
        adminId: data.adminId
      });
    } catch (error) {
      this.logger.error('セッション作成エラー', error, { sessionId });
    }
  }

  /**
   * セッション取得
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const key = `${RedisService.PREFIXES.SESSION}${sessionId}`;
      const cached = await this.redis.get(key);
      
      if (!cached) {
        return null;
      }

      const sessionData = JSON.parse(cached);
      
      // 最終アクセス時刻を更新
      sessionData.lastAccess = new Date().toISOString();
      await this.redis.setex(key, RedisService.TTL.SESSION, JSON.stringify(sessionData));

      this.logger.debug('セッション取得', {
        sessionId: sessionId.substring(0, 8) + '...'
      });

      return sessionData;
    } catch (error) {
      this.logger.error('セッション取得エラー', error, { sessionId });
      return null;
    }
  }

  /**
   * セッション削除
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.SESSION}${sessionId}`;
      await this.redis.del(key);
      
      this.logger.info('セッション削除', {
        sessionId: sessionId.substring(0, 8) + '...'
      });
    } catch (error) {
      this.logger.error('セッション削除エラー', error, { sessionId });
    }
  }

  /**
   * ユーザーお気に入りキャッシュ
   */
  async cacheUserFavorites(userId: string, favorites: any): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.USER_FAVORITES}${userId}`;
      const value = JSON.stringify(favorites);
      
      await this.redis.setex(key, RedisService.TTL.USER_FAVORITES, value);
      
      this.logger.debug('お気に入りキャッシュ保存', { userId });
    } catch (error) {
      this.logger.error('お気に入りキャッシュ保存エラー', error, { userId });
    }
  }

  /**
   * ユーザーお気に入りキャッシュ取得
   */
  async getUserFavorites(userId: string): Promise<any | null> {
    try {
      const key = `${RedisService.PREFIXES.USER_FAVORITES}${userId}`;
      const cached = await this.redis.get(key);
      
      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error('お気に入りキャッシュ取得エラー', error, { userId });
      return null;
    }
  }

  /**
   * 地点情報キャッシュ
   */
  async cacheLocationData(locationId: number, data: any): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.LOCATION_CACHE}${locationId}`;
      const value = JSON.stringify(data);
      
      await this.redis.setex(key, RedisService.TTL.LOCATION_CACHE, value);
    } catch (error) {
      this.logger.error('地点情報キャッシュ保存エラー', error, { locationId });
    }
  }

  /**
   * 天気情報キャッシュ
   */
  async cacheWeatherData(
    locationId: number, 
    date: string, 
    weatherData: any
  ): Promise<void> {
    try {
      const key = `${RedisService.PREFIXES.WEATHER_CACHE}${locationId}-${date}`;
      const value = JSON.stringify(weatherData);
      
      await this.redis.setex(key, RedisService.TTL.WEATHER_CACHE, value);
    } catch (error) {
      this.logger.error('天気情報キャッシュ保存エラー', error, { locationId, date });
    }
  }

  /**
   * 天気情報キャッシュ取得
   */
  async getWeatherData(locationId: number, date: string): Promise<any | null> {
    try {
      const key = `${RedisService.PREFIXES.WEATHER_CACHE}${locationId}-${date}`;
      const cached = await this.redis.get(key);
      
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('天気情報キャッシュ取得エラー', error, { locationId, date });
      return null;
    }
  }

  /**
   * キャッシュ統計取得
   */
  async getCacheStats(): Promise<{
    monthlyEventsCount: number;
    sessionsCount: number;
    favoritesCount: number;
    memoryUsage: string;
    uptime: number;
  }> {
    try {
      const [
        monthlyEventsKeys,
        sessionKeys,
        favoritesKeys,
        info
      ] = await Promise.all([
        this.redis.keys(`${RedisService.PREFIXES.MONTHLY_EVENTS}*`),
        this.redis.keys(`${RedisService.PREFIXES.SESSION}*`),
        this.redis.keys(`${RedisService.PREFIXES.USER_FAVORITES}*`),
        this.redis.info('memory')
      ]);

      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);

      return {
        monthlyEventsCount: monthlyEventsKeys.length,
        sessionsCount: sessionKeys.length,
        favoritesCount: favoritesKeys.length,
        memoryUsage: memoryMatch ? memoryMatch[1].trim() : 'unknown',
        uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0
      };
    } catch (error) {
      this.logger.error('キャッシュ統計取得エラー', error);
      return {
        monthlyEventsCount: 0,
        sessionsCount: 0,
        favoritesCount: 0,
        memoryUsage: 'error',
        uptime: 0
      };
    }
  }

  /**
   * キャッシュクリア
   */
  async clearCache(pattern?: string): Promise<number> {
    try {
      const keys = pattern 
        ? await this.redis.keys(pattern)
        : await this.redis.keys('*');
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redis.del(...keys);
      
      this.logger.info('キャッシュクリア完了', {
        pattern: pattern || 'all',
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      this.logger.error('キャッシュクリアエラー', error, { pattern });
      return 0;
    }
  }

  /**
   * Redis 接続テスト
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis 接続テストエラー', error);
      return false;
    }
  }

  /**
   * リソースクリーンアップ
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Redis 接続切断完了');
    } catch (error) {
      this.logger.error('Redis 切断エラー', error);
    }
  }
}

// シングルトンインスタンス
export const redisService = new RedisService();