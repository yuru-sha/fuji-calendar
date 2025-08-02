import { DIContainer } from "./DIContainer";
import { PrismaClient } from "@prisma/client";

// Repository インターフェースと実装
import { LocationRepository } from "../repositories/interfaces/LocationRepository";
import { PrismaLocationRepository } from "../repositories/PrismaLocationRepository";
import { CalendarRepository } from "../repositories/interfaces/CalendarRepository";
import { PrismaCalendarRepository } from "../repositories/PrismaCalendarRepository";
import { AuthRepository } from "../repositories/interfaces/AuthRepository";
import { PrismaAuthRepository } from "../repositories/PrismaAuthRepository";

// Service インターフェースと実装
import { AstronomicalCalculator } from "../services/interfaces/AstronomicalCalculator";
import { AstronomicalCalculatorImpl } from "../services/AstronomicalCalculator";
import { EventService } from "../services/interfaces/EventService";
import { EventServiceImpl } from "../services/EventServiceImpl";
import { EventCacheService } from "../services/EventCacheService";
import { LocationService } from "../services/LocationService";
import { QueueService as QueueServiceImpl } from "../services/QueueService";
import { QueueService } from "../services/interfaces/QueueService";
import { CalendarService } from "../services/interfaces/CalendarService";
import { CalendarServiceImpl } from "../services/CalendarService";
import { AuthService } from "../services/interfaces/AuthService";
import { AuthServiceImpl } from "../services/AuthService";
import { SystemSettingsService } from "../services/SystemSettingsService";
import { BatchCalculationService } from "../services/BatchCalculationService";

// Controller
import { LocationController } from "../controllers/LocationController";
import { CalendarController } from "../controllers/CalendarController";
import { AuthController } from "../controllers/AuthController";

import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("ServiceRegistry");

/**
 * サービス登録設定
 * アプリケーション全体の依存関係を一元管理
 */
export class ServiceRegistry {
  /**
   * DI コンテナにサービスを登録
   */
  static configure(container: DIContainer): void {
    logger.info("サービス登録開始");

    // PrismaClient の登録
    container.registerSingleton("PrismaClient", () => {
      logger.debug("PrismaClient インスタンス作成");
      return new PrismaClient();
    });

    // SystemSettingsService の登録
    container.registerSingleton("SystemSettingsService", (container) => {
      logger.debug("SystemSettingsService インスタンス作成");
      const prismaClient = container.resolve<PrismaClient>("PrismaClient");
      return new SystemSettingsService(prismaClient);
    });

    // Repository の登録
    container.registerSingleton("LocationRepository", () => {
      logger.debug("PrismaLocationRepository インスタンス作成");
      return new PrismaLocationRepository();
    });

    container.registerSingleton("CalendarRepository", () => {
      logger.debug("PrismaCalendarRepository インスタンス作成");
      return new PrismaCalendarRepository();
    });

    container.registerSingleton("AuthRepository", () => {
      logger.debug("PrismaAuthRepository インスタンス作成");
      return new PrismaAuthRepository();
    });

    // AstronomicalCalculator の登録
    container.registerSingleton("AstronomicalCalculator", (container) => {
      logger.debug("AstronomicalCalculatorImpl インスタンス作成");
      const settingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      return new AstronomicalCalculatorImpl(settingsService);
    });

    // EventCacheService の登録
    container.registerSingleton("EventCacheService", (container) => {
      logger.debug("EventCacheService インスタンス作成");
      const astronomicalCalculator = container.resolve<AstronomicalCalculator>(
        "AstronomicalCalculator",
      );
      return new EventCacheService(astronomicalCalculator);
    });

    // QueueService の登録（循環依存を避けるため最初に登録）
    container.registerSingleton("QueueService", () => {
      logger.debug("QueueService インスタンス作成");
      // EventService は後で setter で注入
      return new QueueServiceImpl(null);
    });

    // EventService の登録
    container.registerSingleton("EventService", (container) => {
      logger.debug("EventServiceImpl インスタンス作成");
      const astronomicalCalculator = container.resolve<AstronomicalCalculator>(
        "AstronomicalCalculator",
      );
      const eventCacheService =
        container.resolve<EventCacheService>("EventCacheService");
      const eventService = new EventServiceImpl(
        astronomicalCalculator,
        eventCacheService,
      );

      // QueueService に EventService を注入
      try {
        const queueService = container.resolve<QueueService>("QueueService");
        queueService.setEventService(eventService);
        logger.debug("QueueService に EventService 注入完了", {
          hasQueueService: !!queueService,
          hasEventService: !!eventService,
        });
      } catch (error) {
        logger.error("QueueService への EventService 注入エラー", error);
      }

      return eventService;
    });

    // LocationService の登録（EventService の後に移動）
    container.registerSingleton("LocationService", (container) => {
      logger.debug("LocationService インスタンス作成");
      const locationRepository =
        container.resolve<LocationRepository>("LocationRepository");
      const astronomicalCalculator = container.resolve<AstronomicalCalculator>(
        "AstronomicalCalculator",
      );
      // EventService を先に解決して、QueueService に注入されることを保証
      container.resolve<EventService>("EventService");
      const queueService = container.resolve<QueueService>("QueueService");
      return new LocationService(
        locationRepository,
        astronomicalCalculator,
        queueService,
      );
    });

    // CalendarService の登録
    container.registerSingleton("CalendarService", (container) => {
      logger.debug("CalendarService インスタンス作成");
      const calendarRepository =
        container.resolve<CalendarRepository>("CalendarRepository");
      return new CalendarServiceImpl(calendarRepository);
    });

    // AuthService の登録
    container.registerSingleton("AuthService", (container) => {
      logger.debug("AuthService インスタンス作成");
      const authRepository =
        container.resolve<AuthRepository>("AuthRepository");
      return new AuthServiceImpl(authRepository);
    });

    // BatchCalculationService の登録
    container.registerSingleton("BatchCalculationService", (container) => {
      logger.debug("BatchCalculationService インスタンス作成");
      const astronomicalCalculator = container.resolve<AstronomicalCalculator>(
        "AstronomicalCalculator",
      );
      const eventCacheService =
        container.resolve<EventCacheService>("EventCacheService");
      return new BatchCalculationService(
        astronomicalCalculator,
        eventCacheService,
      );
    });

    // Controller の登録（トランジェント：リクエストごとに新しいインスタンス）
    container.register("LocationController", (container?: DIContainer) => {
      logger.debug("LocationController インスタンス作成");
      const locationService =
        container!.resolve<LocationService>("LocationService");
      return new LocationController(locationService);
    });

    container.register("CalendarController", (container?: DIContainer) => {
      logger.debug("CalendarController インスタンス作成");
      const calendarService =
        container!.resolve<CalendarService>("CalendarService");
      return new CalendarController(calendarService);
    });

    container.register("AuthController", (container?: DIContainer) => {
      logger.debug("AuthController インスタンス作成");
      const authService = container!.resolve<AuthService>("AuthService");
      return new AuthController(authService);
    });

    logger.info("サービス登録完了", {
      registeredServices: container.getRegisteredServices(),
    });

    // 依存関係が正しく設定されたことをログ出力
    logger.debug("循環依存解決完了: QueueService ← EventService");
  }

  /**
   * 依存関係のテスト
   * 全てのサービスが正常に解決できるかチェック
   */
  static validateDependencies(container: DIContainer): boolean {
    logger.info("依存関係検証開始");

    try {
      // 全てのサービスを解決してみる
      const locationRepository =
        container.resolve<LocationRepository>("LocationRepository");
      const calendarRepository =
        container.resolve<CalendarRepository>("CalendarRepository");
      const authRepository =
        container.resolve<AuthRepository>("AuthRepository");
      const systemSettingsService = container.resolve<SystemSettingsService>(
        "SystemSettingsService",
      );
      const astronomicalCalculator = container.resolve<AstronomicalCalculator>(
        "AstronomicalCalculator",
      );
      const eventCacheService =
        container.resolve<EventCacheService>("EventCacheService");
      const eventService = container.resolve<EventService>("EventService");
      const locationService =
        container.resolve<LocationService>("LocationService");
      const calendarService =
        container.resolve<CalendarService>("CalendarService");
      const authService = container.resolve<AuthService>("AuthService");
      const queueService = container.resolve<QueueService>("QueueService");
      const batchCalculationService =
        container.resolve<BatchCalculationService>("BatchCalculationService");
      const locationController =
        container.resolve<LocationController>("LocationController");
      const calendarController =
        container.resolve<CalendarController>("CalendarController");
      const authController =
        container.resolve<AuthController>("AuthController");

      // インスタンスが正常に作成されたかチェック
      const validations = [
        { name: "LocationRepository", instance: locationRepository },
        { name: "CalendarRepository", instance: calendarRepository },
        { name: "AuthRepository", instance: authRepository },
        { name: "SystemSettingsService", instance: systemSettingsService },
        { name: "AstronomicalCalculator", instance: astronomicalCalculator },
        { name: "EventCacheService", instance: eventCacheService },
        { name: "EventService", instance: eventService },
        { name: "LocationService", instance: locationService },
        { name: "CalendarService", instance: calendarService },
        { name: "AuthService", instance: authService },
        { name: "QueueService", instance: queueService },
        { name: "BatchCalculationService", instance: batchCalculationService },
        { name: "LocationController", instance: locationController },
        { name: "CalendarController", instance: calendarController },
        { name: "AuthController", instance: authController },
      ];

      for (const validation of validations) {
        if (!validation.instance) {
          logger.error("サービス解決失敗", { serviceName: validation.name });
          return false;
        }
      }

      logger.info("依存関係検証成功", {
        validatedServices: validations.map((v) => v.name),
      });

      return true;
    } catch (error) {
      logger.error("依存関係検証エラー", error);
      return false;
    }
  }

  /**
   * 開発用：サービスの状態を表示
   */
  static debugServices(container: DIContainer): void {
    logger.info("=== DIContainer Debug Info ===");
    container.logStatus();

    const isValid = ServiceRegistry.validateDependencies(container);
    logger.info("依存関係の健全性", { isValid });
  }
}
