import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("DIContainer");

/**
 * サービスファクトリー関数の型
 */
type ServiceFactory<T> = (container?: DIContainer) => T;

/**
 * シングルトンサービスファクトリー関数の型
 */
type SingletonServiceFactory<T> = (container: DIContainer) => T;

/**
 * 依存注入コンテナ
 * サービス間の依存関係を管理し、循環依存を解消
 */
export class DIContainer {
  private services = new Map<string, ServiceFactory<any>>();
  private singletons = new Map<string, any>();
  private singletonFactories = new Map<string, SingletonServiceFactory<any>>();

  /**
   * サービスを登録（毎回新しいインスタンスを作成）
   */
  register<T>(key: string, factory: ServiceFactory<T>): void {
    logger.debug("サービス登録", { key, type: "transient" });
    this.services.set(key, factory);
  }

  /**
   * シングルトンサービスを登録（1 回だけインスタンスを作成）
   */
  registerSingleton<T>(key: string, factory: SingletonServiceFactory<T>): void {
    logger.debug("シングルトンサービス登録", { key, type: "singleton" });
    this.singletonFactories.set(key, factory);
  }

  /**
   * サービスを解決
   */
  resolve<T>(key: string): T {
    logger.debug("サービス解決開始", { key });

    // シングルトンサービスのチェック
    if (this.singletons.has(key)) {
      logger.debug("シングルトンサービス返却", { key });
      return this.singletons.get(key) as T;
    }

    // シングルトンファクトリーのチェック
    if (this.singletonFactories.has(key)) {
      logger.debug("シングルトンサービス作成", { key });
      const factory = this.singletonFactories.get(key)!;
      const instance = factory(this);
      this.singletons.set(key, instance);
      return instance as T;
    }

    // 通常のサービスファクトリーのチェック
    if (this.services.has(key)) {
      logger.debug("トランジェントサービス作成", { key });
      const factory = this.services.get(key)!;
      return factory(this) as T;
    }

    // サービスが見つからない場合のエラー
    const error = new Error(`Service not found: ${key}`);
    logger.error("サービス解決エラー", error, { key });
    throw error;
  }

  /**
   * サービスが登録されているかチェック
   */
  has(key: string): boolean {
    return (
      this.services.has(key) ||
      this.singletonFactories.has(key) ||
      this.singletons.has(key)
    );
  }

  /**
   * 登録されているサービス一覧を取得
   */
  getRegisteredServices(): {
    transient: string[];
    singleton: string[];
    instances: string[];
  } {
    return {
      transient: Array.from(this.services.keys()),
      singleton: Array.from(this.singletonFactories.keys()),
      instances: Array.from(this.singletons.keys()),
    };
  }

  /**
   * シングルトンインスタンスをクリア（主にテスト用）
   */
  clearSingletons(): void {
    logger.info("シングルトンインスタンスクリア", {
      clearedCount: this.singletons.size,
    });
    this.singletons.clear();
  }

  /**
   * 全サービス登録をクリア（主にテスト用）
   */
  clear(): void {
    logger.info("DIContainer 全クリア", {
      transientServices: this.services.size,
      singletonFactories: this.singletonFactories.size,
      singletonInstances: this.singletons.size,
    });

    this.services.clear();
    this.singletonFactories.clear();
    this.singletons.clear();
  }

  /**
   * コンテナの状態をログに出力
   */
  logStatus(): void {
    const status = this.getRegisteredServices();
    logger.info("DIContainer 状態", {
      transientServices: status.transient,
      singletonServices: status.singleton,
      createdInstances: status.instances,
      totalServices: status.transient.length + status.singleton.length,
    });
  }

  // サービス固有のヘルパーメソッド
  getQueueService() {
    return this.resolve("QueueService");
  }

  getSystemSettingsService() {
    return this.resolve("SystemSettingsService");
  }

  /**
   * 依存関係の注入を実行（循環依存解決）
   */
  configureDependencies(): void {
    logger.info("依存関係注入の設定開始");
    
    try {
      // QueueServiceにSystemSettingsServiceを注入
      if (this.has("QueueService") && this.has("SystemSettingsService")) {
        const queueService = this.resolve("QueueService") as any;
        const systemSettingsService = this.resolve("SystemSettingsService") as any;
        
        if (queueService && typeof queueService.setSystemSettingsService === 'function') {
          queueService.setSystemSettingsService(systemSettingsService);
          logger.info("QueueServiceにSystemSettingsServiceを注入完了");
        }
      }

      // パフォーマンス設定の初期化
      if (this.has("SystemSettingsService")) {
        const systemSettingsService = this.resolve("SystemSettingsService") as any;
        if (systemSettingsService && typeof systemSettingsService.initializePerformanceSettings === 'function') {
          systemSettingsService.initializePerformanceSettings().catch((error: any) => {
            logger.warn("パフォーマンス設定初期化失敗", error);
          });
        }
      }
      
      logger.info("依存関係注入の設定完了");
    } catch (error) {
      logger.error("依存関係注入の設定でエラー", error);
    }
  }
}
