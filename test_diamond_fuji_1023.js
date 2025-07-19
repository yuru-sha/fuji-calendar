// 2025年10月23日の舞浜海岸での沈むダイヤモンド富士を計算
const path = require('path');

// プロジェクトのルートディレクトリを設定
process.chdir('/Users/tomo/github.com/yuru-sha/fuji-calendar');

// 必要なモジュールをインポート
const { AstronomicalCalculator } = require('./src/server/services/AstronomicalCalculator');

// 舞浜海岸の位置情報（前回と同じ）
const maihamaLocation = {
  id: 999,
  name: '舞浜海岸',
  prefecture: '千葉県',
  latitude: 35.6225,
  longitude: 139.8853,
  elevation: 3,
  description: '東京ディズニーリゾート付近の海岸',
  accessInfo: '舞浜駅から徒歩',
  warnings: '',
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testDiamondFuji() {
  try {
    // AstronomicalCalculatorのインスタンスを作成
    const calculator = new AstronomicalCalculator();

    // 2025年10月23日を設定
    const targetDate = new Date(2025, 9, 23); // 月は0ベース

    console.log('=== 舞浜海岸 2025年10月23日 ダイヤモンド富士計算 ===');
    console.log(`日付: ${targetDate.toLocaleDateString('ja-JP')}`);
    console.log(`場所: ${maihamaLocation.name} (${maihamaLocation.latitude}°N, ${maihamaLocation.longitude}°E, 標高${maihamaLocation.elevation}m)`);
    console.log('');

    // 富士山への方位角を計算
    const fujiAzimuth = calculator.calculateAzimuthToFuji(maihamaLocation);
    console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);

    // 富士山頂への視線角度を計算
    const fujiViewingAngle = calculator.calculateViewingAngleToFujiSummit(maihamaLocation);
    console.log(`富士山頂への視線角度: ${fujiViewingAngle.toFixed(2)}°`);
    console.log('');

    // ダイヤモンド富士を計算
    const diamondEvents = calculator.calculateDiamondFuji(targetDate, [maihamaLocation]);

    console.log('=== ダイヤモンド富士の結果 ===');
    if (diamondEvents.length === 0) {
      console.log('❌ この日は舞浜海岸からダイヤモンド富士は観測できません');
    } else {
      diamondEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.subType === 'rising' ? '昇る' : '沈む'}ダイヤモンド富士`);
        console.log(`   時刻: ${event.time.toLocaleTimeString('ja-JP')}`);
        console.log(`   太陽の方位角: ${event.azimuth.toFixed(2)}°`);
        console.log(`   太陽の高度: ${event.elevation.toFixed(2)}°`);
        console.log(`   富士山との方位角差: ${Math.abs(event.azimuth - fujiAzimuth).toFixed(2)}°`);
        console.log(`   高度差: ${Math.abs(event.elevation - fujiViewingAngle).toFixed(2)}°`);
        console.log('');
      });
    }

    // 参考：日没時刻の確認
    const sunPosition = calculator.getSunPosition(targetDate, maihamaLocation.latitude, maihamaLocation.longitude, maihamaLocation.elevation);
    console.log('=== 参考情報 ===');
    console.log(`日没時刻: ${sunPosition.sunset.toLocaleTimeString('ja-JP')}`);
    console.log(`日没時の太陽方位角: ${calculator.getSunPosition(sunPosition.sunset, maihamaLocation.latitude, maihamaLocation.longitude, maihamaLocation.elevation).azimuth.toFixed(2)}°`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

testDiamondFuji();