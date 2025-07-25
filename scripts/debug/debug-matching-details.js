const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMatchingDetails() {
  try {
    console.log('🔍 詳細マッチング分析開始...\n');

    // テスト地点
    const location = await prisma.location.findFirst({
      where: { id: 1 }
    });

    console.log(`📍 地点: ${location.name}`);
    console.log(`   富士山方位角: ${location.fujiAzimuth}°`);
    console.log(`   富士山仰角: ${location.fujiElevation}°`);

    // 1月の日没時間帯の太陽データ（方位角フィルタなし）
    const candidates = await prisma.celestialOrbitData.findMany({
      where: {
        date: { gte: new Date('2025-01-15'), lte: new Date('2025-01-20') },
        celestialType: 'sun',
        hour: { gte: 14, lte: 20 },
        visible: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 50
    });

    console.log(`\n🌅 1月中旬の日没時太陽データ: ${candidates.length}件`);

    // 各候補の詳細分析
    console.log('\n📊 候補データ詳細分析:');
    const analysis = [];
    
    for (const candidate of candidates) {
      const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
      const totalDiff = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);

      analysis.push({
        date: candidate.date.toISOString().split('T')[0],
        time: candidate.time.toTimeString().split(' ')[0],
        azimuth: candidate.azimuth,
        elevation: candidate.elevation,
        azimuthDiff,
        elevationDiff,
        totalDiff
      });
    }

    // 総差でソート
    analysis.sort((a, b) => a.totalDiff - b.totalDiff);

    console.log('\n   🎯 最も近い候補（上位10件）:');
    for (let i = 0; i < Math.min(10, analysis.length); i++) {
      const item = analysis[i];
      console.log(`      ${i + 1}. ${item.date} ${item.time}`);
      console.log(`         太陽: 方位角${item.azimuth.toFixed(1)}° 高度${item.elevation.toFixed(1)}°`);
      console.log(`         差分: 方位角${item.azimuthDiff.toFixed(1)}° 高度${item.elevationDiff.toFixed(1)}° 総差${item.totalDiff.toFixed(1)}°`);
      console.log('');
    }

    // 方位角の範囲確認
    const azimuthRange = analysis.map(a => a.azimuth);
    const minAzimuth = Math.min(...azimuthRange);
    const maxAzimuth = Math.max(...azimuthRange);
    
    console.log(`📊 太陽方位角の範囲: ${minAzimuth.toFixed(1)}° ～ ${maxAzimuth.toFixed(1)}°`);
    console.log(`📊 地点富士山方位角: ${location.fujiAzimuth}°`);
    console.log(`📊 方位角差の最小値: ${Math.min(...analysis.map(a => a.azimuthDiff)).toFixed(1)}°`);

    // 高度の範囲確認
    const elevationRange = analysis.map(a => a.elevation);
    const minElevation = Math.min(...elevationRange);
    const maxElevation = Math.max(...elevationRange);
    
    console.log(`📊 太陽高度の範囲: ${minElevation.toFixed(1)}° ～ ${maxElevation.toFixed(1)}°`);
    console.log(`📊 地点富士山仰角: ${location.fujiElevation}°`);
    console.log(`📊 高度差の最小値: ${Math.min(...analysis.map(a => a.elevationDiff)).toFixed(1)}°`);

    // 閾値テスト
    console.log('\n🧪 閾値別マッチ数:');
    for (const threshold of [2.0, 4.0, 6.0, 8.0, 10.0]) {
      const matchCount = analysis.filter(a => a.totalDiff <= threshold).length;
      console.log(`   ${threshold}度以内: ${matchCount}件`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMatchingDetails();