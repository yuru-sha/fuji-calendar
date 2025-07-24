import { getUnifiedDatabase, UnifiedDatabase } from '../database/connection-unified';
import { FujiEvent } from '../../shared/types';
import { 
  EventsCacheEntry, 
  CachedEventsData, 
  CacheKeyOptions, 
  CacheResult,
  CacheStats,
  MonthlyCacheSummary
} from '../../shared/types/cache';
import { getComponentLogger, StructuredLogger } from '../../shared/utils/logger';

export class EventsCacheModel {
  private db: UnifiedDatabase;
  private logger: StructuredLogger;

  constructor() {
    this.db = getUnifiedDatabase();
    this.logger = getComponentLogger('events-cache');
  }

  /**
   * キャッシュキーの生成
   */
  generateCacheKey(options: CacheKeyOptions): string {
    const { year, month, day, locationId, calculationType = 'all' } = options;
    
    if (day) {
      return `events:${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}:loc${locationId}:${calculationType}`;
    }
    
    return `events:${year}-${month.toString().padStart(2, '0')}:loc${locationId}:${calculationType}`;
  }

  /**
   * イベントデータをキャッシュに保存
   */
  async setCache(
    options: CacheKeyOptions, 
    events: FujiEvent[], 
    calculationDurationMs: number,
    expiryDays: number = 30
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(options);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const cachedData: CachedEventsData = {
      events,
      calculatedAt: new Date(),
      version: '1.0',
      metadata: {
        locationName: events[0]?.location.name || 'Unknown',
        totalCalculationTimeMs: calculationDurationMs,
        astronomicalEngineVersion: '2.1.19',
        calculationAccuracy: 'high'
      }
    };

    const eventsDataJson = JSON.stringify(cachedData);

    try {
      const sql = `
        INSERT OR REPLACE INTO events_cache (
          cache_key, year, month, location_id, 
          events_data, event_count, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const dateStr = options.day 
        ? `${options.year}-${options.month.toString().padStart(2, '0')}-${options.day.toString().padStart(2, '0')}`
        : `${options.year}-${options.month.toString().padStart(2, '0')}`;
      
      await this.db.runAdapted(sql, [
        cacheKey,
        options.year,
        options.month,
        options.locationId,
        dateStr,
        'all', // event_type
        eventsDataJson,
        expiresAt.toISOString()
      ]);
      
      this.logger.info('キャッシュ保存成功', {
        cacheKey,
        eventCount: events.length,
        calculationDurationMs,
        expiryDays
      });
    } catch (err) {
      this.logger.error('キャッシュ保存エラー', err, { cacheKey, eventCount: events.length });
      throw err;
    }
  }

  /**
   * キャッシュからイベントデータを取得
   */
  async getCache(options: CacheKeyOptions): Promise<CacheResult<FujiEvent[]>> {
    const cacheKey = this.generateCacheKey(options);

    try {
      const sql = `
        SELECT events_data, created_at, expires_at, calculation_duration_ms
        FROM events_cache 
        WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
      `;

      const row: any = await this.db.getAdapted(sql, [cacheKey]);
      
      if (!row) {
        this.logger.debug('キャッシュミス', { cacheKey });
        return {
          hit: false,
          key: cacheKey
        };
      }

      try {
        const cachedData: CachedEventsData = JSON.parse(row.events_data);
        
        this.logger.info('キャッシュヒット', {
          cacheKey,
          eventCount: cachedData.events.length,
          cachedAt: row.created_at,
          age: Date.now() - new Date(row.created_at).getTime()
        });

        return {
          hit: true,
          data: cachedData.events,
          key: cacheKey,
          cachedAt: new Date(row.created_at),
          expiresAt: new Date(row.expires_at),
          generationTimeMs: row.calculation_duration_ms
        };
      } catch (parseError) {
        this.logger.error('キャッシュデータパースエラー', parseError, { cacheKey });
        return {
          hit: false,
          key: cacheKey
        };
      }
    } catch (err) {
      this.logger.error('キャッシュ取得エラー', err, { cacheKey });
      return {
        hit: false,
        key: cacheKey
      };
    }
  }

  /**
   * 月間キャッシュの一括取得
   */
  async getMonthlyCache(year: number, month: number, locationIds: number[]): Promise<Map<number, FujiEvent[]>> {
    const result = new Map<number, FujiEvent[]>();

    return new Promise((resolve, reject) => {
      const placeholders = locationIds.map(() => '?').join(',');
      const sql = `
        SELECT location_id, events_data
        FROM events_cache 
        WHERE year = ? AND month = ? 
          AND location_id IN (${placeholders})
          AND expires_at > CURRENT_TIMESTAMP
      `;

      this.db.all(sql, [year, month, ...locationIds], (err, rows: any[]) => {
        if (err) {
          this.logger.error('月間キャッシュ取得エラー', err, { year, month, locationIds });
          reject(err);
          return;
        }

        let totalEvents = 0;
        for (const row of rows) {
          try {
            const cachedData: CachedEventsData = JSON.parse(row.events_data);
            result.set(row.location_id, cachedData.events);
            totalEvents += cachedData.events.length;
          } catch (parseError) {
            this.logger.warn('月間キャッシュパースエラー', { 
              locationId: row.location_id,
              error: parseError
            });
          }
        }

        this.logger.info('月間キャッシュ取得完了', {
          year,
          month,
          requestedLocations: locationIds.length,
          foundLocations: result.size,
          totalEvents
        });

        resolve(result);
      });
    });
  }

  /**
   * 期限切れキャッシュの削除
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const sql = `
        DELETE FROM events_cache 
        WHERE expires_at < CURRENT_TIMESTAMP OR is_valid = 0
      `;

      const result = await this.db.runAdapted(sql, []);
      const deletedCount = result.changes || 0;
      
      this.logger.info('期限切れキャッシュ削除完了', { deletedCount });
      return deletedCount;
    } catch (err) {
      this.logger.error('期限切れキャッシュ削除エラー', err);
      throw err;
    }
  }

  /**
   * キャッシュ統計情報の取得
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_entries,
          SUM(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as valid_entries,
          SUM(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired_entries,
          COUNT(*) as total_events,
          MIN(created_at) as oldest_entry,
          MAX(created_at) as newest_entry
        FROM events_cache
      `;

      const row: any = await this.db.getAdapted(sql, []);
      
      if (!row) {
        return {
          totalEntries: 0,
          validEntries: 0,
          expiredEntries: 0,
          totalEvents: 0,
          avgCalculationTime: 0,
          cacheHitRate: 0,
          oldestEntry: new Date(),
          newestEntry: new Date(),
          diskUsageMB: 0
        };
      }

      // ファイルサイズの計算（概算）
      const avgEventSize = 200; // バイト
      const diskUsageMB = (row.total_events * avgEventSize) / (1024 * 1024);

      return {
        totalEntries: row.total_entries || 0,
        validEntries: row.valid_entries || 0,
        expiredEntries: row.expired_entries || 0,
        totalEvents: row.total_events || 0,
        avgCalculationTime: 0, // 実装時に別途計算
        cacheHitRate: 0, // 実装時に別途計算
        oldestEntry: row.oldest_entry ? new Date(row.oldest_entry) : new Date(),
        newestEntry: row.newest_entry ? new Date(row.newest_entry) : new Date(),
        diskUsageMB
      };
    } catch (err) {
      this.logger.error('キャッシュ統計取得エラー', err);
      throw err;
    }
  }

  /**
   * 特定の年月のキャッシュを無効化
   */
  async invalidateCache(year: number, month?: number, locationId?: number): Promise<number> {
    return new Promise((resolve, reject) => {
      let sql = 'UPDATE events_cache SET is_valid = 0 WHERE year = ?';
      const params: any[] = [year];

      if (month !== undefined) {
        sql += ' AND month = ?';
        params.push(month);
      }

      if (locationId !== undefined) {
        sql += ' AND location_id = ?';
        params.push(locationId);
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  /**
   * 月間キャッシュサマリーの取得
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlyCacheSummary[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM monthly_events_summary 
        WHERE year = ? AND month = ?
        ORDER BY location_id
      `;

      this.db.all(sql, [year, month], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const summaries: MonthlyCacheSummary[] = rows.map(row => ({
          year: row.year,
          month: row.month,
          locationId: row.location_id,
          totalCacheEntries: row.total_cache_entries,
          totalEvents: row.total_events,
          oldestCache: new Date(row.oldest_cache),
          newestCache: new Date(row.newest_cache),
          avgCalculationTime: row.avg_calculation_time,
          completionRate: 1.0 // TODO: 実際の完了率計算
        }));

        resolve(summaries);
      });
    });
  }

  /**
   * バッチ削除（大量データの効率的削除）
   */
  async batchDelete(cacheKeys: string[]): Promise<number> {
    if (cacheKeys.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const placeholders = cacheKeys.map(() => '?').join(',');
      const sql = `DELETE FROM events_cache WHERE cache_key IN (${placeholders})`;

      this.db.run(sql, cacheKeys, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  /**
   * キャッシュ存在チェック
   */
  async exists(options: CacheKeyOptions): Promise<boolean> {
    const cacheKey = this.generateCacheKey(options);

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 1 FROM events_cache 
        WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
      `;

      this.db.get(sql, [cacheKey], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  /**
   * 特定年のデータを削除（アーカイブ用）
   */
  async deleteByYear(year: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM events_cache WHERE year = ?`;
      
      this.db.run(sql, [year], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  /**
   * 特定地点・月のイベント取得
   */
  async findByLocationAndMonth(locationId: number, year: number, month: number): Promise<FujiEvent[]> {
    const cacheResult = await this.getCache({ locationId, year, month });
    
    if (cacheResult.hit && cacheResult.data) {
      return cacheResult.data;
    }
    
    return [];
  }
}