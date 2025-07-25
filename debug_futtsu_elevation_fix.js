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
function calculateDistance(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

// 現在の実装（問題のある計算）
function calculateElevationCurrent(fromLocation) {
  console.log('\n=== 現在の実装（問題のある計算）===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${(distance / 1000).toFixed(3)} km`);
  
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  console.log(`2. 高度差: ${heightDifference.toFixed(1)} m`);
  
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)} m`);
  
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${effectiveHeightDiff.toFixed(1)} m`);
  
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 基本仰角: ${elevationDegrees.toFixed(6)} 度`);
  
  // 大気屈折補正（問題の可能性）
  const refractionCorrection = calculateAtmosphericRefraction(elevationDegrees);
  console.log(`6. 大気屈折補正: ${refractionCorrection.toFixed(6)} 度`);
  
  const finalElevation = elevationDegrees + refractionCorrection;
  console.log(`7. 最終仰角: ${finalElevation.toFixed(6)} 度`);
  
  return finalElevation;
}

// 現在の大気屈折計算
function calculateAtmosphericRefraction(apparentElevation) {
  if (apparentElevation < -2) return 0;
  
  const elevationRadians = toRadians(Math.abs(apparentElevation));
  const refraction = ATMOSPHERIC_REFRACTION_STANDARD * Math.cos(elevationRadians);
  
  return apparentElevation >= 0 ? refraction : -refraction;
}

// 修正版：より正確な大気屈折計算
function calculateAtmosphericRefractionFixed(apparentElevation) {
  if (apparentElevation < -2) return 0;
  
  // 標準的な大気屈折公式（Bennett, 1982）
  // R = 1.02 / tan(h + 10.3/(h + 5.11)) arcmin
  // ここでhは見かけの高度（度）
  
  const h = Math.abs(apparentElevation);
  if (h < 0.1) {
    // 地平線付近の特別な処理
    return 0.57; // 約34分角
  }
  
  // より正確な公式
  const hRad = toRadians(h);
  const refraction = 1.02 / Math.tan(hRad + toRadians(10.3 / (h + 5.11))) / 60; // arcmin to degrees
  
  return apparentElevation >= 0 ? refraction : -refraction;
}

// 修正版の仰角計算
function calculateElevationFixed(fromLocation) {
  console.log('\n=== 修正版の計算 ===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${(distance / 1000).toFixed(3)} km`);
  
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  console.log(`2. 高度差: ${heightDifference.toFixed(1)} m`);
  
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)} m`);
  
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${effectiveHeightDiff.toFixed(1)} m`);
  
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 基本仰角: ${elevationDegrees.toFixed(6)} 度`);
  
  // 修正された大気屈折補正
  const refractionCorrection = calculateAtmosphericRefractionFixed(elevationDegrees);
  console.log(`6. 修正大気屈折補正: ${refractionCorrection.toFixed(6)} 度`);
  
  const finalElevation = elevationDegrees + refractionCorrection;
  console.log(`7. 最終仰角: ${finalElevation.toFixed(6)} 度`);
  
  return finalElevation;
}

// シンプルな計算（大気屈折なし）
function calculateElevationSimple(fromLocation) {
  console.log('\n=== シンプルな計算（大気屈折なし）===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${(distance / 1000).toFixed(3)} km`);
  
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.elevation;
  console.log(`2. 高度差: ${heightDifference.toFixed(1)} m`);
  
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)} m`);
  
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${effectiveHeightDiff.toFixed(1)} m`);
  
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 最終仰角（屈折補正なし）: ${elevationDegrees.toFixed(6)} 度`);
  
  return elevationDegrees;
}

// メイン実行
console.log('富津岬から富士山頂への仰角計算検証');
console.log('=====================================');
console.log(`富津岬座標: ${FUTTSU_LOCATION.latitude}°N, ${FUTTSU_LOCATION.longitude}°E`);
console.log(`富津岬標高: ${FUTTSU_LOCATION.elevation}m（地面1.3m + アイレベル1.7m）`);
console.log(`富士山座標: ${FUJI_COORDINATES.latitude}°N, ${FUJI_COORDINATES.longitude}°E`);
console.log(`富士山標高: ${FUJI_COORDINATES.elevation}m`);
console.log(`期待値: 1.87度`);

const currentResult = calculateElevationCurrent(FUTTSU_LOCATION);
const fixedResult = calculateElevationFixed(FUTTSU_LOCATION);
const simpleResult = calculateElevationSimple(FUTTSU_LOCATION);

console.log('\n=== 結果比較 ===');
console.log(`期待値:           1.87000 度`);
console.log(`現在の実装:       ${currentResult.toFixed(5)} 度 (差: ${(currentResult - 1.87).toFixed(5)})`);
console.log(`修正版:           ${fixedResult.toFixed(5)} 度 (差: ${(fixedResult - 1.87).toFixed(5)})`);
console.log(`シンプル版:       ${simpleResult.toFixed(5)} 度 (差: ${(simpleResult - 1.87).toFixed(5)})`);

console.log('\n=== 問題分析 ===');
if (Math.abs(currentResult - 1.87) > 0.1) {
  console.log('❌ 現在の実装に問題があります');
  
  if (Math.abs(simpleResult - 1.87) < 0.1) {
    console.log('💡 大気屈折補正が過大です');
  } else {
    console.log('💡 基本計算に問題があります');
  }
}

if (Math.abs(fixedResult - 1.87) < Math.abs(currentResult - 1.87)) {
  console.log('✅ 修正版の方が期待値に近いです');
}