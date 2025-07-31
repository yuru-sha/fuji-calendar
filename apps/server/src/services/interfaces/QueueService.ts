import { EventService } from './EventService';

/**
 * QueueService インターフェース
 * キューシステムの操作を定義
 */
export interface QueueService {
  /**
   * EventService を後から注入（循環依存対策）
   */
  setEventService(eventService: EventService): void;

  /**
   * 地点計算ジョブをスケジュール
   */
  scheduleLocationCalculation(
    locationId: number,
    startYear: number,
    endYear: number,
    priority?: 'low' | 'normal' | 'high'
  ): Promise<string | null>;

  /**
   * キューの統計情報を取得
   */
  getQueueStats(): Promise<any>;

  /**
   * Redis 接続テスト
   */
  testRedisConnection(): Promise<boolean>;

  /**
   * キューサービスを終了
   */
  shutdown(): Promise<void>;
}