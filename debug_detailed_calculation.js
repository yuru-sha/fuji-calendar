/**
 * 富津岬仰角計算の詳細分析
 * 各要素を個別に検証
 */

// 富津岬の条件
const FUTTSU = {
  latitude: 35.313326,
  longitude: 139.785738,
  elevation: 1.3,
  eyeLevel: 1.7,
  effectiveElevation: 3.0
};

const FUJI = {
  latitude: 35.3605556,
  longitude: 138.7275,
  elevation: 3776
};

const EARTH_RADIUS = 6371000;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

// 1. 距離計算の詳細検証
function analyzeDistance() {
  console.log('=== 1. 距離計算の詳細検証 ===');
  
  const lat1 = toRadians(FUTTSU.latitude);
  const lat2 = toRadians(FUJI.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI.longitude - FUTTSU.longitude);
  
  console.log(`富津岬: ${FUTTSU.latitude}°N, ${FUTTSU.longitude}°E`);
  console.log(`富士山: ${FUJI.latitude}°N, ${FUJI.longitude}°E`);
  console.log(`緯度差: ${(FUJI.latitude - FUTTSU.latitude).toFixed(6)}° = ${deltaLat.toFixed(8)} rad`);
  console.log(`経度差: ${(FUJI.longitude - FUTTSU.longitude).toFixed(6)}° = ${deltaLon.toFixed(8)} rad`);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS * c;
  
  console.log(`Haversine a: ${a.toFixed(10)}`);
  console.log(`Haversine c: ${c.toFixed(10)} rad`);
  console.log(`距離: ${distance.toFixed(2)}m = ${(distance/1000).toFixed(3)}km`);
  
  // 簡易距離計算との比較
  const latDiffKm = (FUJI.latitude - FUTTSU.latitude) * 111.32; // 1度≈111.32km
  const lonDiffKm = (FUJI.longitude - FUTTSU.longitude) * 111.32 * Math.cos(toRadians((FUTTSU.latitude + FUJI.latitude) / 2));
  const simpleDistance = Math.sqrt(latDiffKm * latDiffKm + lonDiffKm * lonDiffKm) * 1000;
  
  console.log(`簡易計算距離: ${simpleDistance.toFixed(2)}m = ${(simpleDistance/1000).toFixed(3)}km`);
  console.log(`差: ${(distance - simpleDistance).toFixed(2)}m`);
  
  return distance;
}

// 2. 地球曲率補正の詳細検証
function analyzeCurvature(distance) {
  console.log('\n=== 2. 地球曲率補正の詳細検証 ===');
  
  // 現在の実装
  const curvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  console.log(`現在の実装: d²/(2R) = ${distance.toFixed(0)}²/(2×${EARTH_RADIUS}) = ${curvatureCorrection.toFixed(3)}m`);
  
  // より正確な球面三角法による補正
  const centralAngle = distance / EARTH_RADIUS; // ラジアン
  const chordHeight = EARTH_RADIUS * (1 - Math.cos(centralAngle / 2));
  console.log(`球面三角法: R(1-cos(θ/2)) = ${EARTH_RADIUS}×(1-cos(${(centralAngle/2).toFixed(8)})) = ${chordHeight.toFixed(3)}m`);
  
  // 測地学的補正（地球楕円体考慮）
  const flattening = 1 / 298.257223563; // WGS84楕円体
  const meanLat = toRadians((FUTTSU.latitude + FUJI.latitude) / 2);
  const radiusOfCurvature = EARTH_RADIUS / Math.sqrt(1 - (2 * flattening - flattening * flattening) * Math.sin(meanLat) * Math.sin(meanLat));
  const ellipsoidCorrection = (distance * distance) / (2 * radiusOfCurvature);
  console.log(`楕円体補正: ${ellipsoidCorrection.toFixed(3)}m`);
  
  console.log(`補正の差: 球面-現在 = ${(chordHeight - curvatureCorrection).toFixed(3)}m`);
  console.log(`補正の差: 楕円体-現在 = ${(ellipsoidCorrection - curvatureCorrection).toFixed(3)}m`);
  
  return {
    current: curvatureCorrection,
    spherical: chordHeight,
    ellipsoidal: ellipsoidCorrection
  };
}

// 3. 高度差の詳細検証
function analyzeHeightDifference() {
  console.log('\n=== 3. 高度差の詳細検証 ===');
  
  console.log(`富士山標高: ${FUJI.elevation}m`);
  console.log(`富津岬地面標高: ${FUTTSU.elevation}m`);
  console.log(`アイレベル: ${FUTTSU.eyeLevel}m`);
  console.log(`富津岬実効標高: ${FUTTSU.effectiveElevation}m`);
  
  const heightDifference = FUJI.elevation - FUTTSU.effectiveElevation;
  console.log(`高度差: ${FUJI.elevation} - ${FUTTSU.effectiveElevation} = ${heightDifference}m`);
  
  return heightDifference;
}

// 4. 各補正を適用した仰角計算
function calculateElevationWithVariations(distance, heightDifference, curvatureData) {
  console.log('\n=== 4. 各補正を適用した仰角計算 ===');
  
  // パターン1: 現在の実装
  const effectiveHeight1 = heightDifference - curvatureData.current;
  const elevation1 = toDegrees(Math.atan(effectiveHeight1 / distance));
  console.log(`現在実装: atan(${effectiveHeight1.toFixed(1)}/${distance.toFixed(0)}) = ${elevation1.toFixed(6)}°`);
  
  // パターン2: 球面三角法補正
  const effectiveHeight2 = heightDifference - curvatureData.spherical;
  const elevation2 = toDegrees(Math.atan(effectiveHeight2 / distance));
  console.log(`球面三角法: atan(${effectiveHeight2.toFixed(1)}/${distance.toFixed(0)}) = ${elevation2.toFixed(6)}°`);
  
  // パターン3: 楕円体補正
  const effectiveHeight3 = heightDifference - curvatureData.ellipsoidal;
  const elevation3 = toDegrees(Math.atan(effectiveHeight3 / distance));
  console.log(`楕円体補正: atan(${effectiveHeight3.toFixed(1)}/${distance.toFixed(0)}) = ${elevation3.toFixed(6)}°`);
  
  // パターン4: 曲率補正なし
  const elevation4 = toDegrees(Math.atan(heightDifference / distance));
  console.log(`補正なし: atan(${heightDifference}/${distance.toFixed(0)}) = ${elevation4.toFixed(6)}°`);
  
  return {
    current: elevation1,
    spherical: elevation2,
    ellipsoidal: elevation3,
    none: elevation4
  };
}

// 5. 大気屈折補正
function calculateRefraction(elevation) {
  if (elevation < -2) return 0;
  if (elevation > 15) return 0;

  const h = Math.abs(elevation);
  
  if (h < 0.2) {
    return elevation >= 0 ? 34.1 / 60 : -34.1 / 60;
  }
  
  const denominator = h + 10.3 / (h + 5.11);
  const refractionArcmin = 1.02 / Math.tan(toRadians(denominator)) - 0.0019279;
  const refractionDegrees = refractionArcmin / 60;
  
  return elevation >= 0 ? refractionDegrees : -refractionDegrees;
}

// 6. 最終結果の比較
function compareFinalResults(elevations) {
  console.log('\n=== 5. 最終結果の比較 ===');
  console.log('補正方法\t\t基本仰角(°)\t大気屈折(°)\t最終仰角(°)\t期待値との差(°)');
  console.log('--------------------------------------------------------------------------------');
  
  const expected = 1.87;
  
  Object.entries(elevations).forEach(([method, basicElevation]) => {
    const refraction = calculateRefraction(basicElevation);
    const finalElevation = basicElevation + refraction;
    const diff = finalElevation - expected;
    
    console.log(`${method.padEnd(12)}\t${basicElevation.toFixed(6)}\t${refraction.toFixed(6)}\t${finalElevation.toFixed(6)}\t${diff.toFixed(6)}`);
  });
}

// メイン実行
function main() {
  console.log('=== 富津岬から富士山頂への仰角計算詳細分析 ===\n');
  
  const distance = analyzeDistance();
  const curvatureData = analyzeCurvature(distance);
  const heightDifference = analyzeHeightDifference();
  const elevations = calculateElevationWithVariations(distance, heightDifference, curvatureData);
  compareFinalResults(elevations);
  
  console.log('\n=== 結論 ===');
  console.log('期待値1.87°に最も近い方法を特定してください。');
}

main();