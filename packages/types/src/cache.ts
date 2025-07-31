/**
 * イベントキャッシュ関連の型定義
 */

import { BaseFujiEvent, CalculationAccuracy } from './common';

/**
 * キャッシュエントリの基本型
 */
export interface EventsCacheEntry {
  cacheKey: string;
  year: number;
  month: number;
  day: number;
  locationId: number;
  eventsData: string; // JSON 文字列
  eventCount: number;
  calculationDurationMs?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

/**
 * キャッシュに保存するイベントデータ
 */
export interface CachedEventsData {
  events: BaseFujiEvent[];
  calculatedAt: Date;
  version: string; // キャッシュフォーマットのバージョン
  metadata: {
    locationName: string;
    totalCalculationTimeMs: number;
    astronomicalEngineVersion?: string;
    calculationAccuracy: CalculationAccuracy;
  };
}

/**
 * キャッシュキーの生成オプション
 */
export interface CacheKeyOptions {
  year: number;
  month: number;
  day?: number; // day が指定されない場合は月間キャッシュ
  locationId: number;
  calculationType?: 'all' | 'diamond' | 'pearl';
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalEvents: number;
  avgCalculationTime: number;
  cacheHitRate: number;
  oldestEntry: Date;
  newestEntry: Date;
  diskUsageMB: number;
}

/**
 * バッチ計算のジョブ定義
 */
export interface BatchCalculationJob {
  id: string;
  type: 'monthly' | 'daily' | 'yearly';
  year: number;
  month?: number;
  day?: number;
  locationIds: number[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

/**
 * キャッシュ設定オプション
 */
export interface CacheConfig {
  defaultExpiryDays: number;
  maxCacheSize: number; // MB
  cleanupIntervalHours: number;
  batchCalculationConcurrency: number;
  enableBackgroundRefresh: boolean;
  cacheVersion: string;
}

/**
 * キャッシュヒット/ミスの結果
 */
export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  key: string;
  cachedAt?: Date;
  expiresAt?: Date;
  generationTimeMs?: number;
}

/**
 * 月間キャッシュサマリー
 */
export interface MonthlyCacheSummary {
  year: number;
  month: number;
  locationId: number;
  totalCacheEntries: number;
  totalEvents: number;
  oldestCache: Date;
  newestCache: Date;
  avgCalculationTime: number;
  completionRate: number; // 0-1 の範囲
}

/**
 * プリロード優先度設定
 */
export interface PreloadPriority {
  currentMonth: number;
  nextMonth: number;
  previousMonth: number;
  futureMonths: number;
  popularLocations: number;
}

/**
 * キャッシュ更新通知
 */
export interface CacheUpdateNotification {
  type: 'cache_updated' | 'cache_expired' | 'batch_completed';
  year: number;
  month: number;
  locationId?: number;
  affectedKeys: string[];
  timestamp: Date;
}