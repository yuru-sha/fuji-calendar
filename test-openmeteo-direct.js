// OpenMeteo APIの直接テスト
async function testOpenMeteoAPI() {
  const latitude = 35.464815;  // 海ほたるPA
  const longitude = 139.872861;
  
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: 'weather_code,cloud_cover_mean,visibility_mean',
    current: 'weather_code,cloud_cover,visibility',
    timezone: 'Asia/Tokyo',
    forecast_days: '7'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  console.log('リクエストURL:', url);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('OpenMeteo API レスポンス:');
    console.log(JSON.stringify(data, null, 2));
    
    // 当日の天気情報
    console.log('\n=== 現在の天気 ===');
    console.log('Weather Code:', data.current.weather_code);
    console.log('Cloud Cover:', data.current.cloud_cover, '%');
    console.log('Visibility:', data.current.visibility, 'm');
    
    // 明日の天気情報
    console.log('\n=== 明日の天気予報 ===');
    console.log('Weather Code:', data.daily.weather_code[1]);
    console.log('Cloud Cover:', data.daily.cloud_cover_mean[1], '%');
    console.log('Visibility:', data.daily.visibility_mean[1], 'm');
    
  } catch (error) {
    console.error('API呼び出しエラー:', error);
  }
}

testOpenMeteoAPI();