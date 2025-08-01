const { PrismaClient } = require('@prisma/client');

async function checkNaganoEvents() {
  const prisma = new PrismaClient();
  
  try {
    // 長野県の地点を取得
    const naganoLocations = await prisma.location.findMany({
      where: {
        prefecture: '長野県'
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('\n=== 長野県の撮影地点 ===');
    for (const location of naganoLocations) {
      console.log(`\n 地点: ${location.name}`);
      console.log(`  緯度: ${location.latitude}, 経度: ${location.longitude}`);
      console.log(`  富士山への方位角: ${location.fujiAzimuth}°`);
      
      // この地点のイベントを確認（年間）
      const yearEvents = await prisma.locationEvent.findMany({
        where: {
          locationId: location.id,
          eventDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          }
        },
        orderBy: {
          eventTime: 'asc'
        }
      });
      
      // 年間のイベントタイプを集計
      const yearEventTypes = {};
      yearEvents.forEach(event => {
        yearEventTypes[event.eventType] = (yearEventTypes[event.eventType] || 0) + 1;
      });
      
      console.log('  2025 年のイベントタイプ:');
      Object.entries(yearEventTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}件`);
      });
      
      // 8 月のイベントを確認
      const events = yearEvents.filter(e => {
        const month = e.eventDate.getMonth();
        return month === 7; // 8 月
      });
      
      console.log(`  2025 年 8 月のイベント数: ${events.length}`);
      
      // イベントタイプを集計
      const eventTypes = {};
      events.forEach(event => {
        eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
      });
      
      Object.entries(eventTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}件`);
      });
      
      // ダイヤモンド富士のイベントを詳しく表示
      const diamondEvents = events.filter(e => e.eventType.startsWith('diamond_'));
      if (diamondEvents.length > 0) {
        console.log('  ダイヤモンド富士イベント:');
        diamondEvents.slice(0, 5).forEach(event => {
          const time = new Date(event.eventTime);
          console.log(`    ${event.eventDate.toISOString().split('T')[0]} ${time.toTimeString().split(' ')[0]} - ${event.eventType} (方位角: ${event.azimuth}°)`);
        });
      }
      
      // 最初のいくつかのイベントを表示
      console.log('  最初の 3 件:');
      events.slice(0, 3).forEach(event => {
        const time = new Date(event.eventTime);
        console.log(`    ${event.eventDate.toISOString().split('T')[0]} ${time.toTimeString().split(' ')[0]} - ${event.eventType} (方位角: ${event.azimuth}°)`);
      });
    }
    
    // 富士山の位置関係を確認
    console.log('\n=== 富士山との位置関係 ===');
    console.log('富士山の座標: 緯度 35.3606°, 経度 138.7274°');
    
    for (const location of naganoLocations) {
      const lonDiff = location.longitude - 138.7274;
      const latDiff = location.latitude - 35.3606;
      
      console.log(`\n${location.name}:`);
      console.log(`  経度差: ${lonDiff > 0 ? '東' : '西'}に ${Math.abs(lonDiff).toFixed(4)}°`);
      console.log(`  緯度差: ${latDiff > 0 ? '北' : '南'}に ${Math.abs(latDiff).toFixed(4)}°`);
      console.log(`  → 富士山は ${location.fujiAzimuth}° 方向（${getDirection(location.fujiAzimuth)}）`);
      
      // 理論的に可能な現象を判定
      if (location.longitude > 138.7274) {
        console.log('  → 東側なので、日の出・月の出時にダイヤモンド/パール富士が可能');
      } else {
        console.log('  → 西側なので、日の入り・月の入り時にダイヤモンド/パール富士が可能');
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getDirection(azimuth) {
  const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東',
                     '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}

checkNaganoEvents();