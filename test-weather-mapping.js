// 天気コードマッピングのテスト

function mapWeatherCodeToCondition(code) {
  switch (code) {
    case 0:
      return '晴れ';
    case 1:
    case 2:
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
  if (condition === '晴れ' && cloudCover < 30 && visibility > 15) {
    return 'excellent';
  }

  // 晴れまたは雲量少な目の曇り
  if (condition === '晴れ' || (condition === '曇り' && cloudCover < 50)) {
    return visibility > 10 ? 'good' : 'fair';
  }

  // 曇り
  if (condition === '曇り') {
    return visibility > 10 ? 'fair' : 'poor';
  }

  return 'fair';
}

// テストケース
const testData = [
  { code: 0, cloudCover: 5, visibility: 25, expected: 'excellent' },
  { code: 1, cloudCover: 25, visibility: 24, expected: 'good' },
  { code: 2, cloudCover: 13, visibility: 24, expected: 'good' },
  { code: 3, cloudCover: 60, visibility: 24, expected: 'fair' },
  { code: 61, cloudCover: 80, visibility: 5, expected: 'poor' }
];

console.log('=== 天気コードマッピングテスト ===');
testData.forEach((test, index) => {
  const condition = mapWeatherCodeToCondition(test.code);
  const recommendation = calculateRecommendation(condition, test.cloudCover, test.visibility);
  
  console.log(`テスト ${index + 1}:`);
  console.log(`  天気コード: ${test.code} → ${condition}`);
  console.log(`  雲量: ${test.cloudCover}%, 視界: ${test.visibility}km`);
  console.log(`  推奨度: ${recommendation}${test.expected ? ` (期待値: ${test.expected})` : ''}`);
  console.log('');
});

// 実際のAPIデータでテスト
console.log('=== 実際のAPIデータでテスト ===');
const currentCondition = mapWeatherCodeToCondition(1);
const currentRecommendation = calculateRecommendation(currentCondition, 25, 24.14);
console.log(`現在: ${currentCondition} (雲量: 25%, 視界: 24.14km) → ${currentRecommendation}`);

const tomorrowCondition = mapWeatherCodeToCondition(1);
const tomorrowRecommendation = calculateRecommendation(tomorrowCondition, 10, 24.14);
console.log(`明日: ${tomorrowCondition} (雲量: 10%, 視界: 24.14km) → ${tomorrowRecommendation}`);