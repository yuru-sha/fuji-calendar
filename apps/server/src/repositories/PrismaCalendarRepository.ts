// import { PrismaClient } from '@prisma/client';
import { Location, FujiEvent, CalendarStats } from '@fuji-calendar/types';
import { CalendarRepository } from './interfaces/CalendarRepository';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '@fuji-calendar/utils';

const logger = getComponentLogger('prisma-calendar-repository');

export class PrismaCalendarRepository implements CalendarRepository {
  private prisma = PrismaClientManager.getInstance();

  async getMonthlyEvents(year: number, month: number): Promise<FujiEvent[]> {
    // 月の範囲を計算
    const monthStartDate = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);
    
    // カレンダー表示範囲の計算（前月末〜翌月初を含む）
    // 月初の日曜日を取得
    const calendarStartDate = new Date(monthStartDate);
    calendarStartDate.setDate(calendarStartDate.getDate() - calendarStartDate.getDay());
    
    // 月末が含まれる週の土曜日まで
    const calendarEndDate = new Date(monthEndDate);
    calendarEndDate.setDate(calendarEndDate.getDate() + (6 - calendarEndDate.getDay()));
    calendarEndDate.setHours(23, 59, 59, 999);
    
    logger.debug('getMonthlyEvents: 日付範囲設定', {
      year,
      month,
      monthStart: monthStartDate.toISOString(),
      monthEnd: monthEndDate.toISOString(),
      calendarStart: calendarStartDate.toISOString(),
      calendarEnd: calendarEndDate.toISOString(),
      totalDaysCalculated: Math.ceil((calendarEndDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    });
    
    const events = await this.prisma.locationEvent.findMany({
      where: {
        eventDate: {
          gte: calendarStartDate,
          lte: calendarEndDate,
        },
      },
      include: {
        location: true,
      },
      orderBy: [
        { eventDate: 'asc' },
        { eventTime: 'asc' },
      ],
    });

    return events.map(event => this.mapToFujiEvent(event));
  }

  async getDayEvents(date: string): Promise<FujiEvent[]> {
    const targetDate = new Date(date + 'T00:00:00.000Z');
    
    const events = await this.prisma.locationEvent.findMany({
      where: {
        eventDate: targetDate,
      },
      include: {
        location: true,
      },
      orderBy: [
        { eventTime: 'asc' },
      ],
    });

    return events.map(event => this.mapToFujiEvent(event));
  }

  async getUpcomingEvents(limit: number = 50): Promise<FujiEvent[]> {
    const now = new Date();
    
    const events = await this.prisma.locationEvent.findMany({
      where: {
        eventDate: {
          gte: now,
        },
      },
      include: {
        location: true,
      },
      orderBy: [
        { eventDate: 'asc' },
        { eventTime: 'asc' },
      ],
      take: limit,
    });

    return events.map(event => this.mapToFujiEvent(event));
  }

  async getLocationYearlyEvents(locationId: number, year: number): Promise<FujiEvent[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 0);
    // 年末日の 23:59:59.999 に設定して、その日のイベントも確実に含める
    endDate.setHours(23, 59, 59, 999);
    
    const events = await this.prisma.locationEvent.findMany({
      where: {
        locationId: locationId,
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        location: true,
      },
      orderBy: [
        { eventDate: 'asc' },
        { eventTime: 'asc' },
      ],
    });

    return events.map(event => this.mapToFujiEvent(event));
  }

  async getCalendarStats(year: number): Promise<CalendarStats> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 0);
    // 年末日の 23:59:59.999 に設定して、その日のイベントも確実に含める
    endDate.setHours(23, 59, 59, 999);

    const [
      totalEvents,
      diamondEvents,
      pearlEvents,
      activeLocations,
    ] = await Promise.all([
      this.prisma.locationEvent.count({
        where: {
          eventDate: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.locationEvent.count({
        where: {
          eventDate: { gte: startDate, lte: endDate },
          eventType: { in: ['diamond_sunrise', 'diamond_sunset'] },
        },
      }),
      this.prisma.locationEvent.count({
        where: {
          eventDate: { gte: startDate, lte: endDate },
          eventType: { in: ['pearl_moonrise', 'pearl_moonset'] },
        },
      }),
      this.prisma.location.count({
        where: {
          events: {
            some: {
              eventDate: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
    ]);

    return {
      year,
      totalEvents,
      diamondEvents,
      pearlEvents,
      activeLocations,
    };
  }

  async getActiveLocations(): Promise<Location[]> {
    const locations = await this.prisma.location.findMany({
      where: {
        events: {
          some: {},
        },
      },
      orderBy: [
        { prefecture: 'asc' },
        { name: 'asc' },
      ],
    });

    return locations.map(location => ({
      id: location.id,
      name: location.name,
      prefecture: location.prefecture,
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
      fujiDistance: location.fujiDistance,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation,
      accessInfo: location.accessInfo || undefined,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    }));
  }

  async countEventsByDate(startDate: string, endDate: string): Promise<{ date: string; count: number }[]> {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    const results = await this.prisma.locationEvent.groupBy({
      by: ['eventDate'],
      where: {
        eventDate: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    return results.map(result => ({
      date: result.eventDate.toISOString().split('T')[0],
      count: result._count.id,
    }));
  }

  private mapToFujiEvent(event: any): FujiEvent {
    // EventType から適切な型に変換
    const eventType = event.eventType.startsWith('diamond') ? 'diamond' : 'pearl';
    const subType = event.eventType.includes('sunrise') || event.eventType.includes('moonrise') ? 'sunrise' : 'sunset';
    
    return {
      id: event.id.toString(),
      type: eventType,
      subType: subType,
      time: event.eventTime,
      location: {
        id: event.location.id,
        name: event.location.name,
        prefecture: event.location.prefecture,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        elevation: event.location.elevation,
        fujiDistance: event.location.fujiDistance,
        fujiAzimuth: event.location.fujiAzimuth,
        fujiElevation: event.location.fujiElevation,
        accessInfo: event.location.accessInfo || undefined,
        createdAt: event.location.createdAt,
        updatedAt: event.location.updatedAt,
      },
      azimuth: event.azimuth,
      elevation: event.altitude,
      moonPhase: event.moonPhase || 0,
      accuracy: event.accuracy as 'perfect' | 'excellent' | 'good' | 'fair' || 'fair',
    };
  }
}