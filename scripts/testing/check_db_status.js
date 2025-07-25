const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log('=== PostgreSQLデータベース状況確認 ===\n');
  
  try {
    // 1. locations テーブルのレコード数
    const locationsCount = await prisma.location.count();
    console.log(`📍 locations テーブル: ${locationsCount} レコード`);
    
    if (locationsCount > 0) {
      const latestLocation = await prisma.location.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          name: true,
          prefecture: true,
          createdAt: true,
          updatedAt: true
        }
      });
      console.log(`   最新の location: ${latestLocation.name} (${latestLocation.prefecture})`);
      console.log(`   作成日時: ${latestLocation.createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`   更新日時: ${latestLocation.updatedAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    }
    
    // 2. location_fuji_events テーブルのレコード数
    const eventsCount = await prisma.locationFujiEvent.count();
    console.log(`\n🌅 location_fuji_events テーブル: ${eventsCount} レコード`);
    
    if (eventsCount > 0) {
      const eventsByType = await prisma.locationFujiEvent.groupBy({
        by: ['eventType'],
        _count: true,
        orderBy: { eventType: 'asc' }
      });
      
      console.log('   イベントタイプ別内訳:');
      eventsByType.forEach(group => {
        console.log(`     - ${group.eventType}: ${group._count} レコード`);
      });
      
      const latestEvent = await prisma.locationFujiEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          location: {
            select: { name: true, prefecture: true }
          }
        }
      });
      
      if (latestEvent) {
        console.log(`   最新のイベント: ${latestEvent.eventType} (${latestEvent.location.name})`);
        console.log(`   イベント日時: ${latestEvent.eventTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`   作成日時: ${latestEvent.createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      }
      
      // 年度別の分布も確認
      const eventsByYear = await prisma.locationFujiEvent.groupBy({
        by: ['calculationYear'],
        _count: true,
        orderBy: { calculationYear: 'desc' }
      });
      
      console.log('\n   年度別イベント分布:');
      eventsByYear.forEach(group => {
        console.log(`     - ${group.calculationYear}年: ${group._count} レコード`);
      });
    }
    
    // 3. celestial_orbit_data テーブルのレコード数
    const celestialCount = await prisma.celestialOrbitData.count();
    console.log(`\n🌙 celestial_orbit_data テーブル: ${celestialCount} レコード`);
    
    if (celestialCount > 0) {
      const celestialByType = await prisma.celestialOrbitData.groupBy({
        by: ['celestialType'],
        _count: true,
        orderBy: { celestialType: 'asc' }
      });
      
      console.log('   天体タイプ別内訳:');
      celestialByType.forEach(group => {
        console.log(`     - ${group.celestialType}: ${group._count} レコード`);
      });
      
      const latestCelestial = await prisma.celestialOrbitData.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      if (latestCelestial) {
        console.log(`   最新の天体データ: ${latestCelestial.celestialType}`);
        console.log(`   データ日付: ${latestCelestial.date.toLocaleDateString('ja-JP')}`);
        console.log(`   データ時刻: ${latestCelestial.time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`   作成日時: ${latestCelestial.createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      }
      
      // 日付範囲の確認
      const dateRange = await prisma.celestialOrbitData.aggregate({
        _min: { date: true },
        _max: { date: true }
      });
      
      if (dateRange._min.date && dateRange._max.date) {
        console.log(`   データ期間: ${dateRange._min.date.toLocaleDateString('ja-JP')} ～ ${dateRange._max.date.toLocaleDateString('ja-JP')}`);
      }
    }
    
    // 4. データベース接続情報の確認
    console.log('\n🔗 データベース接続情報:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '設定済み' : '未設定'}`);
    
    // 5. 管理者テーブルの確認（おまけ）
    const adminsCount = await prisma.admin.count();
    console.log(`\n👥 admins テーブル: ${adminsCount} レコード`);
    
    console.log('\n✅ データベース状況確認完了');
    
  } catch (error) {
    console.error('❌ データベース接続エラー:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   PostgreSQLサーバーが起動していない可能性があります');
    } else if (error.code === 'P1001') {
      console.error('   データベースに接続できません。DATABASE_URLを確認してください');
    } else if (error.code === 'P2021') {
      console.error('   指定されたテーブルが存在しません。マイグレーションが必要かもしれません');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
checkDatabaseStatus();