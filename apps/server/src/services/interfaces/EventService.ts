/**
 * Event サービスインターフェース
 * 循環依存を解消するため、EventCacheService とその関連サービスを抽象化
 */
export interface EventService {
  /**
   * 特定の撮影地点の天体イベントキャッシュを生成
   */
  generateLocationCache(locationId: number, year: number): Promise<CacheResult>;

  /**
   * 月間天体イベントを計算
   */
  calculateMonthlyEvents(
    year: number,
    month: number,
    locationIds: number[],
  ): Promise<MonthlyEventResult>;

  /**
   * 年間天体イベントを計算
   */
  calculateYearlyEvents(
    year: number,
    locationIds: number[],
  ): Promise<YearlyEventResult>;

  /**
   * イベントキャッシュの健全性チェック
   */
  validateEventCache(
    locationId: number,
    year: number,
  ): Promise<CacheValidationResult>;
}

/**
 * キャッシュ生成結果
 */
export interface CacheResult {
  success: boolean;
  locationId: number;
  year: number;
  eventsGenerated: number;
  processingTime: number;
  errors?: string[];
}

/**
 * 月間イベント計算結果
 */
export interface MonthlyEventResult {
  success: boolean;
  year: number;
  month: number;
  locationCount: number;
  eventsGenerated: number;
  processingTime: number;
  errors?: string[];
}

/**
 * 年間イベント計算結果
 */
export interface YearlyEventResult {
  success: boolean;
  year: number;
  locationCount: number;
  eventsGenerated: number;
  processingTime: number;
  errors?: string[];
}

/**
 * キャッシュ検証結果
 */
export interface CacheValidationResult {
  isValid: boolean;
  locationId: number;
  year: number;
  expectedEvents: number;
  actualEvents: number;
  missingMonths: number[];
  recommendations?: string[];
}
