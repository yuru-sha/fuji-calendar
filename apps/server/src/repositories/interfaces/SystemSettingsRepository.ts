import { SystemSetting } from '@fuji-calendar/types';

export interface SystemSettingsRepository {
  /**
   * 設定値を取得する
   * @param key 設定キー
   * @returns 設定値または null
   */
  getByKey(key: string): Promise<SystemSetting | null>;

  /**
   * 設定値を作成または更新する
   * @param key 設定キー
   * @param value 設定値
   * @param description 設定の説明
   * @returns 更新された設定
   */
  upsert(key: string, value: string, description?: string): Promise<SystemSetting>;

  /**
   * 全ての設定を取得する
   * @returns 全設定のリスト
   */
  findAll(): Promise<SystemSetting[]>;

  /**
   * 有効な設定のみを取得する
   * @returns 有効な設定のリスト
   */
  findActive(): Promise<SystemSetting[]>;
}