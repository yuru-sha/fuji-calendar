// 舞浜海岸のダイヤモンド富士検証用テストスクリプト
const { AstronomicalCalculatorAstronomyEngine } = require('./dist/src/server/services/AstronomicalCalculatorAstronomyEngine');

async function testMaihamaDiamondFuji() {
  console.log('舞浜海岸 ダイヤモンド富士計算テスト開始\n');
  
  // 舞浜海岸の位置情報
  const maihamaLocation = {
    id: 1,
    name: '舞浜海岸',
    prefecture: '千葉県',
    latitude: 35.6346,    // 舞浜駅付近の緯度
    longitude: 139.8826,  // 舞浜駅付近の経度
    elevation: 3,         // 海抜約3m
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    const calculator = new AstronomicalCalculatorAstronomyEngine();
    
    // 事前計算値を算出
    const fujiAzimuth = calculator.calculateBearingToFuji(maihamaLocation);
    const fujiElevation = calculator.calculateElevationToFuji(maihamaLocation);
    const fujiDistance = calculator.calculateDistanceToFuji(maihamaLocation);
    
    console.log('舞浜海岸から富士山への事前計算値:');
    console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(2)}度`);
    console.log(`  富士山頂への仰角: ${fujiElevation.toFixed(2)}度`);
    console.log(`  富士山までの距離: ${fujiDistance.toFixed(2)}km\n`);
    
    // 地点情報に事前計算値を追加
    maihamaLocation.fujiAzimuth = fujiAzimuth;
    maihamaLocation.fujiElevation = fujiElevation;
    maihamaLocation.fujiDistance = fujiDistance;
    
    // 2/17, 2/18, 2/19の3日間をテスト
    const testDates = [
      { date: new Date(2025, 1, 17), label: '2月17日' },
      { date: new Date(2025, 1, 18), label: '2月18日' },
      { date: new Date(2025, 1, 19), label: '2月19日' }
    ];
    
    const allEvents = [];
    
    for (const testInfo of testDates) {
      console.log(`===== ${testInfo.label} =====`);
      
      // ダイヤモンド富士計算実行
      const diamondEvents = await calculator.calculateDiamondFuji(testInfo.date, maihamaLocation);
      
      if (diamondEvents.length === 0) {
        console.log('  ❌ この日はダイヤモンド富士は発生しません\n');
      } else {
        diamondEvents.forEach((event) => {
          const timeStr = event.time.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          console.log(`  ✅ ダイヤモンド富士発見!`);
          console.log(`     時刻: ${timeStr}`);
          console.log(`     タイプ: ${event.subType === 'sunset' ? '沈むダイヤモンド富士' : '昇るダイヤモンド富士'}`);
          console.log(`     方位角: ${event.azimuth.toFixed(2)}度`);
          console.log(`     仰角: ${event.elevation ? event.elevation.toFixed(2) : 'N/A'}度\n`);
          
          allEvents.push({
            date: testInfo.label,
            event: event
          });
        });
      }
    }
    
    // 2/18 17:15との比較
    console.log('===== 2/18 17:15との比較 =====');
    const expected17_15 = new Date(2025, 1, 18, 17, 15);
    const feb18Events = allEvents.filter(item => item.date === '2月18日');
    
    if (feb18Events.length > 0) {
      const closestEvent = feb18Events.reduce((closest, item) => {
        const eventDiff = Math.abs(item.event.time.getTime() - expected17_15.getTime());
        const closestDiff = Math.abs(closest.event.time.getTime() - expected17_15.getTime());
        return eventDiff < closestDiff ? item : closest;
      });
      
      const timeDiffMinutes = Math.abs(closestEvent.event.time.getTime() - expected17_15.getTime()) / (1000 * 60);
      const timeStr = closestEvent.event.time.toLocaleString('ja-JP', { 
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`  期待時刻: 17:15`);
      console.log(`  計算時刻: ${timeStr}`);
      console.log(`  時刻差: ${timeDiffMinutes.toFixed(1)}分`);
      
      if (timeDiffMinutes <= 5) {
        console.log('  ✅ 2/18 17:15のダイヤモンド富士が正しく検出されました！');
      } else {
        console.log('  ⚠️  期待値との差が5分を超えています');
      }
    } else {
      console.log('  ❌ 2/18にダイヤモンド富士が検出されませんでした');
    }
    
    // サマリー
    console.log('\n===== サマリー =====');
    console.log(`検出されたダイヤモンド富士の日数: ${new Set(allEvents.map(item => item.date)).size}日`);
    console.log(`検出された日: ${[...new Set(allEvents.map(item => item.date))].join(', ')}`);
    
    if (allEvents.length >= 3 && feb18Events.length > 0) {
      console.log('\n✅ 舞浜海岸で2/17, 2/18, 2/19の3日間のダイヤモンド富士が確認できました！');
    } else {
      console.log('\n⚠️  期待される3日間のダイヤモンド富士が検出されませんでした');
    }
    
  } catch (error) {
    console.error('計算エラー:', error);
  }
}

testMaihamaDiamondFuji();