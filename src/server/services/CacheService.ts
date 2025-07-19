import Redis from 'ioredis';
import { getComponentLogger } from '../../shared/utils/logger';
import { timeUtils } from '../../shared/utils/timeUtils';

export interface CacheConfig {
  ttl: {
    monthlyCalendar: number;    // 月間カレンダー（24時間）
    dailyEvents: number;        // 日別イベント（12時間）
    locationEvents: number;     // 地点別年間イベント（7日間）
    stats: number;              // 統計情報（6時間）
    upcomingEvents: number;     // 今後のイベント（1時間）
    suggestions: number;        // 撮影計画サジェスト（30分）
  };
  keyPrefix: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Redis ベースの高性能キャッシュサービス
 * カレンダーデータの計算結果をキャッシュして応答速度を向上
 */
export class CacheService {
  private redis: Redis | null = null;
  private logger = getComponentLogger('cache-service');
  private fallbackCache = new Map<string, CacheEntry<any>>(); // Redisが利用不可時のフォールバック
  
  private config: CacheConfig = {
    ttl: {
      monthlyCalendar: 24 * 60 * 60,      // 24時間（86400秒）
      dailyEvents: 12 * 60 * 60,          // 12時間（43200秒）
      locationEvents: 7 * 24 * 60 * 60,   // 7日間（604800秒）
      stats: 6 * 60 * 60,                 // 6時間（21600秒）
      upcomingEvents: 60 * 60,            // 1時間（3600秒）
      suggestions: 30 * 60                // 30分（1800秒）
    },
    keyPrefix: 'fuji_calendar:'
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Redis接続の初期化
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        this.logger.info('Redis cache connected successfully');
      });

      this.redis.on('error', (error) => {
        this.logger.warn('Redis cache connection error, falling back to memory cache', {
          error: error.message
        });
        // Redis接続エラー時はメモリキャッシュにフォールバック
      });

      // 接続テスト
      await this.redis.ping();
      this.logger.info('Redis cache initialized successfully');

    } catch (error) {
      this.logger.warn('Redis initialization failed, using memory cache fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.redis = null; // メモリキャッシュのみ使用
    }
  }

  /**
   * キャッシュキーの生成
   */
  private generateKey(category: string, identifier: string): string {
    return `${this.config.keyPrefix}${category}:${identifier}`;
  }

  /**
   * データをキャッシュに保存
   */
  async set<T>(category: keyof CacheConfig['ttl'], identifier: string, data: T): Promise<void> {
    const key = this.generateKey(category, identifier);
    const ttl = this.config.ttl[category];
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    try {
      if (this.redis) {
        // Redis にキャッシュ
        await this.redis.setex(key, ttl, JSON.stringify(entry));
        this.logger.debug('Data cached in Redis', { key, ttl });
      } else {
        // メモリキャッシュにフォールバック
        this.fallbackCache.set(key, entry);
        this.logger.debug('Data cached in memory', { key, ttl });
        
        // TTL管理（メモリキャッシュ用）
        setTimeout(() => {
          this.fallbackCache.delete(key);
          this.logger.debug('Memory cache entry expired', { key });
        }, ttl * 1000);
      }
    } catch (error) {
      this.logger.error('Cache set operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * キャッシュからデータを取得
   */
  async get<T>(category: keyof CacheConfig['ttl'], identifier: string): Promise<T | null> {
    const key = this.generateKey(category, identifier);

    try {
      let entry: CacheEntry<T> | null = null;

      if (this.redis) {
        // Redis からキャッシュを取得
        const cached = await this.redis.get(key);
        if (cached) {
          entry = JSON.parse(cached);
          this.logger.debug('Cache hit in Redis', { key });
        }
      } else {
        // メモリキャッシュから取得
        const cached = this.fallbackCache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
          entry = cached;
          this.logger.debug('Cache hit in memory', { key });
        } else if (cached) {
          // 期限切れエントリの削除
          this.fallbackCache.delete(key);
          this.logger.debug('Memory cache entry expired and removed', { key });
        }
      }

      if (entry) {
        // 取得統計をログ
        const age = Date.now() - entry.timestamp;
        this.logger.info('Cache hit', {
          category,
          identifier,
          ageMs: age,
          ttlSeconds: entry.ttl
        });
        return entry.data;
      }

      this.logger.debug('Cache miss', { key });
      return null;

    } catch (error) {
      this.logger.error('Cache get operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * 特定のキャッシュを削除
   */
  async delete(category: keyof CacheConfig['ttl'], identifier: string): Promise<void> {
    const key = this.generateKey(category, identifier);

    try {
      if (this.redis) {
        await this.redis.del(key);
        this.logger.debug('Cache deleted from Redis', { key });
      } else {
        this.fallbackCache.delete(key);
        this.logger.debug('Cache deleted from memory', { key });
      }
    } catch (error) {
      this.logger.error('Cache delete operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * パターンに一致するキャッシュを削除
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = `${this.config.keyPrefix}${pattern}`;

    try {
      if (this.redis) {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          this.logger.info('Pattern-based cache deletion from Redis', { 
            pattern: fullPattern, 
            deletedCount: keys.length 
          });
        }
      } else {
        // メモリキャッシュから削除
        const keysToDelete: string[] = [];
        for (const key of this.fallbackCache.keys()) {
          if (key.startsWith(fullPattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => this.fallbackCache.delete(key));
        this.logger.info('Pattern-based cache deletion from memory', { 
          pattern: fullPattern, 
          deletedCount: keysToDelete.length 
        });
      }
    } catch (error) {
      this.logger.error('Pattern-based cache deletion failed', {
        pattern: fullPattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 月間カレンダーキャッシュの専用メソッド
   */
  async getMonthlyCalendar(year: number, month: number): Promise<any | null> {
    return await this.get('monthlyCalendar', `${year}-${month.toString().padStart(2, '0')}`);
  }

  async setMonthlyCalendar(year: number, month: number, data: any): Promise<void> {
    await this.set('monthlyCalendar', `${year}-${month.toString().padStart(2, '0')}`, data);
  }

  /**
   * 日別イベントキャッシュの専用メソッド
   */
  async getDayEvents(dateString: string): Promise<any | null> {
    return await this.get('dailyEvents', dateString);
  }

  async setDayEvents(dateString: string, data: any): Promise<void> {
    await this.set('dailyEvents', dateString, data);
  }

  /**
   * 今後のイベントキャッシュの専用メソッド
   */
  async getUpcomingEvents(limit: number): Promise<any | null> {
    return await this.get('upcomingEvents', `limit-${limit}`);
  }

  async setUpcomingEvents(limit: number, data: any): Promise<void> {
    await this.set('upcomingEvents', `limit-${limit}`, data);
  }

  /**
   * 統計情報キャッシュの専用メソッド
   */
  async getStats(year: number): Promise<any | null> {
    return await this.get('stats', year.toString());
  }

  async setStats(year: number, data: any): Promise<void> {
    await this.set('stats', year.toString(), data);
  }

  /**
   * 地点別年間イベントキャッシュの専用メソッド
   */
  async getLocationEvents(locationId: number, year: number): Promise<any | null> {
    return await this.get('locationEvents', `${locationId}-${year}`);
  }

  async setLocationEvents(locationId: number, year: number, data: any): Promise<void> {
    await this.set('locationEvents', `${locationId}-${year}`, data);
  }

  /**
   * 撮影計画サジェストキャッシュの専用メソッド
   */
  async getSuggestions(startDate: string, endDate: string, preferredType?: string): Promise<any | null> {
    const key = `${startDate}-${endDate}-${preferredType || 'all'}`;
    return await this.get('suggestions', key);
  }

  async setSuggestions(startDate: string, endDate: string, preferredType: string | undefined, data: any): Promise<void> {
    const key = `${startDate}-${endDate}-${preferredType || 'all'}`;
    await this.set('suggestions', key, data);
  }

  /**
   * 地点関連のキャッシュを無効化（地点更新時）
   */
  async invalidateLocationCache(locationId?: number): Promise<void> {
    if (locationId) {
      // 特定地点のキャッシュのみ削除
      await this.deletePattern(`locationEvents:${locationId}-*`);
      this.logger.info('Location-specific cache invalidated', { locationId });
    } else {
      // 全地点関連キャッシュを削除
      await this.deletePattern('locationEvents:*');
      this.logger.info('All location cache invalidated');
    }
    
    // 関連するキャッシュも削除
    await this.deletePattern('monthlyCalendar:*');
    await this.deletePattern('dailyEvents:*');
    await this.deletePattern('upcomingEvents:*');
    await this.deletePattern('stats:*');
    await this.deletePattern('suggestions:*');
  }

  /**
   * キャッシュ統計情報を取得
   */
  async getCacheStats(): Promise<{
    redisConnected: boolean;
    memoryEntries: number;
    hitRate?: number;
  }> {
    const stats = {
      redisConnected: this.redis !== null && this.redis.status === 'ready',
      memoryEntries: this.fallbackCache.size
    };

    if (this.redis) {
      try {
        const info = await this.redis.info('stats');
        const hitRate = this.parseRedisHitRate(info);
        return { ...stats, hitRate };
      } catch (error) {
        this.logger.warn('Failed to get Redis stats', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return stats;
  }

  /**
   * Redis統計情報からヒット率を解析
   */
  private parseRedisHitRate(info: string): number | undefined {
    try {
      const lines = info.split('\r\n');
      let hits = 0;
      let misses = 0;

      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1]);
        }
      }

      if (hits + misses > 0) {
        return (hits / (hits + misses)) * 100;
      }
    } catch (error) {
      this.logger.warn('Failed to parse Redis hit rate', { error });
    }

    return undefined;
  }

  /**
   * 接続終了
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.info('Redis cache disconnected');
    }
    this.fallbackCache.clear();
  }
}

// シングルトンインスタンス
export const cacheService = new CacheService();