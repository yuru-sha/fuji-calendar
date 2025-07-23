/**
 * Geminiさんから教えてもらった海ほたるPAから富士山への仰角計算式の検証
 * 地球の丸みと大気差を考慮した理論計算
 */

/**
 * 海ほたるPAから富士山山頂を見たときの仰角を計算します。
 * 地球の丸みと大気差を考慮します。
 *
 * @param fujiSummitElevation 富士山山頂の標高 (メートル)
 * @param paElevation 海ほたるPAの標高 (メートル)
 * @param observerEyeLevel 観測者の目の高さ (メートル)
 * @param distance 観測地点から富士山までの直線距離 (メートル)
 * @param earthRadius 地球の平均半径 (メートル)
 * @param refractionCoefficient 大気屈折率 (k値, 通常0.13)
 * @returns 計算された仰角 (度数)
 */
function calculateElevationAngle(
  fujiSummitElevation,
  paElevation,
  observerEyeLevel,
  distance,
  earthRadius,
  refractionCoefficient
) {
  // 1. 観測者の実効的な高さ（地面からの目の高さ）
  const observerEffectiveHeight = paElevation + observerEyeLevel;

  // 2. 富士山山頂と観測者の目の高さの標高差
  const heightDifference = fujiSummitElevation - observerEffectiveHeight;

  // 3. 地球の丸みによる見かけの低下 (メートル)
  // 直線距離Dと地球半径Reから計算
  const curvatureDrop = Math.pow(distance, 2) / (2 * earthRadius);

  // 4. 大気差による見かけの持ち上げ（低下の相殺） (メートル)
  // 大気屈折率kと地球の丸みによる低下から計算
  const refractionLift = refractionCoefficient * curvatureDrop;

  // 5. 正味の見かけの低下 (メートル)
  // 地球の丸みによる低下から大気差による持ち上げを差し引く
  const netApparentDrop = curvatureDrop - refractionLift;

  // 6. 最終的な見かけの垂直距離
  // 標高差から正味の見かけの低下を差し引く
  const apparentVerticalDistance = heightDifference - netApparentDrop;

  // 7. 仰角の計算 (ラジアン)
  const angleRad = Math.atan2(apparentVerticalDistance, distance);

  // 8. 仰角を度数に変換して返す
  return angleRad * (180 / Math.PI);
}

/**
 * 既存のプロジェクトの計算方法（地球曲率考慮なし）
 */
function calculateSimpleElevation(fromLat, fromLon, fromElev, toLat, toLon, toElev) {
  // Haversine formula for distance
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Simple elevation calculation
  const heightDiff = toElev - fromElev;
  const elevation = Math.atan(heightDiff / distance) * 180 / Math.PI;
  
  return { distance, elevation };
}

// 海ほたるPA北岸の座標（データベースから取得済み）
const UMIHOTARU_NORTH_SHORE = {
  latitude: 35.464815,
  longitude: 139.872861,
  elevation: 5,
  name: '東京湾アクアライン・海ほたるPA北岸付近'
};

// 富士山の座標
const FUJI_COORDS = {
  latitude: 35 + 21/60 + 38/3600,   // 35.360556度
  longitude: 138 + 43/60 + 39/3600, // 138.727500度
  elevation: 3776
};

console.log('=== 海ほたるPAから富士山への仰角計算比較 ===');
console.log('');

// 1. Geminiさんの詳細計算式
const FUJI_SUMMIT_ELEVATION = 3776; // メートル
const PA_ELEVATION = 5; // メートル
const OBSERVER_EYE_LEVEL = 1.7; // メートル
const DISTANCE = 105000; // 105kmをメートルに（概算）
const EARTH_RADIUS = 6371000; // 地球の平均半径 (メートル)
const REFRACTION_COEFFICIENT = 0.13; // 大気屈折率 (k値)

const geminiElevation = calculateElevationAngle(
  FUJI_SUMMIT_ELEVATION,
  PA_ELEVATION,
  OBSERVER_EYE_LEVEL,
  DISTANCE,
  EARTH_RADIUS,
  REFRACTION_COEFFICIENT
);

console.log('1. Geminiさんの詳細計算式:');
console.log(`   パラメータ:`);
console.log(`     富士山標高: ${FUJI_SUMMIT_ELEVATION}m`);
console.log(`     PA標高: ${PA_ELEVATION}m`);
console.log(`     アイレベル: ${OBSERVER_EYE_LEVEL}m`);
console.log(`     距離: ${DISTANCE/1000}km`);
console.log(`     地球半径: ${EARTH_RADIUS/1000}km`);
console.log(`     大気屈折率k: ${REFRACTION_COEFFICIENT}`);
console.log(`   結果: ${geminiElevation.toFixed(6)}度`);
console.log('');

// 2. 既存プロジェクトの簡易計算（地球曲率なし）
const simpleResult = calculateSimpleElevation(
  UMIHOTARU_NORTH_SHORE.latitude,
  UMIHOTARU_NORTH_SHORE.longitude,
  UMIHOTARU_NORTH_SHORE.elevation + OBSERVER_EYE_LEVEL, // アイレベル追加
  FUJI_COORDS.latitude,
  FUJI_COORDS.longitude,
  FUJI_COORDS.elevation
);

console.log('2. 既存プロジェクトの簡易計算:');
console.log(`   実際の距離: ${(simpleResult.distance/1000).toFixed(3)}km`);
console.log(`   結果: ${simpleResult.elevation.toFixed(6)}度`);
console.log('');

// 3. 正確な距離でGeminiの計算式を再実行
const accurateGeminiElevation = calculateElevationAngle(
  FUJI_SUMMIT_ELEVATION,
  PA_ELEVATION,
  OBSERVER_EYE_LEVEL,
  simpleResult.distance, // 正確な距離を使用
  EARTH_RADIUS,
  REFRACTION_COEFFICIENT
);

console.log('3. Gemini計算式（正確な距離使用）:');
console.log(`   正確な距離: ${(simpleResult.distance/1000).toFixed(3)}km`);
console.log(`   結果: ${accurateGeminiElevation.toFixed(6)}度`);
console.log('');

// 4. 計算過程の詳細表示
console.log('=== Gemini計算式の詳細過程 ===');
const observerEffectiveHeight = PA_ELEVATION + OBSERVER_EYE_LEVEL;
const heightDifference = FUJI_SUMMIT_ELEVATION - observerEffectiveHeight;
const curvatureDrop = Math.pow(simpleResult.distance, 2) / (2 * EARTH_RADIUS);
const refractionLift = REFRACTION_COEFFICIENT * curvatureDrop;
const netApparentDrop = curvatureDrop - refractionLift;
const apparentVerticalDistance = heightDifference - netApparentDrop;

console.log(`観測者実効高度: ${observerEffectiveHeight}m (${PA_ELEVATION}m + ${OBSERVER_EYE_LEVEL}m)`);
console.log(`標高差: ${heightDifference}m`);
console.log(`地球曲率による低下: ${curvatureDrop.toFixed(3)}m`);
console.log(`大気屈折による持ち上げ: ${refractionLift.toFixed(3)}m`);
console.log(`正味の見かけ低下: ${netApparentDrop.toFixed(3)}m`);
console.log(`見かけの垂直距離: ${apparentVerticalDistance.toFixed(3)}m`);
console.log(`最終仰角: ${accurateGeminiElevation.toFixed(6)}度`);
console.log('');

// 5. 比較と考察
console.log('=== 比較結果 ===');
console.log(`簡易計算:        ${simpleResult.elevation.toFixed(6)}度`);
console.log(`Gemini詳細計算:  ${accurateGeminiElevation.toFixed(6)}度`);
console.log(`スーパー地形実測: 1.650000度`);
console.log('');

const diff1 = Math.abs(simpleResult.elevation - 1.65);
const diff2 = Math.abs(accurateGeminiElevation - 1.65);

console.log(`簡易計算との差:   ${diff1.toFixed(6)}度`);
console.log(`Gemini計算との差: ${diff2.toFixed(6)}度`);
console.log('');

console.log('=== 結論 ===');
if (diff2 < diff1) {
  console.log('✅ Geminiの詳細計算がスーパー地形実測値により近い結果を示しています');
  console.log('   地球曲率と大気屈折の考慮により、より正確な仰角計算が可能');
} else {
  console.log('⚠️  簡易計算の方がスーパー地形実測値に近い結果');
  console.log('   実測値には他の要因（地形の詳細、観測条件等）が影響している可能性');
}

console.log('');
console.log('この詳細計算式は理論的に非常に優れており、');
console.log('プロジェクトの仰角計算精度向上に活用できます。');