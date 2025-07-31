#!/usr/bin/env node

// 2024 年末〜2025 年始の欠損データを修正

const { PrismaClient } = require('@prisma/client');

async function fixMissingYearBoundary() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 年境界データ修正開始 ===');
    
    // 欠損している日付
    const missingDates = [
      '2024-12-30',
      '2024-12-31', 
      '2025-01-01'
    ];
    
    console.log(`修正対象: ${missingDates.join(', ')}`);
    
    // 既存の類似データ（2024-12-29 と 2025-01-02）を参考にして再計算が必要
    console.log('\n 参考データ確認:');
    
    // 2024-12-29 のデータ
    const reference1 = await prisma.locationEvent.findMany({
      where: {
        eventDate: new Date('2024-12-29')
      },
      select: {
        locationId: true,
        eventType: true,
        azimuth: true,
        altitude: true
      }
    });
    
    // 2025-01-02 のデータ  
    const reference2 = await prisma.locationEvent.findMany({
      where: {
        eventDate: new Date('2025-01-02')
      },
      select: {
        locationId: true,
        eventType: true,
        azimuth: true,
        altitude: true
      }
    });
    
    console.log(`2024-12-29: ${reference1.length}件`);
    console.log(`2025-01-02: ${reference2.length}件`);
    
    // 手動計算は複雑なので、EventCacheService を呼び出して
    // 2024 年 12 月と 2025 年 1 月を再計算します
    
    console.log('\n❌ 手動修正は複雑です');
    console.log('解決方法:');
    console.log('1. EventCacheService.generateMonthlyCache(2024, 12) を実行');
    console.log('2. EventCacheService.generateMonthlyCache(2025, 1) を実行');
    console.log('3. または calculateMonthlyEvents を直接実行');
    
    console.log('\n=== 修正コマンド ===');
    console.log('以下のコマンドをサーバー側で実行する必要があります:');
    console.log('');
    console.log('```typescript');
    console.log('import { EventCacheService } from "./services/EventCacheService";');
    console.log('const eventCache = new EventCacheService();');
    console.log('await eventCache.generateMonthlyCache(2024, 12);');
    console.log('await eventCache.generateMonthlyCache(2025, 1);');
    console.log('```');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingYearBoundary().catch(console.error);