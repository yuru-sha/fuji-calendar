const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCelestialData() {
  try {
    console.log('🔍 CelestialOrbitDataの検証開始...\n');

    // 全データ数
    const totalCount = await prisma.celestialOrbitData.count();
    console.log(`📊 総レコード数: ${totalCount}`);

    // 2025年のデータ確認
    const count2025 = await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        }
      }
    });
    console.log(`📊 2025年のレコード数: ${count2025}`);

    // 10月のデータ確認
    const octCount = await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        }
      }
    });
    console.log(`📊 2025年10月のレコード数: ${octCount}`);

    // 太陽データのみ
    const sunCount = await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        },
        celestialType: 'sun'
      }
    });
    console.log(`☀️ 2025年10月の太陽データ: ${sunCount}`);

    // 日没時間帯（14:00-20:00）の太陽データ
    const sunsetCount = await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        },
        celestialType: 'sun',
        hour: { gte: 14, lte: 20 }
      }
    });
    console.log(`🌅 2025年10月の日没時間帯データ: ${sunsetCount}`);

    // 方位角250-280度の範囲（ダイヤモンド富士の条件）
    const diamondRange = await prisma.celestialOrbitData.count({
      where: {
        date: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        },
        celestialType: 'sun',
        hour: { gte: 14, lte: 20 },
        azimuth: { gte: 250, lte: 280 }
      }
    });
    console.log(`💎 ダイヤモンド富士範囲（方位角250-280度）: ${diamondRange}`);

    // 実際のデータサンプルを表示
    const samples = await prisma.celestialOrbitData.findMany({
      where: {
        date: {
          gte: new Date('2025-10-15'),
          lte: new Date('2025-10-20')
        },
        celestialType: 'sun',
        hour: { gte: 14, lte: 20 }
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 10
    });

    console.log('\n📋 10月中旬の太陽データサンプル:');
    for (const sample of samples) {
      console.log(`   ${sample.date.toISOString().split('T')[0]} ${sample.time.toTimeString().split(' ')[0]} - 方位角: ${sample.azimuth.toFixed(1)}° 高度: ${sample.elevation.toFixed(1)}° visible: ${sample.visible}`);
    }

    // 月別の太陽データ統計
    console.log('\n📊 月別太陽データ統計:');
    for (let month = 1; month <= 12; month++) {
      const monthCount = await prisma.celestialOrbitData.count({
        where: {
          date: {
            gte: new Date(`2025-${month.toString().padStart(2, '0')}-01`),
            lte: new Date(`2025-${month.toString().padStart(2, '0')}-31`)
          },
          celestialType: 'sun'
        }
      });
      console.log(`   ${month}月: ${monthCount}件`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCelestialData();