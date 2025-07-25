/**
 * 富津岬から富士山頂への仰角計算検証スクリプト
 * 期待値: 1.87度
 * 実際値: 2.386704度
 * 問題の原因を特定する
 */

// 富津岬の正確な座標
const FUTTSU_LOCATION = {
  name: '富津岬',
  latitude: 35.313326,
  longitude: 139.785738,
  elevation: 1.3,  // 地面標高
  eyeLevel: 1.7,   // アイレベル
  effectiveElevation: 1.3 + 1.7  // 実効標高 = 3.0m
};

// 富士山座標（剣ヶ峰）
const FUJI_COORDINATES = {
  latitude: 35.3605556,   // 35°21'38"
  longitude: 138.7275,    // 138°43'39"
  elevation: 3776         // 標高
};

// 物理定数
const EARTH_RADIUS = 6371000; // 地球半径（メートル）
const ATMOSPHERIC_REFRACTION_STANDARD = 0.57; // 標準大気屈折（度）

// 度をラジアンに変換
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// ラジアンを度に変換
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

// 球面距離計算（Haversine公式）
function calculateDistance(fromLocation, toLocation) {
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(toLocation.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(toLocation.longitude - fromLocation.longitude);

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

// 現在の実装による仰角計算
function calculateElevationCurrent(fromLocation) {
  console.log('\n=== 現在の実装による計算 ===');
  
  // 1. 距離計算
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  console.log(`1. 距離: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)}km)`);
  
  // 2. 高度差
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.effectiveElevation;
  console.log(`2. 高度差: ${FUJI_COORDINATES.elevation}m - ${fromLocation.effectiveElevation}m = ${heightDifference.toFixed(1)}m`);
  
  // 3. 地球曲率補正
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`3. 地球曲率補正: ${curvatureCorrection.toFixed(2)}m`);
  
  // 4. 有効高度差
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  console.log(`4. 有効高度差: ${heightDifference.toFixed(1)}m - ${curvatureCorrection.toFixed(2)}m = ${effectiveHeightDiff.toFixed(1)}m`);
  
  // 5. 基本仰角（大気屈折前）
  const elevationRadians = Math.atan(effectiveHeightDiff / distance);
  const elevationDegrees = toDegrees(elevationRadians);
  console.log(`5. 基本仰角: atan(${effectiveHeightDiff.toFixed(1)} / ${distance.toFixed(0)}) = ${elevationDegrees.toFixed(6)}°`);
  
  // 6. 大気屈折補正
  const refractionCorrection = calculateAtmosphericRefraction(elevationDegrees);
  console.log(`6. 大気屈折補正: ${refractionCorrection.toFixed(6)}°`);
  
  // 7. 最終仰角
  const finalElevation = elevationDegrees + refractionCorrection;
  console.log(`7. 最終仰角: ${elevationDegrees.toFixed(6)}° + ${refractionCorrection.toFixed(6)}° = ${finalElevation.toFixed(6)}°`);
  
  return {
    distance,
    heightDifference,
    curvatureCorrection,
    effectiveHeightDiff,
    basicElevation: elevationDegrees,
    refractionCorrection,
    finalElevation
  };
}

// 簡易計算（大気屈折なし）
function calculateElevationSimple(fromLocation) {
  console.log('\n=== 簡易計算（大気屈折なし） ===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.effectiveElevation;
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  const effectiveHeightDiff = heightDifference - curvatureCorrection;
  const elevationDegrees = toDegrees(Math.atan(effectiveHeightDiff / distance));
  
  console.log(`簡易仰角: ${elevationDegrees.toFixed(6)}°`);
  return elevationDegrees;
}

// 地球曲率補正なしの計算
function calculateElevationNoCurvature(fromLocation) {
  console.log('\n=== 地球曲率補正なしの計算 ===');
  
  const distance = calculateDistance(fromLocation, FUJI_COORDINATES);
  const heightDifference = FUJI_COORDINATES.elevation - fromLocation.effectiveElevation;
  const elevationDegrees = toDegrees(Math.atan(heightDifference / distance));
  
  console.log(`曲率補正なし仰角: ${elevationDegrees.toFixed(6)}°`);
  return elevationDegrees;
}

// 期待値1.87度から逆算
function reverseCalculation() {
  console.log('\n=== 期待値1.87度からの逆算 ===');
  
  const expectedElevation = 1.87;
  const distance = calculateDistance(FUTTSU_LOCATION, FUJI_COORDINATES);
  
  // 大気屈折を除去
  const refractionCorrection = calculateAtmosphericRefraction(expectedElevation);
  const basicElevation = expectedElevation - refractionCorrection;
  console.log(`期待される基本仰角: ${expectedElevation}° - ${refractionCorrection.toFixed(6)}° = ${basicElevation.toFixed(6)}°`);
  
  // 必要な有効高度差
  const requiredHeightDiff = distance * Math.tan(toRadians(basicElevation));
  console.log(`必要な有効高度差: ${requiredHeightDiff.toFixed(1)}m`);
  
  // 地球曲率補正
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`地球曲率補正: ${curvatureCorrection.toFixed(2)}m`);
  
  // 必要な実際の高度差
  const requiredActualHeightDiff = requiredHeightDiff + curvatureCorrection;
  console.log(`必要な実際の高度差: ${requiredActualHeightDiff.toFixed(1)}m`);
  
  // 必要な富士山標高（逆算）
  const requiredFujiElevation = FUTTSU_LOCATION.effectiveElevation + requiredActualHeightDiff;
  console.log(`逆算された富士山標高: ${requiredFujiElevation.toFixed(1)}m`);
  
  console.log(`実際の富士山標高: ${FUJI_COORDINATES.elevation}m`);
  console.log(`差: ${(FUJI_COORDINATES.elevation - requiredFujiElevation).toFixed(1)}m`);
}

// メイン実行
function main() {
  console.log('=== 富津岬から富士山頂への仰角計算検証 ===');
  console.log(`富津岬座標: ${FUTTSU_LOCATION.latitude}°N, ${FUTTSU_LOCATION.longitude}°E`);
  console.log(`富津岬実効標高: ${FUTTSU_LOCATION.effectiveElevation}m (地面${FUTTSU_LOCATION.elevation}m + アイレベル${FUTTSU_LOCATION.eyeLevel}m)`);
  console.log(`富士山座標: ${FUJI_COORDINATES.latitude}°N, ${FUJI_COORDINATES.longitude}°E`);
  console.log(`富士山標高: ${FUJI_COORDINATES.elevation}m`);
  
  const currentResult = calculateElevationCurrent(FUTTSU_LOCATION);
  const simpleResult = calculateElevationSimple(FUTTSU_LOCATION);
  const noCurvatureResult = calculateElevationNoCurvature(FUTTSU_LOCATION);
  
  reverseCalculation();
  
  console.log('\n=== 結果まとめ ===');
  console.log(`現在の実装: ${currentResult.finalElevation.toFixed(6)}°`);
  console.log(`簡易計算: ${simpleResult.toFixed(6)}°`);
  console.log(`曲率補正なし: ${noCurvatureResult.toFixed(6)}°`);
  console.log(`期待値: 1.87°`);
  console.log(`差（現在-期待）: ${(currentResult.finalElevation - 1.87).toFixed(6)}°`);
  
  // 問題の分析
  console.log('\n=== 問題分析 ===');
  if (Math.abs(currentResult.finalElevation - 1.87) > 0.1) {
    console.log('❌ 仰角計算に問題があります');
    
    if (Math.abs(simpleResult - 1.87) < 0.1) {
      console.log('💡 大気屈折補正が過大の可能性');
    } else if (Math.abs(noCurvatureResult - 1.87) < 0.1) {
      console.log('💡 地球曲率補正が過大の可能性');
    } else {
      console.log('💡 基本的な計算式に問題の可能性');
    }
  } else {
    console.log('✅ 仰角計算は正常です');
  }
}

main();