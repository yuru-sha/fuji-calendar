const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDecemberDiamond() {
  try {
    console.log('🔍 12月のダイヤモンド富士テスト開始...\n');

    // テスト地点（海ほたる）
    const location = await prisma.location.findFirst({
      where: { id: 1 }
    });

    console.log(`📍 地点: ${location.name}`);
    console.log(`   富士山方位角: ${location.fujiAzimuth.toFixed(1)}°`);
    console.log(`   富士山仰角: ${location.fujiElevation.toFixed(3)}°`);
    console.log(`   富士山距離: ${(location.fujiDistance / 1000).toFixed(1)}km`);

    // 12月の日没時間帯の太陽データ
    const decStartDate = new Date('2025-12-01');
    const decEndDate = new Date('2025-12-31');

    // 方位角250-280度の範囲で検索
    const candidates = await prisma.celestialOrbitData.findMany({
      where: {
        date: { gte: decStartDate, lte: decEndDate },
        celestialType: 'sun',
        hour: { gte: 14, lte: 20 },
        azimuth: { gte: 250, lte: 280 },
        visible: true,
        elevation: { gte: -5 }
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });

    console.log(`\n🌅 12月の日没ダイヤモンド富士候補（方位角250-280度）: ${candidates.length}件`);

    if (candidates.length === 0) {
      console.log('❌ 候補が見つかりません。方位角の範囲を広げてテストします...');
      
      // より広い範囲で検索
      const wideCandidates = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: decStartDate, lte: decEndDate },
          celestialType: 'sun',
          hour: { gte: 14, lte: 20 },
          visible: true
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 50
      });

      console.log(`\n🌅 12月の全日没太陽データ: ${wideCandidates.length}件`);

      // 方位角の範囲確認
      if (wideCandidates.length > 0) {
        const azimuths = wideCandidates.map(c => c.azimuth);
        const minAz = Math.min(...azimuths);
        const maxAz = Math.max(...azimuths);
        console.log(`   📊 方位角範囲: ${minAz.toFixed(1)}° ～ ${maxAz.toFixed(1)}°`);
        
        // サンプル表示
        console.log('\n   📋 サンプルデータ:');
        for (let i = 0; i < Math.min(10, wideCandidates.length); i++) {
          const c = wideCandidates[i];
          console.log(`      ${c.date.toISOString().split('T')[0]} ${c.time.toTimeString().split(' ')[0]} - 方位角: ${c.azimuth.toFixed(1)}° 高度: ${c.elevation.toFixed(1)}°`);
        }
      }
      return;
    }

    // マッチング計算
    const matches = [];
    for (const candidate of candidates) {
      const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
      const totalDiff = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);

      matches.push({
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
    matches.sort((a, b) => a.totalDiff - b.totalDiff);

    console.log(`\n🎯 マッチ候補: ${matches.length}件`);
    console.log('\n📊 最高マッチ（上位10件）:');
    for (let i = 0; i < Math.min(10, matches.length); i++) {
      const match = matches[i];
      console.log(`   ${i + 1}. ${match.date.toISOString().split('T')[0]} ${match.time.toTimeString().split(' ')[0]}`);
      console.log(`      方位角差: ${match.azimuthDiff.toFixed(2)}° 高度差: ${match.elevationDiff.toFixed(2)}° 総差: ${match.totalDiff.toFixed(2)}°`);
    }

    // 閾値テスト
    console.log('\n🧪 閾値別マッチ数:');
    for (const threshold of [2.0, 4.0, 6.0, 8.0, 10.0, 15.0, 20.0]) {
      const matchCount = matches.filter(m => m.totalDiff <= threshold).length;
      console.log(`   ${threshold}度以内: ${matchCount}件`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDecemberDiamond();