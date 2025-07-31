import { Location, CreateLocationRequest } from '@fuji-calendar/types';
import { PrismaClientManager } from '../database/prisma';
import { LocationRepository } from './interfaces/LocationRepository';
import { getComponentLogger } from '@fuji-calendar/utils';

const logger = getComponentLogger('PrismaLocationRepository');

/**
 * Prisma を使用した LocationRepository の実装
 * データアクセス層を抽象化し、具体的な実装を分離
 */
export class PrismaLocationRepository implements LocationRepository {
  private prisma = PrismaClientManager.getInstance();

  async findAll(): Promise<Location[]> {
    logger.debug('全撮影地点取得開始');
    
    const locations = await this.prisma.location.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    logger.info('全撮影地点取得成功', {
      locationCount: locations.length
    });

    return locations.map(this.formatLocation);
  }

  async findById(id: number): Promise<Location | null> {
    logger.debug('撮影地点取得開始', { locationId: id });
    
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        events: {
          where: {
            eventDate: {
              gte: new Date()
            }
          },
          orderBy: {
            eventDate: 'asc'
          },
          take: 10
        }
      }
    });

    if (!location) {
      logger.warn('撮影地点が見つかりません', { locationId: id });
      return null;
    }

    logger.info('撮影地点取得成功', {
      locationId: id,
      locationName: location.name,
      upcomingEvents: location.events.length
    });

    return this.formatLocation(location);
  }

  async create(data: CreateLocationRequest & {
    fujiAzimuth?: number;
    fujiElevation?: number;
    fujiDistance?: number;
    measurementNotes?: string;
  }): Promise<Location> {
    logger.debug('撮影地点作成開始', { name: data.name });
    
    const location = await this.prisma.location.create({
      data: {
        name: data.name,
        prefecture: data.prefecture,
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        description: data.description,
        accessInfo: data.accessInfo,
        fujiAzimuth: data.fujiAzimuth,
        fujiElevation: data.fujiElevation,
        fujiDistance: data.fujiDistance,
        measurementNotes: data.measurementNotes
      }
    });

    logger.info('撮影地点作成成功', {
      locationId: location.id,
      locationName: location.name,
      prefecture: location.prefecture
    });

    return this.formatLocation(location);
  }

  async update(id: number, data: Partial<CreateLocationRequest> & {
    fujiAzimuth?: number;
    fujiElevation?: number;
    fujiDistance?: number;
    measurementNotes?: string;
  }): Promise<Location> {
    logger.debug('撮影地点更新開始', { locationId: id });
    
    const location = await this.prisma.location.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    logger.info('撮影地点更新成功', {
      locationId: id,
      locationName: location.name
    });

    return this.formatLocation(location);
  }

  async delete(id: number): Promise<void> {
    logger.debug('撮影地点削除開始', { locationId: id });
    
    await this.prisma.location.delete({
      where: { id }
    });

    logger.info('撮影地点削除成功', { locationId: id });
  }

  async updateFujiMetrics(id: number, metrics: {
    fujiAzimuth: number;
    fujiElevation: number;
    fujiDistance: number;
  }): Promise<void> {
    logger.debug('富士山メトリクス更新開始', { locationId: id });
    
    await this.prisma.location.update({
      where: { id },
      data: {
        fujiAzimuth: metrics.fujiAzimuth,
        fujiElevation: metrics.fujiElevation,
        fujiDistance: metrics.fujiDistance,
        updatedAt: new Date()
      }
    });

    logger.info('富士山メトリクス更新成功', {
      locationId: id,
      metrics
    });
  }

  async findByCondition(condition: {
    prefecture?: string;
    minElevation?: number;
    maxElevation?: number;
  }): Promise<Location[]> {
    logger.debug('条件検索開始', { condition });
    
    const where: any = {};
    
    if (condition.prefecture) {
      where.prefecture = condition.prefecture;
    }
    
    if (condition.minElevation !== undefined || condition.maxElevation !== undefined) {
      where.elevation = {};
      if (condition.minElevation !== undefined) {
        where.elevation.gte = condition.minElevation;
      }
      if (condition.maxElevation !== undefined) {
        where.elevation.lte = condition.maxElevation;
      }
    }

    const locations = await this.prisma.location.findMany({
      where,
      orderBy: {
        id: 'asc'
      }
    });

    logger.info('条件検索成功', {
      condition,
      locationCount: locations.length
    });

    return locations.map(this.formatLocation);
  }

  /**
   * Prisma の Location オブジェクトを型安全な Location オブジェクトに変換
   */
  private formatLocation(prismaLocation: any): Location {
    return {
      id: prismaLocation.id,
      name: prismaLocation.name,
      prefecture: prismaLocation.prefecture,
      latitude: prismaLocation.latitude,
      longitude: prismaLocation.longitude,
      elevation: prismaLocation.elevation,
      description: prismaLocation.description,
      accessInfo: prismaLocation.accessInfo,
      parkingInfo: prismaLocation.parkingInfo,
      fujiAzimuth: prismaLocation.fujiAzimuth,
      fujiElevation: prismaLocation.fujiElevation,
      fujiDistance: prismaLocation.fujiDistance,
      measurementNotes: prismaLocation.measurementNotes,
      createdAt: prismaLocation.createdAt,
      updatedAt: prismaLocation.updatedAt
    };
  }
}