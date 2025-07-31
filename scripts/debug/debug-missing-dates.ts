#!/usr/bin/env node

// 2024 年末～2025 年始のデータが欠けている問題を調査

import { PrismaClientManager } from './apps/server/src/database/prisma';

async function debugMissingDates() {
  const prisma = PrismaClientManager.getInstance();
  
  try {
    console.log('=== 2024 年末～2025 年始のデータ調査 ===');
    
    // 対象期間のデータを確認
    const startDate = new Date('2024-12-29T00:00:00Z');
    const endDate = new Date('2025-01-02T00:00:00Z');
    
    console.log(`調査期間: ${startDate.toISOString()} ～ ${endDate.toISOString()}`);
    
    // イベントデータの存在確認
    const events = await prisma.locationEvent.findMany({
      where: {
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      },
      select: {
        eventDate: true,
        locationId: true,
        eventType: true
      },
      orderBy: {
        eventDate: 'asc'
      }
    });
    
    console.log(`\n 見つかったイベント数: ${events.length}`);
    
    if (events.length === 0) {
      console.log('❌ この期間にイベントデータが存在しません');
    } else {
      console.log('\n=== イベント一覧 ===');
      events.forEach((event: any) => {
        console.log(`${event.eventDate.toISOString().split('T')[0]}: 地点${event.locationId} - ${event.eventType}`);
      });
    }
    
    // 日付別の集計
    const dateGroups = events.reduce((acc: Record<string, number>, event: any) => {
      const dateStr = event.eventDate.toISOString().split('T')[0];
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n=== 日付別イベント数 ===');
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = dateGroups[dateStr] || 0;
      console.log(`${dateStr}: ${count}件`);
    }
    
    // 全地点数確認
    const locationCount = await prisma.location.count();
    console.log(`\n 総地点数: ${locationCount}`);
    
    // 最新のイベントデータ確認
    const latestEvent = await prisma.locationEvent.findFirst({
      orderBy: {
        eventDate: 'desc'
      },
      select: {
        eventDate: true,
        locationId: true
      }
    });
    
    const oldestEvent = await prisma.locationEvent.findFirst({
      orderBy: {
        eventDate: 'asc'
      },
      select: {
        eventDate: true,
        locationId: true
      }
    });
    
    console.log(`\n 最新イベント日付: ${latestEvent?.eventDate.toISOString().split('T')[0] || '未確認'}`);
    console.log(`最古イベント日付: ${oldestEvent?.eventDate.toISOString().split('T')[0] || '未確認'}`);
    
    // 2024 年 12 月と 2025 年 1 月の境界付近のデータ確認
    console.log('\n=== 年末年始前後のデータ確認 ===');
    const aroundNewYear = await prisma.locationEvent.findMany({
      where: {
        eventDate: {
          gte: new Date('2024-12-25T00:00:00Z'),
          lt: new Date('2025-01-05T00:00:00Z')
        }
      },
      select: {
        eventDate: true,
        locationId: true,
        eventType: true
      },
      orderBy: {
        eventDate: 'asc'
      }
    });
    
    const newYearGroups = aroundNewYear.reduce((acc: Record<string, number>, event: any) => {
      const dateStr = event.eventDate.toISOString().split('T')[0];
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});
    
    for (let d = new Date('2024-12-25'); d < new Date('2025-01-05'); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = newYearGroups[dateStr] || 0;
      console.log(`${dateStr}: ${count}件`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissingDates().catch(console.error);