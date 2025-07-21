// 修正後のダイヤモンド富士計算をテスト

const { AstronomicalCalculatorAstronomyEngine } = require('./src/server/services/AstronomicalCalculatorAstronomyEngine.ts');

// 海ほたるPA
const testLocation = {
  id: 'umihotaru',
  name: '海ほたるPA',
  latitude: 35.4494,
  longitude: 139.7747,
  elevation: 10,
  fujiAzimuth: 264.36,
  fujiElevation: 2.26,
  fujiDistance: 70
};

async function testFixedDiamondFuji() {
  console.log('=== 修正後のダイヤモンド富士計算テスト ===\n');
  
  const calculator = new AstronomicalCalculatorAstronomyEngine();
  
  // 2025年3月10日をテスト
  const testDate = new Date(2025, 2, 10); // 3月10日
  
  console.log('テスト日付:', testDate.toLocaleDateString('ja-JP'));
  console.log('撮影地点:', testLocation.name);
  
  try {
    const events = await calculator.calculateDiamondFuji(testDate, testLocation);
    
    console.log(`\n発見されたダイヤモンド富士イベント: ${events.length}個`);
    
    events.forEach((event, index) => {
      console.log(`\nイベント${index + 1}:`);
      console.log('タイプ:', event.type);
      console.log('サブタイプ:', event.subType);
      console.log('時刻:', event.time.toLocaleString('ja-JP'));
      console.log('方位角:', event.azimuth.toFixed(2) + '°');
      console.log('仰角:', event.elevation.toFixed(2) + '°');
    });
    
    if (events.length === 0) {
      console.log('❌ ダイヤモンド富士イベントが検出されませんでした');
      
      // デバッグ情報
      console.log('\nデバッグ情報:');
      console.log('月:', testDate.getMonth() + 1);
      
      // シーズン判定をテスト
      const month = testDate.getMonth() + 1;
      const isSeasonOld = month >= 10 || month <= 2; // 旧判定
      const isSeasonNew = month >= 10 || month <= 3; // 新判定
      
      console.log('旧シーズン判定:', isSeasonOld);
      console.log('新シーズン判定:', isSeasonNew);
    } else {
      console.log('✅ ダイヤモンド富士イベントが正常に検出されました');
    }
    
  } catch (error) {
    console.log('エラー:', error.message);
    console.log('スタックトレース:', error.stack);
  }
}

// 実行
testFixedDiamondFuji();