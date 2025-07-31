#!/usr/bin/env node

// 仰角 3.61 度から天子ヶ岳の正しい座標または標高を逆算

const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

const CURRENT_TENJOGATAKE = {
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319
};

// 現在の距離計算
function calculateDistance(lat1, lon1, lat2, lon2) {
  const EARTH_RADIUS = 6371000;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const deltaLatRad = (lat2 - lat1) * Math.PI / 180;
  const deltaLonRad = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

// 地球曲率補正ありの仰角計算
function calculateElevationAngle(distance, heightDiff) {
  const EARTH_RADIUS = 6371000;
  const apparentHeightDiff = heightDiff - (distance * distance) / (2 * EARTH_RADIUS);
  const elevationRad = Math.atan(apparentHeightDiff / distance);
  return elevationRad * 180 / Math.PI;
}

// 仰角 3.61 度から必要な標高を逆算
function calculateRequiredElevation(distance, targetElevationDeg, fujiElevation) {
  const EARTH_RADIUS = 6371000;
  const targetElevationRad = targetElevationDeg * Math.PI / 180;
  
  // tan(仰角) = (見かけ高度差) / 距離
  const apparentHeightDiff = Math.tan(targetElevationRad) * distance;
  
  // 見かけ高度差 = 実際の高度差 - 地球曲率補正
  const earthCurvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  const actualHeightDiff = apparentHeightDiff + earthCurvatureCorrection;
  
  // 天子ヶ岳の標高 = 富士山標高 - 実際の高度差
  return fujiElevation - actualHeightDiff;
}

console.log('=== 天子ヶ岳座標データ検証 ===');

const currentDistance = calculateDistance(
  CURRENT_TENJOGATAKE.latitude, CURRENT_TENJOGATAKE.longitude,
  FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
);

const currentHeightDiff = FUJI_COORDINATES.elevation - CURRENT_TENJOGATAKE.elevation;
const currentElevationAngle = calculateElevationAngle(currentDistance, currentHeightDiff);

console.log('現在の設定:');
console.log(`距離: ${(currentDistance / 1000).toFixed(1)}km`);
console.log(`高度差: ${currentHeightDiff}m`);
console.log(`仰角: ${currentElevationAngle.toFixed(3)}°`);

console.log('\n=== 仰角 3.61 度に合わせるための修正案 ===');

// パターン 1: 距離を変えずに標高を調整
const requiredElevation = calculateRequiredElevation(currentDistance, 3.61, FUJI_COORDINATES.elevation);
console.log(`パターン 1（距離固定）: 天子ヶ岳標高を ${requiredElevation.toFixed(0)}m に変更`);

// パターン 2: 標高を変えずに距離を調整（座標移動）
function calculateRequiredDistance(heightDiff, targetElevationDeg) {
  const EARTH_RADIUS = 6371000;
  const targetElevationRad = targetElevationDeg * Math.PI / 180;
  
  // 二次方程式: tan(仰角) = (高度差 - d²/(2*R)) / d
  // d * tan(仰角) = 高度差 - d²/(2*R)
  // d²/(2*R) + d * tan(仰角) - 高度差 = 0
  
  const a = 1 / (2 * EARTH_RADIUS);
  const b = Math.tan(targetElevationRad);
  const c = -heightDiff;
  
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  
  const d1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const d2 = (-b - Math.sqrt(discriminant)) / (2 * a);
  
  return d1 > 0 ? d1 : d2;
}

const requiredDistance = calculateRequiredDistance(currentHeightDiff, 3.61);
if (requiredDistance) {
  console.log(`パターン 2（標高固定）: 富士山との距離を ${(requiredDistance / 1000).toFixed(1)}km に変更`);
  
  // 新しい座標を概算（方位角 78.73 度方向に移動）
  const azimuthRad = 78.73 * Math.PI / 180;
  const deltaDistance = requiredDistance - currentDistance;
  
  // 概算座標変更（正確には球面三角法が必要）
  const deltaLat = (deltaDistance * Math.cos(azimuthRad)) / 111000; // 緯度 1 度≈111km
  const deltaLon = (deltaDistance * Math.sin(azimuthRad)) / (111000 * Math.cos(CURRENT_TENJOGATAKE.latitude * Math.PI / 180));
  
  const newLat = CURRENT_TENJOGATAKE.latitude - deltaLat;
  const newLon = CURRENT_TENJOGATAKE.longitude - deltaLon;
  
  console.log(`  → 新座標概算: 緯度 ${newLat.toFixed(6)}, 経度 ${newLon.toFixed(6)}`);
} else {
  console.log('パターン 2: 数学的に不可能');
}

// パターン 3: 実際の天子ヶ岳の正確な座標を調査
console.log('\n=== 推奨対応 ===');
console.log('1. 天子ヶ岳の正確な座標・標高を地理院地図等で再確認');
console.log('2. 仰角 3.61 度の根拠となる資料を確認');
console.log('3. 実際の撮影記録があるか確認');

// Google Maps で確認できるリンク
console.log('\n=== 確認用リンク ===');
console.log(`現在の座標: https://www.google.com/maps/@${CURRENT_TENJOGATAKE.latitude},${CURRENT_TENJOGATAKE.longitude},15z`);
console.log(`富士山: https://www.google.com/maps/@${FUJI_COORDINATES.latitude},${FUJI_COORDINATES.longitude},15z`);