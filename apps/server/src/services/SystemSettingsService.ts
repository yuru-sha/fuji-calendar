import { PrismaClient } from "@prisma/client";
import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("SystemSettingsService");

/**
 * システム設定管理サービス
 * 天体計算の定数値などを DB で管理し、運用中に調整可能にする
 */
export class SystemSettingsService {
  private prisma: PrismaClient;
  private settingsCache: Map<string, any> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private readonly CACHE_DURATION = 60 * 1000; // 1 分間キャッシュ

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 設定値を取得（キャッシュ付き）
   */
  async getSetting<T = any>(settingKey: string, defaultValue?: T): Promise<T> {
    // キャッシュの有効期限をチェック
    if (Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_DURATION) {
      await this.refreshCache();
    }

    if (this.settingsCache.has(settingKey)) {
      return this.settingsCache.get(settingKey) as T;
    }

    // キャッシュにない場合は DB から取得
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { settingKey },
      });

      if (setting) {
        const value = this.parseSettingValue(setting);
        this.settingsCache.set(settingKey, value);
        return value as T;
      }
    } catch (error) {
      logger.error("設定値取得エラー", { settingKey, error });
    }

    // デフォルト値を返す
    if (defaultValue !== undefined) {
      this.settingsCache.set(settingKey, defaultValue);
      return defaultValue;
    }

    throw new Error(
      `Setting not found and no default value provided: ${settingKey}`,
    );
  }

  /**
   * 数値設定を取得
   */
  async getNumberSetting(
    settingKey: string,
    defaultValue?: number,
  ): Promise<number> {
    return this.getSetting<number>(settingKey, defaultValue);
  }

  /**
   * 文字列設定を取得
   */
  async getStringSetting(
    settingKey: string,
    defaultValue?: string,
  ): Promise<string> {
    return this.getSetting<string>(settingKey, defaultValue);
  }

  /**
   * 真偽値設定を取得
   */
  async getBooleanSetting(
    settingKey: string,
    defaultValue?: boolean,
  ): Promise<boolean> {
    return this.getSetting<boolean>(settingKey, defaultValue);
  }

  /**
   * 設定値を更新
   */
  async updateSetting(
    settingKey: string,
    value: any,
    settingType?: string,
  ): Promise<void> {
    try {
      const updateData = this.prepareUpdateData(value, settingType);
      const category = this.inferCategoryFromKey(settingKey);

      await this.prisma.systemSetting.upsert({
        where: { settingKey },
        update: {
          ...updateData,
          updatedAt: new Date(),
        },
        create: {
          settingKey,
          settingType: settingType || this.inferSettingType(value),
          category: category, // カテゴリを設定
          ...updateData,
        },
      });

      // キャッシュを更新
      this.settingsCache.set(settingKey, value);

      logger.info("設定値更新", { settingKey, value, settingType, category });
    } catch (error) {
      logger.error("設定値更新エラー", { settingKey, value, error });
      throw error;
    }
  }

  /**
   * 設定値を更新して更新後の設定オブジェクトを返す
   */
  async updateSettingAndReturn(
    settingKey: string,
    value: any,
    settingType?: string,
  ): Promise<any | null> {
    try {
      const updateData = this.prepareUpdateData(value, settingType);

      // 既存の設定を取得してcategoryを確認
      const existingSetting = await this.prisma.systemSetting.findUnique({
        where: { settingKey },
      });

      const updatedSetting = await this.prisma.systemSetting.upsert({
        where: { settingKey },
        update: {
          ...updateData,
          updatedAt: new Date(),
        },
        create: {
          settingKey,
          settingType: settingType || this.inferSettingType(value),
          category: existingSetting?.category || "performance", // デフォルトカテゴリを設定
          ...updateData,
        },
      });

      // キャッシュを更新
      this.settingsCache.set(settingKey, value);

      logger.info("設定値更新", { settingKey, value, settingType });
      return updatedSetting;
    } catch (error) {
      logger.error("設定値更新エラー", { settingKey, value, error });
      throw error;
    }
  }

  /**
   * カテゴリ別設定一覧を取得
   */
  async getSettingsByCategory(category: string): Promise<any[]> {
    try {
      return await this.prisma.systemSetting.findMany({
        where: { category },
        orderBy: { settingKey: "asc" },
      });
    } catch (error) {
      logger.error("カテゴリ別設定取得エラー", { category, error });
      throw error;
    }
  }

  /**
   * 全設定一覧を取得
   */
  async getAllSettings(): Promise<any[]> {
    try {
      return await this.prisma.systemSetting.findMany({
        orderBy: [{ category: "asc" }, { settingKey: "asc" }],
      });
    } catch (error) {
      logger.error("全設定取得エラー", error);
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  async clearCache(): Promise<void> {
    logger.info("システム設定キャッシュクリア開始");
    this.settingsCache.clear();
    this.lastCacheUpdate = new Date(0); // 古い日付に設定してキャッシュを無効化
    logger.info("システム設定キャッシュクリア完了");
  }

  /**
   * キャッシュをリフレッシュ
   */
  async refreshCache(): Promise<void> {
    try {
      const settings = await this.prisma.systemSetting.findMany();

      this.settingsCache.clear();
      settings.forEach((setting: any) => {
        const value = this.parseSettingValue(setting);
        this.settingsCache.set(setting.settingKey, value);
      });

      this.lastCacheUpdate = new Date();
      logger.debug("設定キャッシュを更新", { settingsCount: settings.length });
    } catch (error) {
      logger.error("キャッシュ更新エラー", error);
      throw error;
    }
  }

  /**
   * 設定値をパース
   */
  private parseSettingValue(setting: any): any {
    switch (setting.settingType) {
      case "number":
        return setting.numberValue;
      case "string":
        return setting.stringValue;
      case "boolean":
        return setting.booleanValue;
      default:
        return setting.stringValue; // デフォルトは文字列
    }
  }

  /**
   * 更新データを準備
   */
  private prepareUpdateData(value: any, settingType?: string): any {
    const type = settingType || this.inferSettingType(value);

    switch (type) {
      case "number":
        return {
          settingType: "number",
          numberValue: Number(value),
          stringValue: null,
          booleanValue: null,
        };
      case "boolean":
        return {
          settingType: "boolean",
          numberValue: null,
          stringValue: null,
          booleanValue: Boolean(value),
        };
      case "string":
      default:
        return {
          settingType: "string",
          numberValue: null,
          stringValue: String(value),
          booleanValue: null,
        };
    }
  }

  /**
   * 値から設定タイプを推測
   */
  private inferSettingType(value: any): string {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string";
  }

  /**
   * 設定キーからカテゴリを推論
   */
  private inferCategoryFromKey(settingKey: string): string {
    if (settingKey.includes('worker_') || settingKey.includes('job_') || settingKey.includes('processing_') || settingKey.includes('concurrency') || settingKey.includes('max_active')) {
      return 'performance';
    }
    if (settingKey.includes('azimuth_') || settingKey.includes('elevation_') || settingKey.includes('sun_') || settingKey.includes('moon_') || settingKey.includes('search_')) {
      return 'astronomical';
    }
    if (settingKey.includes('ui_') || settingKey.includes('theme_') || settingKey.includes('display_')) {
      return 'ui';
    }
    // デフォルトは performance
    return 'performance';
  }

  /**
   * 天体計算設定を一括取得（パフォーマンス用）
   */
  async getAstronomicalSettings(): Promise<{
    azimuthTolerance: number;
    elevationTolerance: number;
    searchInterval: number;
    sunAngularDiameter: number;
    moonAngularDiameter: number;
  }> {
    // キャッシュを更新
    if (Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_DURATION) {
      await this.refreshCache();
    }

    return {
      azimuthTolerance: await this.getNumberSetting("azimuth_tolerance", 0.05),
      elevationTolerance: await this.getNumberSetting(
        "elevation_tolerance",
        0.05,
      ),
      searchInterval: await this.getNumberSetting("search_interval", 10),
      sunAngularDiameter: await this.getNumberSetting(
        "sun_angular_diameter",
        0.53,
      ),
      moonAngularDiameter: await this.getNumberSetting(
        "moon_angular_diameter",
        0.52,
      ),
    };
  }

  /**
   * パフォーマンス設定を一括取得（負荷制御用）
   */
  async getPerformanceSettings(): Promise<{
    workerConcurrency: number;
    jobDelay: number;
    processingDelay: number;
    enableLowPriorityMode: boolean;
    maxActiveJobs: number;
  }> {
    // キャッシュを更新
    if (Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_DURATION) {
      await this.refreshCache();
    }

    return {
      workerConcurrency: await this.getNumberSetting("worker_concurrency", 1),
      jobDelay: await this.getNumberSetting("job_delay_ms", 5000),
      processingDelay: await this.getNumberSetting("processing_delay_ms", 2000),
      enableLowPriorityMode: await this.getBooleanSetting("enable_low_priority_mode", true),
      maxActiveJobs: await this.getNumberSetting("max_active_jobs", 3),
    };
  }

  /**
   * パフォーマンス設定を初期化
   */
  async initializePerformanceSettings(): Promise<void> {
    const defaultSettings = [
      { key: "worker_concurrency", value: 1, type: "number", description: "各ワーカープロセス内での同時実行ジョブ数。2台のワーカーで値が2なら、システム全体で最大4ジョブが並列実行される" },
      { key: "job_delay_ms", value: 5000, type: "number", description: "ジョブ実行間隔（ミリ秒）" },
      { key: "processing_delay_ms", value: 2000, type: "number", description: "処理間の待機時間（ミリ秒）" },
      { key: "enable_low_priority_mode", value: true, type: "boolean", description: "低優先度モードの有効化" },
      { key: "max_active_jobs", value: 3, type: "number", description: "システム全体で同時実行可能なジョブの上限数。ワーカー数に関係なく、この値を超えるジョブは待機状態になる" },
    ];

    for (const setting of defaultSettings) {
      try {
        // 既存の設定があるかチェック
        const existing = await this.prisma.systemSetting.findUnique({
          where: { settingKey: setting.key },
        });

        if (!existing) {
          await this.prisma.systemSetting.create({
            data: {
              settingKey: setting.key,
              settingType: setting.type,
              category: "performance",
              description: setting.description,
              editable: true,
              numberValue: setting.type === "number" ? setting.value as number : null,
              stringValue: setting.type === "string" ? String(setting.value) : null,
              booleanValue: setting.type === "boolean" ? setting.value as boolean : null,
            },
          });

          logger.info("パフォーマンス設定を初期化", {
            settingKey: setting.key,
            value: setting.value,
            type: setting.type,
          });
        }
      } catch (error) {
        logger.error("パフォーマンス設定初期化エラー", { 
          settingKey: setting.key, 
          error 
        });
      }
    }

    // キャッシュをリフレッシュ
    await this.refreshCache();
  }
}
