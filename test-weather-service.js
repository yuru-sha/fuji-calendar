const { weatherService } = require('./dist/server/services/WeatherService.js');

async function testWeatherService() {
  console.log('WeatherService テスト開始...');
  
  try {
    // 海ほたるPAの座標で明日の天気を取得
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const result = await weatherService.getWeatherInfo(35.464815, 139.872861, tomorrow);
    
    console.log('天気情報取得結果:', result);
    
    if (result) {
      console.log(`天候: ${result.condition}`);
      console.log(`雲量: ${result.cloudCover}%`);
      console.log(`視界: ${result.visibility}km`);
      console.log(`撮影推奨度: ${result.recommendation}`);
    } else {
      console.log('天気情報が取得できませんでした');
    }
    
  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

testWeatherService();