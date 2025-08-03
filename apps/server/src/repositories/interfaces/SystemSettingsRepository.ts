import { SystemSetting } from "@fuji-calendar/types";

export interface SystemSettingsRepository {
  /**
   * 設定値を取得する
   * @param settingKey 設定キー
   * @returns 設定値または null
   */
  getByKey(settingKey: string): Promise<SystemSetting | null>;

  /**
   * 設定値を作成または更新する
   * @param settingKey 設定キー
   * @param value 設定値
   * @param description 設定の説明
   * @returns 更新された設定
   */
  upsert(
    settingKey: string,
    value: any,
    description?: string,
  ): Promise<SystemSetting>;

  /**
   * 全ての設定を取得する
   * @returns 全設定のリスト
   */
  findAll(): Promise<SystemSetting[]>;

  /**
   * カテゴリ別の設定を取得する
   * @param category カテゴリ名
   * @returns カテゴリ別設定のリスト
   */
  findByCategory(category: string): Promise<SystemSetting[]>;
}
