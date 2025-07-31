#!/usr/bin/env node

// 2024 年末～2025 年始のデータが欠けている問題を調査（シンプル版）

const { PrismaClient } = require('@prisma/client');

async function debugMissingDates() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 2024 年末～2025 年始のデータ調査 ===');
    
    // 2024-12-29 から 2025-01-01 の期間を確認
    const startDate = new Date('2024-12-29');
    const endDate = new Date('2025-01-02');
    
    console.log(`調査期間: ${startDate.toISOString().split('T')[0]} ～ ${endDate.toISOString().split('T')[0]}`);
    
    // locationEvent テーブルのデータ確認
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
      
      // より広い範囲で確認
      console.log('\n=== より広い範囲で確認（12/25-1/5） ===');
      const widerEvents = await prisma.locationEvent.findMany({
        where: {
          eventDate: {
            gte: new Date('2024-12-25'),
            lt: new Date('2025-01-06')
          }
        },
        select: {
          eventDate: true,
          locationId: true,
          eventType: true
        },
        orderBy: {
          eventDate: 'asc'
        },
        take: 20
      });
      
      console.log(`12/25-1/5 期間のイベント数: ${widerEvents.length}`);
      if (widerEvents.length > 0) {
        console.log('最初の 10 件:');
        widerEvents.slice(0, 10).forEach(event => {
          console.log(`  ${event.eventDate.toISOString().split('T')[0]}: 地点${event.locationId} - ${event.eventType}`);
        });
      }
    } else {
      console.log('\n=== 期間内のイベント ===');
      events.forEach(event => {
        console.log(`${event.eventDate.toISOString().split('T')[0]}: 地点${event.locationId} - ${event.eventType}`);
      });
    }
    
    // 全期間のデータ範囲確認
    const [earliest, latest] = await Promise.all([
      prisma.locationEvent.findFirst({
        orderBy: { eventDate: 'asc' },
        select: { eventDate: true }
      }),
      prisma.locationEvent.findFirst({
        orderBy: { eventDate: 'desc' },
        select: { eventDate: true }
      })
    ]);
    
    console.log(`\n=== 全データの範囲 ===`);
    console.log(`最古: ${earliest?.eventDate.toISOString().split('T')[0] || '未確認'}`);
    console.log(`最新: ${latest?.eventDate.toISOString().split('T')[0] || '未確認'}`);
    
    // 総イベント数
    const totalEvents = await prisma.locationEvent.count();
    console.log(`総イベント数: ${totalEvents}件`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissingDates().catch(console.error);