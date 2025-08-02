import { Location, CreateLocationRequest } from "@fuji-calendar/types";

/**
 * Location リポジトリインターフェース
 * データアクセス層の抽象化により、Controller 層から具体的な DB 実装を分離
 */
export interface LocationRepository {
  /**
   * 全ての撮影地点を取得
   */
  findAll(): Promise<Location[]>;

  /**
   * ID で撮影地点を取得
   */
  findById(id: number): Promise<Location | null>;

  /**
   * 新しい撮影地点を作成
   */
  create(
    data: CreateLocationRequest & {
      fujiAzimuth?: number;
      fujiElevation?: number;
      fujiDistance?: number;
      measurementNotes?: string;
    },
  ): Promise<Location>;

  /**
   * 撮影地点を更新
   */
  update(
    id: number,
    data: Partial<CreateLocationRequest> & {
      fujiAzimuth?: number;
      fujiElevation?: number;
      fujiDistance?: number;
      measurementNotes?: string;
    },
  ): Promise<Location>;

  /**
   * 撮影地点を削除
   */
  delete(id: number): Promise<void>;

  /**
   * 富士山への方位角・仰角・距離を更新
   */
  updateFujiMetrics(
    id: number,
    metrics: {
      fujiAzimuth: number;
      fujiElevation: number;
      fujiDistance: number;
    },
  ): Promise<void>;

  /**
   * 条件に基づいて撮影地点を検索
   */
  findByCondition(condition: {
    prefecture?: string;
    minElevation?: number;
    maxElevation?: number;
  }): Promise<Location[]>;
}
