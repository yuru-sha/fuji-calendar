/**
 * 富津岬から富士山頂への仰角計算の詳細検証
 * 期待値: 1.87度
 * 実際値: 2.386704度
 * 問題の特定と修正
 */

// 富津岬の正確な座標
const FUTTSU_LOCATION = {
  name: '富津岬',
  latitude: 35.313326,
  longitude: 139.785738,
  elevation: 3.0  // 1.3m(地面) + 1.7m(アイレベル)
};

// 富士山座標（剣ヶ峰）
const FUJI_COORDINATES = {
  latitude: 35.3605556,
  longitude: 138.7275,
  elevation: 3776
};

// 物理定数
const EARTH_RADIUS = 6371000; // メートル
const ATMOSPHERIC_REFRACTION_STANDARD = 0.57; // 度

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

// 球面距離計算（Haversine公式）
function calculateDistance(loc1, loc2) {
  const lat1 = toRadians(loc1.latitude);
  const lat2 = toRadians(loc2.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(loc2.longitude - loc1.longitude);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

// 大気屈折補正計算
function calculateAtmosphericRefraction(apparentElevation) {
  if (apparentElevation < -2) return 0;
  
  const elevationRadians = toRadians(Math.abs(apparentElevation));
  const refraction = ATMOSPHERIC_REFRACTION_STANDARD * Math.cos(elevationRadians);
  
  return apparentElevation >= 0 ? refraction : -refraction;
}

// 現在の実装（問題のある計算）
function calculateElevationCurrent(fromLocation) {
  console.log('\n=== 現在の実装による計算 ===');
  
  // 1. 距離計算
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)}km)`);
  
  // 2. 高度差
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  console.log(`2. 高度差: ${heightDifference.toFixed(1)}m`);
  
  // 3. 地球曲率補正
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)}m`);
  
  // 4. 有効高度差
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${effectiveHeightDiff.toFixed(1)}m`);
  
  // 5. 基本仰角
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 基本仰角: ${elevationDegrees.toFixed(6)}度`);
  
  // 6. 大気屈折補正
  const refractionCorrection = calculateAtmosphericRefraction(elevationDegrees);
  console.log(`6. 大気屈折補正: ${refractionCorrection.toFixed(6)}度`);
  
  // 7. 最終仰角
  const finalElevation = elevationDegrees + refractionCorrection;
  console.log(`7. 最終仰角: ${finalElevation.toFixed(6)}度`);
  
  return finalElevation;
}

// 修正版計算（大気屈折補正の問題を修正）
function calculateElevationFixed(fromLocation) {
  console.log('\n=== 修正版計算 ===');
  
  // 1. 距離計算
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)}km)`);
  
  // 2. 高度差
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  console.log(`2. 高度差: ${heightDifference.toFixed(1)}m`);
  
  // 3. 地球曲率補正
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)}m`);
  
  // 4. 有効高度差
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${effectiveHeightDiff.toFixed(1)}m`);
  
  // 5. 基本仰角
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 基本仰角: ${elevationDegrees.toFixed(6)}度`);
  
  // 6. 修正された大気屈折補正
  // 問題: 高い仰角（1.8度程度）では大気屈折の影響は小さい
  // 0.57度は地平線付近（0度）での値
  let refractionCorrection;
  if (elevationDegrees > 5) {
    // 5度以上では大気屈折はほぼ無視できる
    refractionCorrection = 0;
  } else {
    // より正確な大気屈折式を使用
    // R = 0.0167 / tan(h + 7.31/(h + 4.4)) (度)
    // ここでhは見かけの高度（度）
    const h = Math.abs(elevationDegrees);
    if (h > 0.1) {
      refractionCorrection = 0.0167 / Math.tan(toRadians(h + 7.31/(h + 4.4)));
    } else {
      refractionCorrection = 0.57; // 地平線付近のみ
    }
  }
  
  console.log(`6. 修正大気屈折補正: ${refractionCorrection.toFixed(6)}度`);
  
  // 7. 最終仰角
  const finalElevation = elevationDegrees + refractionCorrection;
  console.log(`7. 最終仰角: ${finalElevation.toFixed(6)}度`);
  
  return finalElevation;
}

// シンプル計算（大気屈折なし）
function calculateElevationSimple(fromLocation) {
  console.log('\n=== シンプル計算（大気屈折なし） ===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  
  console.log(`距離: ${(distance/1000).toFixed(2)}km`);
  console.log(`有効高度差: ${effectiveHeightDiff.toFixed(1)}m`);
  console.log(`仰角: ${elevationDegrees.toFixed(6)}度`);
  
  return elevationDegrees;
}

// メイン実行
console.log('富津岬から富士山頂への仰角計算検証');
console.log('=====================================');
console.log(`富津岬座標: ${FUTTSU_LOCATION.latitude}°N, ${FUTTSU_LOCATION.longitude}°E`);
console.log(`富津岬標高: ${FUTTSU_LOCATION.elevation}m (地面1.3m + アイレベル1.7m)`);
console.log(`富士山座標: ${FUJI_COORDINATES.latitude}°N, ${FUJI_COORDINATES.longitude}°E`);
console.log(`富士山標高: ${FUJI_COORDINATES.elevation}m`);
console.log(`期待仰角: 1.87度`);

const currentResult = calculateElevationCurrent(FUTTSU_LOCATION);
const fixedResult = calculateElevationFixed(FUTTSU_LOCATION);
const simpleResult = calculateElevationSimple(FUTTSU_LOCATION);

console.log('\n=== 結果比較 ===');
console.log(`期待値: 1.87度`);
console.log(`現在の実装: ${currentResult.toFixed(6)}度 (差: ${(currentResult - 1.87).toFixed(3)}度)`);
console.log(`修正版: ${fixedResult.toFixed(6)}度 (差: ${(fixedResult - 1.87).toFixed(3)}度)`);
console.log(`シンプル版: ${simpleResult.toFixed(6)}度 (差: ${(simpleResult - 1.87).toFixed(3)}度)`);

console.log('\n=== 問題分析 ===');
if (Math.abs(currentResult - 1.87) > 0.1) {
  console.log('❌ 現在の実装に問題があります');
  if (currentResult > 1.87) {
    console.log('   → 大気屈折補正が過大に適用されている可能性');
  }
}

if (Math.abs(fixedResult - 1.87) < Math.abs(currentResult - 1.87)) {
  console.log('✅ 修正版の方が期待値に近い');
}

if (Math.abs(simpleResult - 1.87) < 0.05) {
  console.log('💡 シンプル版（大気屈折なし）が最も正確 → 大気屈折補正が不要な高度');
}