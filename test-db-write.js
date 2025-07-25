/**
 * データベース書き込みテスト
 * キューシステムが正常にlocation_fuji_eventsテーブルに書き込むかテスト
 */

const { PrismaClient } = require('@prisma/client');

async function testDatabaseWrite() {
  console.log('🗄️  データベース書き込みテスト開始...\n');

  const prisma = new PrismaClient();

  try {
    // 1. データベース接続確認
    console.log('1. データベース接続テスト');
    await prisma.$connect();
    console.log('✅ データベース接続成功');

    // 2. location_fuji_eventsテーブルの現在の件数を確認
    console.log('\n2. 現在のデータ状況確認');
    const currentCount = await prisma.locationFujiEvent.count();
    console.log('現在のイベント件数:', currentCount);

    // 年別の集計も表示
    const currentYear = new Date().getFullYear();
    const currentYearCount = await prisma.locationFujiEvent.count({
      where: { calculationYear: currentYear }
    });
    console.log(`${currentYear}年のイベント件数:`, currentYearCount);

    // 3. 利用可能な地点を確認
    console.log('\n3. 利用可能地点確認');
    const locations = await prisma.location.findMany({
      select: { id: true, name: true, prefecture: true },
      orderBy: { id: 'asc' },
      take: 5 // 最初の5件のみ
    });
    
    if (locations.length === 0) {
      console.log('❌ 地点データがありません。まず地点を作成してください。');
      await prisma.$disconnect();
      return;
    }

    console.log('利用可能地点:');
    locations.forEach(loc => {
      console.log(`  ID:${loc.id} - ${loc.name} (${loc.prefecture})`);
    });

    // 4. テスト用地点でキューに月間計算ジョブを追加
    const testLocationId = locations[0].id;
    const testYear = currentYear;
    const testMonth = new Date().getMonth() + 1; // 現在の月

    console.log(`\n4. テストジョブ投入 (地点ID: ${testLocationId}, ${testYear}年${testMonth}月)`);
    
    // QueueServiceをインポートして使用
    const { queueService } = require('./src/server/services/QueueService');
    
    const jobId = await queueService.scheduleMonthlyCalculation(
      testLocationId,
      testYear,
      testMonth,
      'high', // 高優先度
      'db-write-test'
    );
    
    console.log('✅ テストジョブ投入成功');
    console.log('ジョブID:', jobId);

    // 5. 短時間後にジョブの状態を確認
    console.log('\n5. ジョブ状態確認（3秒後）');
    setTimeout(async () => {
      try {
        const progress = await queueService.getJobProgress(jobId, 'monthly');
        if (progress) {
          console.log('ジョブ状態:', progress.state);
          console.log('進捗:', progress.progress || 'N/A');
          console.log('作成時刻:', new Date(progress.createdAt).toLocaleString('ja-JP'));
          if (progress.processedAt) {
            console.log('処理開始時刻:', new Date(progress.processedAt).toLocaleString('ja-JP'));
          }
          if (progress.finishedAt) {
            console.log('完了時刻:', new Date(progress.finishedAt).toLocaleString('ja-JP'));
          }
          if (progress.failedReason) {
            console.log('失敗理由:', progress.failedReason);
          }
        } else {
          console.log('ジョブが見つかりません');
        }

        // 6. データベースの変化を確認（10秒後）
        setTimeout(async () => {
          try {
            console.log('\n6. データベース変化確認（処理完了後）');
            const newCount = await prisma.locationFujiEvent.count();
            const newYearCount = await prisma.locationFujiEvent.count({
              where: { calculationYear: testYear }
            });
            
            console.log('処理後のイベント件数:', newCount);
            console.log(`${testYear}年のイベント件数:`, newYearCount);
            console.log('増加件数:', newCount - currentCount);

            // 該当地点・月のデータを確認
            const testMonthStart = new Date(testYear, testMonth - 1, 1);
            const testMonthEnd = new Date(testYear, testMonth, 0, 23, 59, 59, 999);
            
            const monthlyEvents = await prisma.locationFujiEvent.findMany({
              where: {
                locationId: testLocationId,
                calculationYear: testYear,
                eventTime: {
                  gte: testMonthStart,
                  lte: testMonthEnd
                }
              },
              orderBy: { eventTime: 'asc' },
              take: 3 // 最初の3件のみ表示
            });

            console.log(`\n${testYear}年${testMonth}月の新しいイベント例:`);
            monthlyEvents.forEach(event => {
              console.log(`  ${event.eventTime.toLocaleDateString('ja-JP')} ${event.eventTime.toLocaleTimeString('ja-JP')} - ${event.eventType} (方位: ${event.azimuth}°, 高度: ${event.altitude}°)`);
            });

            if (monthlyEvents.length > 0) {
              console.log('\n🎉 データベース書き込み成功！');
              console.log('キューシステムは正常に動作しています。');
            } else {
              console.log('\n❌ データベースに新しいイベントが見つかりません');
              console.log('ワーカープロセスが起動しているか確認してください: npm run dev:worker');
            }

            await prisma.$disconnect();
            process.exit(0);

          } catch (error) {
            console.error('❌ データベース確認エラー:', error.message);
            await prisma.$disconnect();
            process.exit(1);
          }
        }, 10000); // 10秒後

      } catch (error) {
        console.error('❌ ジョブ状態確認エラー:', error.message);
      }
    }, 3000); // 3秒後

  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  testDatabaseWrite().catch(console.error);
}

module.exports = testDatabaseWrite;