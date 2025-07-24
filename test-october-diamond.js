const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOctoberDiamond() {
  try {
    console.log('🔍 10月のダイヤモンド富士テスト開始...\n');

    // テスト地点（海ほたる）
    const location = await prisma.location.findFirst({
      where: { id: 1 }
    });

    console.log(`📍 地点: ${location.name}`);
    console.log(`   富士山方位角: ${location.fujiAzimuth.toFixed(1)}°`);
    console.log(`   富士山仰角: ${location.fujiElevation.toFixed(3)}°`);
    console.log(`   富士山距離: ${(location.fujiDistance / 1000).toFixed(1)}km`);

    // 10月の日没時間帯の太陽データ
    const octStartDate = new Date('2025-10-01');
    const octEndDate = new Date('2025-10-31');

    // まず全体のデータ分布を確認
    const allSunData = await prisma.celestialOrbitData.findMany({
      where: {
        date: { gte: octStartDate, lte: octEndDate },
        celestialType: 'sun',
        hour: { gte: 14, lte: 19 }, // 10月の日没時間帯
        visible: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 100
    });

    console.log(`\n🌅 10月の日没太陽データ: ${allSunData.length}件（サンプル）`);

    if (allSunData.length > 0) {
      const azimuths = allSunData.map(c => c.azimuth);
      const elevations = allSunData.map(c => c.elevation);
      const minAz = Math.min(...azimuths);
      const maxAz = Math.max(...azimuths);
      const minEl = Math.min(...elevations);
      const maxEl = Math.max(...elevations);
      
      console.log(`   📊 方位角範囲: ${minAz.toFixed(1)}° ～ ${maxAz.toFixed(1)}°`);
      console.log(`   📊 高度範囲: ${minEl.toFixed(1)}° ～ ${maxEl.toFixed(1)}°`);
      
      // 富士山方位角付近のデータを確認
      const nearFujiAzimuth = allSunData.filter(d => 
        Math.abs(d.azimuth - location.fujiAzimuth) <= 10
      );
      console.log(`   🎯 富士山方位角±10度以内: ${nearFujiAzimuth.length}件`);
      
      // サンプル表示
      console.log('\n   📋 10月太陽データサンプル:');
      for (let i = 0; i < Math.min(15, allSunData.length); i++) {
        const c = allSunData[i];
        const azDiff = Math.abs(c.azimuth - location.fujiAzimuth);
        console.log(`      ${c.date.toISOString().split('T')[0]} ${c.time.toTimeString().split(' ')[0]} - 方位角: ${c.azimuth.toFixed(1)}° (差: ${azDiff.toFixed(1)}°) 高度: ${c.elevation.toFixed(1)}°`);
      }
    }

    // 現在のLocationFujiEventServiceの条件でマッチング検索
    const matches = await prisma.celestialOrbitData.findMany({
      where: {
        date: { gte: octStartDate, lte: octEndDate },
        celestialType: 'sun',
        elevation: { gte: -5 }, // LocationFujiEventServiceの条件
        visible: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });

    console.log(`\n🔍 10月の全太陽候補データ: ${matches.length}件`);

    // マッチング計算
    const validMatches = [];
    for (const candidate of matches) {
      const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
      const totalDiff = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);

      validMatches.push({
        date: candidate.date,
        time: candidate.time,
        azimuth: candidate.azimuth,
        elevation: candidate.elevation,
        azimuthDiff,
        elevationDiff,
        totalDiff
      });
    }

    // 総差でソート
    validMatches.sort((a, b) => a.totalDiff - b.totalDiff);

    console.log(`\n🎯 全マッチ候補: ${validMatches.length}件`);
    
    // 現在の閾値（4.0度）でのマッチ
    const fairMatches = validMatches.filter(m => m.totalDiff <= 4.0);
    console.log(`\n✨ FAIR閾値（4.0度以内）でのマッチ: ${fairMatches.length}件`);
    
    if (fairMatches.length > 0) {
      console.log('\n📊 10月ダイヤモンド富士（上位10件）:');
      for (let i = 0; i < Math.min(10, fairMatches.length); i++) {
        const match = fairMatches[i];
        console.log(`   ${i + 1}. ${match.date.toISOString().split('T')[0]} ${match.time.toTimeString().split(' ')[0]}`);
        console.log(`      方位角: ${match.azimuth.toFixed(1)}° (差: ${match.azimuthDiff.toFixed(2)}°) 高度: ${match.elevation.toFixed(1)}° (差: ${match.elevationDiff.toFixed(2)}°) 総差: ${match.totalDiff.toFixed(2)}°`);
      }
    } else {
      console.log('❌ 4.0度以内のマッチが見つかりません。');
      
      // より緩い条件でテスト  
      console.log('\n🧪 閾値別マッチ数:');
      for (const threshold of [2.0, 4.0, 6.0, 8.0, 10.0, 15.0, 20.0]) {
        const matchCount = validMatches.filter(m => m.totalDiff <= threshold).length;
        console.log(`   ${threshold}度以内: ${matchCount}件`);
      }
      
      if (validMatches.length > 0) {
        console.log('\n📊 最も近いマッチ（上位5件）:');
        for (let i = 0; i < Math.min(5, validMatches.length); i++) {
          const match = validMatches[i];
          console.log(`   ${i + 1}. ${match.date.toISOString().split('T')[0]} ${match.time.toTimeString().split(' ')[0]}`);
          console.log(`      方位角: ${match.azimuth.toFixed(1)}° (差: ${match.azimuthDiff.toFixed(2)}°) 高度: ${match.elevation.toFixed(1)}° (差: ${match.elevationDiff.toFixed(2)}°) 総差: ${match.totalDiff.toFixed(2)}°`);
        }
      }
    }

    // LocationFujiEventServiceの実際の結果も確認
    console.log('\n🔍 location_fuji_eventsテーブルの10月データ確認...');
    const existingEvents = await prisma.locationFujiEvent.findMany({
      where: {
        locationId: location.id,
        eventDate: { gte: octStartDate, lte: octEndDate },
        eventType: 'diamond_sunset'
      },
      orderBy: { eventDate: 'asc' }
    });

    console.log(`📈 既存の10月ダイヤモンド富士イベント: ${existingEvents.length}件`);
    if (existingEvents.length > 0) {
      for (const event of existingEvents) {
        console.log(`   ${event.eventDate.toISOString().split('T')[0]} ${event.eventTime.toTimeString().split(' ')[0]}`);
        console.log(`      方位角: ${event.azimuth.toFixed(1)}° 高度: ${event.altitude.toFixed(1)}° 品質: ${event.qualityScore.toFixed(2)} 精度: ${event.accuracy}`);
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOctoberDiamond();