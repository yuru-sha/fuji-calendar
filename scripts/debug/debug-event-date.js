/**
 * event_dateとevent_timeの整合性チェック
 */

const { PrismaClient } = require('@prisma/client');

async function debugEventDate() {
  console.log('📅 event_dateとevent_timeの整合性チェック開始...\n');

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    // 1. 全てのイベントのevent_dateとevent_timeを確認
    console.log('1. event_dateとevent_timeの比較');
    const events = await prisma.locationFujiEvent.findMany({
      select: {
        id: true,
        eventDate: true,
        eventTime: true,
        eventType: true,
        location: {
          select: { name: true }
        }
      },
      orderBy: { eventTime: 'asc' },
      take: 10
    });

    console.log('データ例:');
    events.forEach(event => {
      const eventDate = new Date(event.eventDate);
      const eventTime = new Date(event.eventTime);
      
      // 日付部分のみを比較
      const eventDateStr = eventDate.toLocaleDateString('ja-JP');
      const eventTimeStr = eventTime.toLocaleDateString('ja-JP');
      const eventTimeFullStr = eventTime.toLocaleString('ja-JP');
      
      const isDateCorrect = eventDateStr === eventTimeStr;
      const status = isDateCorrect ? '✅' : '❌';
      
      console.log(`  ${status} ID:${event.id} - ${event.location.name}`);
      console.log(`    event_date: ${eventDateStr}`);
      console.log(`    event_time: ${eventTimeFullStr} (日付部分: ${eventTimeStr})`);
      console.log(`    イベント: ${event.eventType}`);
      console.log('');
    });

    // 2. 不一致のデータを検索
    console.log('2. event_dateとevent_timeが不一致のデータを検索');
    
    // SQLで直接比較（Prismaでは複雑なため）
    const inconsistentEvents = await prisma.$queryRaw`
      SELECT 
        id, 
        event_date, 
        event_time, 
        event_type,
        location_id,
        DATE(event_time) as event_time_date
      FROM location_fuji_events 
      WHERE DATE(event_date) != DATE(event_time)
      ORDER BY event_time
      LIMIT 10
    `;

    if (inconsistentEvents.length > 0) {
      console.log(`❌ 不一致データ: ${inconsistentEvents.length}件`);
      inconsistentEvents.forEach(event => {
        console.log(`  ID:${event.id} - event_date:${event.event_date.toLocaleDateString('ja-JP')} vs event_time:${event.event_time_date}`);
      });
    } else {
      console.log('✅ 全てのデータで日付が一致しています');
    }

    // 3. EventCacheServiceのcreateJstDateOnlyメソッドをテスト
    console.log('\n3. createJstDateOnlyメソッドのテスト');
    
    // テスト用の日時
    const testDateTime = new Date('2025-07-15T17:46:58.000+09:00'); // JST
    console.log(`入力: ${testDateTime.toLocaleString('ja-JP')}`);
    
    // createJstDateOnlyと同じロジックを実行
    function createJstDateOnly(dateTime) {
      const jstDate = new Date(dateTime);
      // 時刻を00:00:00にリセット
      jstDate.setHours(0, 0, 0, 0);
      return jstDate;
    }
    
    const dateOnly = createJstDateOnly(testDateTime);
    console.log(`期待される結果: ${dateOnly.toLocaleDateString('ja-JP')}`);
    console.log(`実際の結果: ${dateOnly.toISOString()}`);

    // 4. 修正方法の提案
    console.log('\n4. 修正が必要な場合の対処法');
    console.log('もしevent_dateが間違っている場合：');
    console.log('```sql');
    console.log('UPDATE location_fuji_events');
    console.log('SET event_date = DATE(event_time)');
    console.log('WHERE DATE(event_date) != DATE(event_time);');
    console.log('```');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ チェックエラー:', error.message);
    console.error('詳細:', error);
    await prisma.$disconnect();
  }
}

// 実行
if (require.main === module) {
  debugEventDate().catch(console.error);
}

module.exports = debugEventDate;