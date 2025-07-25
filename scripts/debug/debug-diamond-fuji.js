/**
 * ダイヤモンド富士の計算検証スクリプト
 * 富津岬から富士山を見る場合の方位角と妥当性をチェック
 */

const { PrismaClient } = require('@prisma/client');

async function debugDiamondFuji() {
  console.log('🔍 ダイヤモンド富士計算検証開始...\n');

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    // 1. 富津岬の地点情報を取得
    const futtsuLocation = await prisma.location.findFirst({
      where: {
        name: {
          contains: '富津'
        }
      }
    });

    if (!futtsuLocation) {
      console.log('❌ 富津岬の地点が見つかりません');
      return;
    }

    console.log('📍 富津岬の地点情報:');
    console.log(`  名前: ${futtsuLocation.name}`);
    console.log(`  座標: ${futtsuLocation.latitude}°N, ${futtsuLocation.longitude}°E`);
    console.log(`  標高: ${futtsuLocation.elevation}m`);
    console.log(`  富士山方位角: ${futtsuLocation.fujiAzimuth}°`);
    console.log(`  富士山仰角: ${futtsuLocation.fujiElevation}°`);
    console.log(`  富士山距離: ${futtsuLocation.fujiDistance}km`);

    // 2. 富士山の座標（定数から）
    const FUJI_COORDINATES = {
      latitude: 35.3606,
      longitude: 138.7274,
      elevation: 3776
    };

    console.log('\n🗻 富士山の座標:');
    console.log(`  座標: ${FUJI_COORDINATES.latitude}°N, ${FUJI_COORDINATES.longitude}°E`);
    console.log(`  標高: ${FUJI_COORDINATES.elevation}m`);

    // 3. 手動で方位角を計算して検証
    function calculateAzimuth(from, to) {
      const lat1 = from.latitude * Math.PI / 180;
      const lat2 = to.latitude * Math.PI / 180;
      const deltaLon = (to.longitude - from.longitude) * Math.PI / 180;

      const y = Math.sin(deltaLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

      const bearing = Math.atan2(y, x) * 180 / Math.PI;
      return (bearing + 360) % 360;
    }

    const calculatedAzimuth = calculateAzimuth(futtsuLocation, FUJI_COORDINATES);
    console.log('\n📐 方位角検証:');
    console.log(`  データベース値: ${futtsuLocation.fujiAzimuth}°`);
    console.log(`  手動計算値: ${calculatedAzimuth.toFixed(2)}°`);
    console.log(`  差: ${Math.abs(futtsuLocation.fujiAzimuth - calculatedAzimuth).toFixed(2)}°`);

    // 4. 方位角の意味を解釈
    console.log('\n🧭 方位角の意味:');
    let direction = '';
    if (calculatedAzimuth >= 337.5 || calculatedAzimuth < 22.5) direction = '北';
    else if (calculatedAzimuth >= 22.5 && calculatedAzimuth < 67.5) direction = '北東';
    else if (calculatedAzimuth >= 67.5 && calculatedAzimuth < 112.5) direction = '東';
    else if (calculatedAzimuth >= 112.5 && calculatedAzimuth < 157.5) direction = '南東';
    else if (calculatedAzimuth >= 157.5 && calculatedAzimuth < 202.5) direction = '南';
    else if (calculatedAzimuth >= 202.5 && calculatedAzimuth < 247.5) direction = '南西';
    else if (calculatedAzimuth >= 247.5 && calculatedAzimuth < 292.5) direction = '西';
    else if (calculatedAzimuth >= 292.5 && calculatedAzimuth < 337.5) direction = '北西';

    console.log(`  富津岬から富士山は「${direction}」方向（${calculatedAzimuth.toFixed(1)}°）`);

    // 5. ダイヤモンド富士の可能性を検証
    console.log('\n☀️ ダイヤモンド富士の可能性検証:');
    
    // 太陽は東（約90°）から昇り、西（約270°）に沈む
    // 方位角が富士山方向と一致する時刻がダイヤモンド富士の候補
    
    if (calculatedAzimuth >= 60 && calculatedAzimuth <= 120) {
      console.log('  ✅ 日の出ダイヤモンド富士が可能（太陽が東から昇る際）');
      console.log('  ❌ 日の入りダイヤモンド富士は不可能（西に沈むため）');
    } else if (calculatedAzimuth >= 240 && calculatedAzimuth <= 300) {
      console.log('  ❌ 日の出ダイヤモンド富士は不可能（東から昇るため）');
      console.log('  ✅ 日の入りダイヤモンド富士が可能（太陽が西に沈む際）');
    } else if (calculatedAzimuth >= 120 && calculatedAzimuth <= 240) {
      console.log('  ❌ 日の出ダイヤモンド富士は不可能（南寄り過ぎ）');
      console.log('  ❌ 日の入りダイヤモンド富士は不可能（南寄り過ぎ）');
    } else {
      console.log('  ❌ ダイヤモンド富士は困難（北寄り過ぎ）');
    }

    // 6. 実際のデータベースのイベントを確認
    console.log('\n💾 データベースのダイヤモンド富士イベント:');
    const events = await prisma.locationFujiEvent.findMany({
      where: {
        locationId: futtsuLocation.id,
        eventType: {
          in: ['diamond_sunrise', 'diamond_sunset']
        }
      },
      orderBy: { eventTime: 'asc' },
      take: 5
    });

    if (events.length > 0) {
      console.log(`  検出されたイベント: ${events.length}件`);
      events.forEach(event => {
        const time = new Date(event.eventTime);
        const hour = time.getHours();
        const timeOfDay = hour < 12 ? '日の出' : '日の入り';
        console.log(`    ${time.toLocaleDateString('ja-JP')} ${time.toLocaleTimeString('ja-JP')} - ${event.eventType} (${timeOfDay}, 方位:${event.azimuth}°)`);
      });
    } else {
      console.log('  検出されたイベントなし');
    }

    // 7. 検証結果のまとめ
    console.log('\n📊 検証結果:');
    if (calculatedAzimuth >= 60 && calculatedAzimuth <= 120) {
      console.log('  富津岬からは「日の出ダイヤモンド富士」のみ観測可能');
      console.log('  朝7:30のイベントは理論的に正しい');
      console.log('  ただし、7月は夏至付近で太陽の出る方向が北東寄りなので要検証');
    } else if (calculatedAzimuth >= 240 && calculatedAzimuth <= 300) {
      console.log('  富津岬からは「日の入りダイヤモンド富士」のみ観測可能');
    } else {
      console.log('  ❌ 富津岬からダイヤモンド富士は観測困難');
      console.log('  計算ロジックまたはデータに問題がある可能性');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ 検証エラー:', error.message);
    await prisma.$disconnect();
  }
}

// 実行
if (require.main === module) {
  debugDiamondFuji().catch(console.error);
}

module.exports = debugDiamondFuji;