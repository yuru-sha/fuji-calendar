#!/usr/bin/env node

/**
 * 全期間・全地点のダイヤモンド・パール富士データを一括再計算
 * シーズンフィルタリング削除後の新しいロジックで全データを再生成
 */

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

async function regenerateAllEvents() {
  const eventCacheService = new EventCacheService();
  const prisma = PrismaClientManager.getInstance();
  
  try {
    console.log('=== 全データ一括再計算開始 ===');
    console.log('シーズンフィルタリング削除後の新ロジックで全期間を再計算します');
    
    // 対象年度の設定
    const targetYears = [2024, 2025, 2026];
    
    // 全地点を取得
    const locations = await prisma.location.findMany({
      select: { id: true, name: true, prefecture: true }
    });
    console.log(`対象地点数: ${locations.length}`);
    console.log(`対象年度: ${targetYears.join(', ')}`);
    
    let totalEvents = 0;
    let totalTime = 0;
    
    for (const year of targetYears) {
      console.log(`\n=== ${year}年の再計算開始 ===`);
      
      const startTime = Date.now();
      const result = await eventCacheService.generateYearlyCache(year);
      const endTime = Date.now();
      
      if (result.success) {
        totalEvents += result.totalEvents;
        totalTime += result.timeMs;
        console.log(`✅ ${year}年完了: ${result.totalEvents}件のイベントを生成 (${result.timeMs}ms)`);
      } else {
        console.error(`❌ ${year}年で失敗:`, result.error?.message);
      }
    }
    
    console.log('\n=== 再計算結果サマリー ===');
    console.log(`総イベント数: ${totalEvents.toLocaleString()}件`);
    console.log(`総処理時間: ${(totalTime / 1000).toFixed(1)}秒`);
    console.log(`平均処理速度: ${(totalEvents / (totalTime / 1000)).toFixed(0)}件/秒`);
    
    // 各年度のデータ数を確認
    console.log('\n=== 年度別データ確認 ===');
    for (const year of targetYears) {
      const count = await prisma.locationEvent.count({
        where: { calculationYear: year }
      });
      console.log(`${year}年: ${count.toLocaleString()}件`);
    }
    
    // 地点別データ数トップ 5 を表示
    console.log('\n=== 地点別イベント数（上位 5 地点） ===');
    const locationStats = await prisma.locationEvent.groupBy({
      by: ['locationId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });
    
    for (const stat of locationStats) {
      const location = locations.find(l => l.id === stat.locationId);
      console.log(`${location?.prefecture} ${location?.name}: ${stat._count.id}件`);
    }
    
    // 月別分布を確認
    console.log('\n=== 月別イベント分布（2025 年） ===');
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM event_date) as month,
        COUNT(*) as count
      FROM location_events 
      WHERE calculation_year = 2025
      GROUP BY EXTRACT(MONTH FROM event_date)
      ORDER BY month
    `;
    
    monthlyStats.forEach(stat => {
      console.log(`${stat.month}月: ${Number(stat.count).toLocaleString()}件`);
    });
    
    console.log('\n✅ 全データの一括再計算が完了しました');
    
  } catch (error) {
    console.error('処理中にエラーが発生:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理の Promise 拒否:', reason);
  process.exit(1);
});

regenerateAllEvents().catch(console.error);