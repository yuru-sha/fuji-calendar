/**
 * 間違ったテストデータをクリーンアップ
 */

const { createPrismaClient } = require('../lib/prisma-client');

async function cleanupTestData() {
  console.log('🧹 テストデータクリーンアップ開始...\n');

  const prisma = await createPrismaClient();

  try {
    await prisma.$connect();

    // 1. 間違ったテストデータを特定
    console.log('1. 間違ったテストデータを検索');
    const wrongEvents = await prisma.locationEvent.findMany({
      where: {
        OR: [
          {
            // 富津岬で日の出ダイヤモンド富士（物理的に不可能）
            AND: [
              { locationId: 6 },
              { eventType: 'diamond_sunrise' }
            ]
          },
          {
            // 方位角が明らかに間違っているもの（120°など）
            AND: [
              { locationId: 6 },
              { azimuth: { lt: 200 } }, // 富津岬は 273°付近のはず
              { eventType: { in: ['diamond_sunrise', 'diamond_sunset'] } }
            ]
          },
          {
            // 2025 年 7 月 15 日 7:30 のテストデータ（手動作成）
            eventTime: new Date('2025-07-15T07:30:00.000Z')
          }
        ]
      },
      include: {
        location: {
          select: { name: true }
        }
      }
    });

    if (wrongEvents.length === 0) {
      console.log('✅ 削除対象のテストデータは見つかりませんでした');
      await prisma.$disconnect();
      return;
    }

    console.log(`❌ 間違ったデータを${wrongEvents.length}件発見:`);
    wrongEvents.forEach(event => {
      console.log(`  ID:${event.id} - ${event.location.name} - ${event.eventType} - ${new Date(event.eventTime).toLocaleString('ja-JP')} - 方位:${event.azimuth}°`);
    });

    // 2. 削除確認
    console.log('\n2. 間違ったデータを削除します...');
    const deleteResult = await prisma.locationEvent.deleteMany({
      where: {
        id: {
          in: wrongEvents.map(e => e.id)
        }
      }
    });

    console.log(`✅ ${deleteResult.count}件のテストデータを削除しました`);

    // 3. 正しいデータの確認
    console.log('\n3. 富津岬の正しいダイヤモンド富士データ:');
    const correctEvents = await prisma.locationEvent.findMany({
      where: {
        locationId: 6,
        eventType: 'diamond_sunset', // 富津岬では日の入りのみ可能
        azimuth: { gte: 270, lte: 277 } // 正しい方位角範囲
      },
      orderBy: { eventTime: 'asc' },
      take: 5
    });

    if (correctEvents.length > 0) {
      console.log(`✅ 正しいデータ ${correctEvents.length}件:`);
      correctEvents.forEach(event => {
        console.log(`  ${new Date(event.eventTime).toLocaleDateString('ja-JP')} ${new Date(event.eventTime).toLocaleTimeString('ja-JP')} - ${event.eventType} - 方位:${event.azimuth.toFixed(1)}°`);
      });
    } else {
      console.log('❓ 正しいダイヤモンド富士データが見つかりません');
      console.log('   ワーカーで正確な計算を実行させる必要があります');
    }

    console.log('\n📊 データクリーンアップ完了');
    console.log('   今後は実際の AstronomicalCalculator が生成する正確なデータのみが保存されます');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ クリーンアップエラー:', error.message);
    await prisma.$disconnect();
  }
}

// 実行
if (require.main === module) {
  cleanupTestData().catch(console.error);
}

module.exports = cleanupTestData;