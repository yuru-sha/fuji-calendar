import { Database } from 'sqlite3';
import { getDatabase } from '../database/connection';
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
  private db: Database;
  private logger: StructuredLogger;

  constructor() {
    this.db = getDatabase().getRawDb();
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
    // キャッシュ機能を一時的に無効化
    this.logger.debug('キャッシュ保存をスキップ（一時無効化）', { 
      cacheKey: this.generateCacheKey(options), 
      eventCount: events.length 
    });
    return Promise.resolve();
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

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO events_cache (
          cache_key, year, month, location_id, 
          date_str, event_type, events_data, 
          created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `;

      const dateStr = options.day 
        ? `${options.year}-${options.month.toString().padStart(2, '0')}-${options.day.toString().padStart(2, '0')}`
        : `${options.year}-${options.month.toString().padStart(2, '0')}`;
      
      this.db.run(sql, [
        cacheKey,
        options.year,
        options.month,
        options.locationId,
        dateStr,
        'all', // event_type
        eventsDataJson,
        expiresAt.toISOString()
      ], (err) => {
        if (err) {
          this.logger.error('キャッシュ保存エラー', err, { cacheKey, eventCount: events.length });
          reject(err);
        } else {
          this.logger.info('キャッシュ保存成功', {
            cacheKey,
            eventCount: events.length,
            calculationDurationMs,
            expiryDays
          });
          resolve();
        }
      });
    });
  }

  /**
   * キャッシュからイベントデータを取得
   */
  async getCache(options: CacheKeyOptions): Promise<CacheResult<FujiEvent[]>> {
    const cacheKey = this.generateCacheKey(options);

    return new Promise((resolve) => {
      const sql = `
        SELECT events_data, created_at, expires_at, calculation_duration_ms
        FROM events_cache 
        WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
      `;

      this.db.get(sql, [cacheKey], (err, row: any) => {
        if (err || !row) {
          this.logger.debug('キャッシュミス', { cacheKey, error: err?.message });
          resolve({
            hit: false,
            key: cacheKey
          });
          return;
        }

        try {
          const cachedData: CachedEventsData = JSON.parse(row.cached_data);
          
          this.logger.info('キャッシュヒット', {
            cacheKey,
            eventCount: cachedData.events.length,
            cachedAt: row.created_at,
            age: Date.now() - new Date(row.created_at).getTime()
          });

          resolve({
            hit: true,
            data: cachedData.events,
            key: cacheKey,
            cachedAt: new Date(row.created_at),
            expiresAt: new Date(row.expires_at),
            generationTimeMs: row.calculation_duration_ms
          });
        } catch (parseError) {
          this.logger.error('キャッシュデータパースエラー', parseError, { cacheKey });
          resolve({
            hit: false,
            key: cacheKey
          });
        }
      });
    });
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
            this.logger.warn('月間キャッシュパースエラー', parseError, { 
              locationId: row.location_id 
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
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM events_cache 
        WHERE expires_at < CURRENT_TIMESTAMP OR is_valid = 0
      `;

      this.db.run(sql, [], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  /**
   * キャッシュ統計情報の取得
   */
  async getCacheStats(): Promise<CacheStats> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_entries,
          SUM(CASE WHEN is_valid = 1 AND expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as valid_entries,
          SUM(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired_entries,
          SUM(event_count) as total_events,
          AVG(calculation_duration_ms) as avg_calculation_time,
          MIN(created_at) as oldest_entry,
          MAX(updated_at) as newest_entry
        FROM events_cache
      `;

      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        // ファイルサイズの計算（概算）
        const avgEventSize = 200; // バイト
        const diskUsageMB = (row.total_events * avgEventSize) / (1024 * 1024);

        resolve({
          totalEntries: row.total_entries || 0,
          validEntries: row.valid_entries || 0,
          expiredEntries: row.expired_entries || 0,
          totalEvents: row.total_events || 0,
          avgCalculationTime: row.avg_calculation_time || 0,
          cacheHitRate: 0, // 実装時に別途計算
          oldestEntry: row.oldest_entry ? new Date(row.oldest_entry) : new Date(),
          newestEntry: row.newest_entry ? new Date(row.newest_entry) : new Date(),
          diskUsageMB
        });
      });
    });
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