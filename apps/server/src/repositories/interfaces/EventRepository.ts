import { FujiEvent } from "@fuji-calendar/types";
import { getComponentLogger } from "@fuji-calendar/utils";

export interface EventRepository {
  /**
   * 指定されたロケーションと日付範囲のイベントを削除
   * @param locationId ロケーション ID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns 削除された件数
   */
  deleteByLocationAndDateRange(
    locationId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;

  /**
   * イベントのバッチ作成
   * @param events 作成するイベントの配列
   * @returns 作成された件数
   */
  createMany(events: Omit<FujiEvent, "id">[]): Promise<number>;

  /**
   * 指定されたロケーションと日付のイベント件数を取得
   * @param locationId ロケーション ID
   * @param date 日付
   * @returns イベント件数
   */
  countByLocationAndDate(locationId: number, date: Date): Promise<number>;

  /**
   * 月間イベントの統計を取得
   * @param year 年
   * @param month 月
   * @returns 月間統計
   */
  getMonthlyStats(
    year: number,
    month: number,
  ): Promise<
    {
      eventDate: Date;
      _count: { eventDate: number };
    }[]
  >;
}
