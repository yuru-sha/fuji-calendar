#!/usr/bin/env node

// 2024 年 12 月 30 日, 31 日, 2025 年 1 月 1 日の欠損データを修正

require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    skipLibCheck: true
  }
});

const { EventCacheService } = require('./apps/server/src/services/EventCacheService.ts');
const { PrismaClientManager } = require('./apps/server/src/database/prisma.ts');

async function regenerateYearBoundary() {
  const eventCacheService = new EventCacheService();
  const prisma = PrismaClientManager.getInstance();
  
  try {
    console.log('=== 年境界の欠損データ修正開始 ===');
    
    // 欠損している特定の日付
    const missingDates = [
      { year: 2024, month: 12, day: 30 },
      { year: 2024, month: 12, day: 31 },
      { year: 2025, month: 1, day: 1 }
    ];
    
    // 全地点を取得
    const locations = await prisma.location.findMany();
    console.log(`対象地点数: ${locations.length}`);
    
    for (const { year, month, day } of missingDates) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log(`\n${dateStr} の再生成中...`);
      
      let totalEvents = 0;
      let successCount = 0;
      let errorCount = 0;
      
      for (const location of locations) {
        try {
          const result = await eventCacheService.generateLocationDayCache(location.id, year, month, day);
          if (result.success) {
            totalEvents += result.totalEvents;
            successCount++;
          } else {
            errorCount++;
            console.error(`  地点${location.id} (${location.name}) で失敗`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  地点${location.id} (${location.name}) で例外:`, error.message);
        }
      }
      
      console.log(`  ${dateStr} 完了: ${totalEvents}件のイベントを生成`);
      console.log(`  成功: ${successCount}地点, エラー: ${errorCount}地点`);
    }
    
    console.log('\n=== 修正結果の確認 ===');
    
    // 修正されたデータを確認
    for (const { year, month, day } of missingDates) {
      const date = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await prisma.locationEvent.count({
        where: {
          eventDate: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      const dateStr = date.toISOString().split('T')[0];
      console.log(`${dateStr}: ${count}件`);
    }
    
    console.log('\n✅ 年境界データの修正が完了しました');
    
  } catch (error) {
    console.error('処理中にエラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateYearBoundary().catch(console.error);