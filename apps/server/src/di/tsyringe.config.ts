import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";

// Repositories
import { AuthRepository } from "../repositories/interfaces/AuthRepository";
import { PrismaAuthRepository } from "../repositories/PrismaAuthRepository";
import { CalendarRepository } from "../repositories/interfaces/CalendarRepository";
import { PrismaCalendarRepository } from "../repositories/PrismaCalendarRepository";
import { LocationRepository } from "../repositories/interfaces/LocationRepository";
import { PrismaLocationRepository } from "../repositories/PrismaLocationRepository";
import { SystemSettingsRepository } from "../repositories/interfaces/SystemSettingsRepository";
import { PrismaSystemSettingsRepository } from "../repositories/PrismaSystemSettingsRepository";

// Services
import { AuthService } from "../services/interfaces/AuthService";
import { AuthServiceImpl } from "../services/AuthService";
import { CalendarService } from "../services/interfaces/CalendarService";
import { CalendarServiceImpl } from "../services/CalendarService";
import { EventService } from "../services/interfaces/EventService";
import { EventServiceImpl }from "../services/EventServiceImpl";
import { LocationService } from "../services/LocationService";
import { QueueService } from "../services/interfaces/QueueService";
import { QueueServiceImpl } from "../services/QueueService";
import { SystemSettingsService } from "../services/SystemSettingsService";
import { AstronomicalCalculator } from "../services/interfaces/AstronomicalCalculator";
import { AstronomicalCalculatorImpl } from "../services/AstronomicalCalculator";
import { BatchCalculationService } from "../services/BatchCalculationService";
import { EventAggregationService } from "../services/EventAggregationService";
import { EventCacheService } from "../services/EventCacheService";
import { RedisService } from "../services/RedisService";

// Sub-calculators
import { CelestialPositionCalculator } from "../services/astronomical/CelestialPositionCalculator";
import { CoordinateCalculator } from "../services/astronomical/CoordinateCalculator";
import { FujiAlignmentCalculator } from "../services/astronomical/FujiAlignmentCalculator";
import { SeasonCalculator } from "../services/astronomical/SeasonCalculator";

export function configureContainer(c: typeof container): void {
  // PrismaClient
  c.register<PrismaClient>("PrismaClient", {
    useFactory: () => new PrismaClient(),
  });

  // Repositories
  c.register<AuthRepository>("AuthRepository", {
    useClass: PrismaAuthRepository,
  });
  c.register<CalendarRepository>("CalendarRepository", {
    useClass: PrismaCalendarRepository,
  });
  c.register<LocationRepository>("LocationRepository", {
    useClass: PrismaLocationRepository,
  });
  c.register<SystemSettingsRepository>("SystemSettingsRepository", {
    useClass: PrismaSystemSettingsRepository,
  });

  // Services
  c.register<AuthService>("AuthService", {
    useClass: AuthServiceImpl,
  });
  c.register<CalendarService>("CalendarService", {
    useClass: CalendarServiceImpl,
  });
  c.register<EventService>("EventService", {
    useClass: EventServiceImpl,
  });
  c.register<QueueService>("QueueService", {
    useClass: QueueServiceImpl,
  });
  c.register<AstronomicalCalculator>("AstronomicalCalculator", {
    useClass: AstronomicalCalculatorImpl,
  });

  // No interface for these, register as self
  c.register<LocationService>(LocationService, { useClass: LocationService });
  c.register<SystemSettingsService>(SystemSettingsService, { useClass: SystemSettingsService });
  c.register<BatchCalculationService>(BatchCalculationService, { useClass: BatchCalculationService });
  c.register<EventAggregationService>(EventAggregationService, { useClass: EventAggregationService });
  c.register<EventCacheService>(EventCacheService, { useClass: EventCacheService });
  c.register<RedisService>(RedisService, { useClass: RedisService });

  // Sub-calculators
  c.register<CelestialPositionCalculator>(CelestialPositionCalculator, { useClass: CelestialPositionCalculator });
  c.register<CoordinateCalculator>(CoordinateCalculator, { useClass: CoordinateCalculator });
  c.register<FujiAlignmentCalculator>(FujiAlignmentCalculator, { useClass: FujiAlignmentCalculator });
  c.register<SeasonCalculator>(SeasonCalculator, { useClass: SeasonCalculator });
}
