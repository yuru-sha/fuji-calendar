const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugOctoberDiamond() {
  try {
    console.log('🔍 10月のダイヤモンド富士検出デバッグ開始...\n');

    // テスト用の地点を取得（富士山データが設定されている地点）
    const locations = await prisma.location.findMany({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      },
      take: 3
    });

    console.log(`📍 テスト地点数: ${locations.length}`);

    for (const location of locations) {
      console.log(`\n📍 地点: ${location.name} (ID: ${location.id})`);
      console.log(`   富士山方位角: ${location.fujiAzimuth}°`);
      console.log(`   富士山仰角: ${location.fujiElevation}°`);
      console.log(`   富士山距離: ${(location.fujiDistance / 1000).toFixed(1)}km`);

      // 10月の日没時間帯（14:00-20:00）の celestial_orbit_data を検索
      const octStartDate = new Date('2025-10-01');
      const octEndDate = new Date('2025-10-31');

      const candidates = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: octStartDate, lte: octEndDate },
          celestialType: 'sun',
          hour: { gte: 14, lte: 20 }, // 日没時間帯
          visible: true
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });

      console.log(`\n   🌅 10月の日没候補数: ${candidates.length}`);

      // 方位角が近い候補を探す
      const closeMatches = [];
      for (const candidate of candidates) {
        const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
        
        if (azimuthDiff <= 10) { // 10度以内の候補を表示
          closeMatches.push({
            date: candidate.date,
            time: candidate.time,
            azimuth: candidate.azimuth,
            elevation: candidate.elevation,
            azimuthDiff: azimuthDiff,
            elevationDiff: Math.abs(candidate.elevation - location.fujiElevation)
          });
        }
      }

      console.log(`   🎯 方位角10度以内の候補: ${closeMatches.length}件`);

      // 最も近い5件を表示
      closeMatches.sort((a, b) => a.azimuthDiff - b.azimuthDiff);
      console.log('\n   📊 最も近い候補（上位5件）:');
      for (let i = 0; i < Math.min(5, closeMatches.length); i++) {
        const match = closeMatches[i];
        console.log(`      ${i + 1}. ${match.date.toISOString().split('T')[0]} ${match.time.toTimeString().split(' ')[0]}`);
        console.log(`         太陽方位角: ${match.azimuth.toFixed(2)}° (差: ${match.azimuthDiff.toFixed(2)}°)`);
        console.log(`         太陽高度: ${match.elevation.toFixed(2)}° (差: ${match.elevationDiff.toFixed(2)}°)`);
      }

      // 現在の LocationFujiEvent を確認
      const existingEvents = await prisma.locationFujiEvent.findMany({
        where: {
          locationId: location.id,
          eventDate: { gte: octStartDate, lte: octEndDate },
          eventType: 'diamond_sunset'
        }
      });

      console.log(`\n   💎 既存のダイヤモンド富士イベント: ${existingEvents.length}件`);
    }

    // 閾値の確認
    console.log('\n⚙️ 現在の設定:');
    console.log('   - FAIR_THRESHOLD: 2.0度');
    console.log('   - elevation フィルタ: >= -2度');
    console.log('   - visible フィルタ: true');
    
    console.log('\n💡 推奨事項:');
    console.log('   1. FAIR_THRESHOLD を 3.0～4.0度に拡大');
    console.log('   2. elevation フィルタを -5度まで緩和');
    console.log('   3. 10月は太陽が低い位置を通るため、閾値の調整が必要');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugOctoberDiamond();