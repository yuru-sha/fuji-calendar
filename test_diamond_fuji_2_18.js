// 2/18 17:15のダイヤモンド富士検証用テストスクリプト
const { AstronomicalCalculatorAstronomyEngine } = require('./dist/src/server/services/AstronomicalCalculatorAstronomyEngine');

async function testDiamondFuji() {
  console.log('2/18 ダイヤモンド富士計算テスト開始');
  
  // テスト用サンプル地点（河口湖畔）
  const testLocation = {
    id: 1,
    name: '河口湖畔',
    prefecture: '山梨県',
    latitude: 35.5000,
    longitude: 138.7500,
    elevation: 833,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // 2025年2月18日
  const testDate = new Date(2025, 1, 18); // month is 0-indexed
  
  try {
    const calculator = new AstronomicalCalculatorAstronomyEngine();
    
    // 事前計算値を算出
    const fujiAzimuth = calculator.calculateBearingToFuji(testLocation);
    const fujiElevation = calculator.calculateElevationToFuji(testLocation);
    const fujiDistance = calculator.calculateDistanceToFuji(testLocation);
    
    console.log('事前計算値:');
    console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(2)}度`);
    console.log(`  富士山頂への仰角: ${fujiElevation.toFixed(2)}度`);
    console.log(`  富士山までの距離: ${fujiDistance.toFixed(2)}km`);
    
    // 地点情報に事前計算値を追加
    testLocation.fujiAzimuth = fujiAzimuth;
    testLocation.fujiElevation = fujiElevation;
    testLocation.fujiDistance = fujiDistance;
    
    // ダイヤモンド富士計算実行
    const diamondEvents = await calculator.calculateDiamondFuji(testDate, testLocation);
    
    console.log('\n計算結果:');
    if (diamondEvents.length === 0) {
      console.log('  この日はダイヤモンド富士は発生しません');
    } else {
      diamondEvents.forEach((event, index) => {
        console.log(`  イベント ${index + 1}:`);
        console.log(`    タイプ: ${event.type}`);
        console.log(`    サブタイプ: ${event.subType}`);
        console.log(`    時刻: ${event.time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        console.log(`    方位角: ${event.azimuth.toFixed(2)}度`);
        console.log(`    仰角: ${event.elevation ? event.elevation.toFixed(2) : 'N/A'}度`);
      });
    }
    
    // 期待値との比較
    const expected17_15 = new Date(2025, 1, 18, 17, 15);
    console.log('\n期待値との比較:');
    console.log(`  期待時刻: ${expected17_15.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    
    if (diamondEvents.length > 0) {
      const closestEvent = diamondEvents.reduce((closest, event) => {
        const eventDiff = Math.abs(event.time.getTime() - expected17_15.getTime());
        const closestDiff = Math.abs(closest.time.getTime() - expected17_15.getTime());
        return eventDiff < closestDiff ? event : closest;
      });
      
      const timeDiffMinutes = Math.abs(closestEvent.time.getTime() - expected17_15.getTime()) / (1000 * 60);
      console.log(`  最も近いイベント: ${closestEvent.time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      console.log(`  時刻差: ${timeDiffMinutes.toFixed(1)}分`);
      
      if (timeDiffMinutes <= 5) {
        console.log('  ✅ 期待値との差は5分以内です');
      } else {
        console.log('  ❌ 期待値との差が5分を超えています');
      }
    } else {
      console.log('  ❌ イベントが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('計算エラー:', error);
  }
}

testDiamondFuji();