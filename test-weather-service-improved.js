// 改善されたWeatherServiceのテスト

function mapWeatherCodeToCondition(code) {
  switch (code) {
    case 0:
      return '晴れ';
    case 1:
      return '概ね晴れ';
    case 2:
      return '一部曇り';
    case 3:
      return '曇り';
    case 45:
    case 48:
      return '霧';
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return '小雨';
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return '雨';
    case 71:
    case 73:
    case 75:
    case 77:
      return '雪';
    case 80:
    case 81:
    case 82:
      return 'にわか雨';
    case 85:
    case 86:
      return 'にわか雪';
    case 95:
    case 96:
    case 99:
      return '雷雨';
    default:
      return '不明';
  }
}

function calculateRecommendation(condition, cloudCover, visibility) {
  // 雨・雲・雷雨は撮影困難
  if (condition.includes('雨') || condition.includes('雪') || condition.includes('雷')) {
    return 'poor';
  }

  // 霧は視界不良
  if (condition === '霧') {
    return 'poor';
  }

  // 晴れで雲量少なく、視界良好
  if ((condition === '晴れ' || condition === '概ね晴れ') && cloudCover < 30 && visibility > 15) {
    return 'excellent';
  }

  // 晴れ系または雲量少な目の曇り
  if (condition === '晴れ' || condition === '概ね晴れ' || condition === '一部曇り' || (condition === '曇り' && cloudCover < 50)) {
    return visibility > 10 ? 'good' : 'fair';
  }

  // 曇り
  if (condition === '曇り') {
    return visibility > 10 ? 'fair' : 'poor';
  }

  return 'fair';
}

// 実際のAPIデータからの天気情報シミュレーション
async function simulateWeatherService() {
  console.log('=== WeatherService シミュレーション ===');
  
  // 現在の天気（APIから取得した実データ）
  const currentWeather = {
    weatherCode: 1,
    cloudCover: 25,
    visibility: 24.14
  };
  
  const currentCondition = mapWeatherCodeToCondition(currentWeather.weatherCode);
  const currentRecommendation = calculateRecommendation(
    currentCondition, 
    currentWeather.cloudCover, 
    currentWeather.visibility
  );
  
  console.log('現在の天気:');
  console.log(`  天候: ${currentCondition}`);
  console.log(`  雲量: ${currentWeather.cloudCover}%`);
  console.log(`  視界: ${currentWeather.visibility}km`);
  console.log(`  撮影推奨度: ${currentRecommendation}`);
  
  // 明日の天気
  const tomorrowWeather = {
    weatherCode: 1,
    cloudCover: 10,
    visibility: 24.14
  };
  
  const tomorrowCondition = mapWeatherCodeToCondition(tomorrowWeather.weatherCode);
  const tomorrowRecommendation = calculateRecommendation(
    tomorrowCondition, 
    tomorrowWeather.cloudCover, 
    tomorrowWeather.visibility
  );
  
  console.log('\n明日の天気:');
  console.log(`  天候: ${tomorrowCondition}`);
  console.log(`  雲量: ${tomorrowWeather.cloudCover}%`);
  console.log(`  視界: ${tomorrowWeather.visibility}km`);
  console.log(`  撮影推奨度: ${tomorrowRecommendation}`);
  
  // 様々な天気条件のテスト
  console.log('\n=== 様々な天気条件のテスト ===');
  const testCases = [
    { code: 0, cloudCover: 5, visibility: 25, desc: '完全な晴れ' },
    { code: 1, cloudCover: 20, visibility: 24, desc: '概ね晴れ' },
    { code: 2, cloudCover: 35, visibility: 20, desc: '一部曇り' },
    { code: 3, cloudCover: 70, visibility: 15, desc: '曇り' },
    { code: 61, cloudCover: 85, visibility: 8, desc: '雨' },
    { code: 45, cloudCover: 90, visibility: 2, desc: '霧' }
  ];
  
  testCases.forEach((test, index) => {
    const condition = mapWeatherCodeToCondition(test.code);
    const recommendation = calculateRecommendation(test.condition || condition, test.cloudCover, test.visibility);
    
    console.log(`${index + 1}. ${test.desc}:`);
    console.log(`   天候: ${condition} | 雲量: ${test.cloudCover}% | 視界: ${test.visibility}km`);
    console.log(`   撮影推奨度: ${recommendation}`);
  });
}

simulateWeatherService();