const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testImprovedMatching() {
  try {
    console.log('🔍 改善されたマッチング機能のテスト開始...\n');

    // テスト地点を取得
    const locations = await prisma.location.findMany({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      },
      take: 2
    });

    console.log(`📍 テスト地点数: ${locations.length}`);

    for (const location of locations) {
      console.log(`\n📍 地点: ${location.name} (ID: ${location.id})`);
      console.log(`   富士山方位角: ${location.fujiAzimuth}°`);
      console.log(`   富士山仰角: ${location.fujiElevation}°`);
      console.log(`   富士山距離: ${(location.fujiDistance / 1000).toFixed(1)}km`);

      // データが存在する月（1月）でテスト
      const janStartDate = new Date('2025-01-01');
      const janEndDate = new Date('2025-01-31');

      // 方位角250-280度の範囲（日没ダイヤモンド富士）
      const candidates = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: janStartDate, lte: janEndDate },
          celestialType: 'sun',
          hour: { gte: 14, lte: 20 },
          azimuth: { gte: 250, lte: 280 },
          visible: true,
          elevation: { gte: -5 }
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 20
      });

      console.log(`\n   🌅 1月の日没ダイヤモンド富士候補: ${candidates.length}件`);

      // マッチング計算
      const matches = [];
      for (const candidate of candidates) {
        const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
        const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
        const totalDiff = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);

        if (totalDiff <= 4.0) { // 新しい閾値
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
      }

      console.log(`   🎯 マッチした候補（4.0度以内）: ${matches.length}件`);

      // 上位5件を表示
      matches.sort((a, b) => a.totalDiff - b.totalDiff);
      console.log('\n   📊 最高マッチ（上位5件）:');
      for (let i = 0; i < Math.min(5, matches.length); i++) {
        const match = matches[i];
        console.log(`      ${i + 1}. ${match.date.toISOString().split('T')[0]} ${match.time.toTimeString().split(' ')[0]}`);
        console.log(`         方位角差: ${match.azimuthDiff.toFixed(2)}° 高度差: ${match.elevationDiff.toFixed(2)}° 総差: ${match.totalDiff.toFixed(2)}°`);
      }
    }

    console.log('\n✅ 改善点の確認:');
    console.log('   - FAIR_THRESHOLD: 2.0 → 4.0度に拡大');
    console.log('   - elevation フィルタ: -2 → -5度に緩和');
    console.log('   - ダイヤモンド富士条件の追加（時間帯・方位角）');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImprovedMatching();