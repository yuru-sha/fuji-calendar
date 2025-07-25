/**
 * 正確な仰角計算式を使用した富津岬の検証
 * 提供されたコードを基に富津岬から富士山への仰角を計算
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

// 球面距離計算（Haversine公式）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 富津岬の条件
const FUTTSU_LOCATION = {
  name: '富津岬',
  latitude: 35.313326,
  longitude: 139.785738,
  elevation: 1.3,  // 地面標高
  eyeLevel: 1.7    // アイレベル
};

// 富士山座標
const FUJI_COORDINATES = {
  latitude: 35.3605556,
  longitude: 138.7275,
  elevation: 3776
};

// 物理定数
const EARTH_RADIUS = 6371000; // 地球の平均半径 (メートル)
const REFRACTION_COEFFICIENT = 0.13; // 大気屈折率 (k値)

console.log('=== 正確な仰角計算式による富津岬の検証 ===');
console.log(`富津岬座標: ${FUTTSU_LOCATION.latitude}°N, ${FUTTSU_LOCATION.longitude}°E`);
console.log(`富津岬標高: ${FUTTSU_LOCATION.elevation}m + アイレベル${FUTTSU_LOCATION.eyeLevel}m`);
console.log(`富士山座標: ${FUJI_COORDINATES.latitude}°N, ${FUJI_COORDINATES.longitude}°E`);
console.log(`富士山標高: ${FUJI_COORDINATES.elevation}m`);
console.log(`期待仰角: 1.87度`);

// 距離計算
const distance = calculateDistance(
  FUTTSU_LOCATION.latitude, FUTTSU_LOCATION.longitude,
  FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
);

console.log(`\n=== 計算過程 ===`);
console.log(`1. 距離: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)}km)`);

// 正確な仰角計算
const elevationAngle = calculateElevationAngle(
  FUJI_COORDINATES.elevation,     // 富士山標高
  FUTTSU_LOCATION.elevation,      // 富津岬標高
  FUTTSU_LOCATION.eyeLevel,       // アイレベル
  distance,                       // 距離
  EARTH_RADIUS,                   // 地球半径
  REFRACTION_COEFFICIENT          // 大気屈折率
);

// 計算過程の詳細表示
const observerEffectiveHeight = FUTTSU_LOCATION.elevation + FUTTSU_LOCATION.eyeLevel;
const heightDifference = FUJI_COORDINATES.elevation - observerEffectiveHeight;
const curvatureDrop = Math.pow(distance, 2) / (2 * EARTH_RADIUS);
const refractionLift = REFRACTION_COEFFICIENT * curvatureDrop;
const netApparentDrop = curvatureDrop - refractionLift;
const apparentVerticalDistance = heightDifference - netApparentDrop;

console.log(`2. 観測者実効高度: ${observerEffectiveHeight.toFixed(1)}m`);
console.log(`3. 高度差: ${heightDifference.toFixed(1)}m`);
console.log(`4. 地球曲率による低下: ${curvatureDrop.toFixed(2)}m`);
console.log(`5. 大気屈折による持ち上げ: ${refractionLift.toFixed(2)}m`);
console.log(`6. 正味の見かけ低下: ${netApparentDrop.toFixed(2)}m`);
console.log(`7. 見かけ垂直距離: ${apparentVerticalDistance.toFixed(1)}m`);
console.log(`8. 仰角: ${elevationAngle.toFixed(6)}度`);

console.log(`\n=== 結果比較 ===`);
console.log(`期待値: 1.87度`);
console.log(`正確な計算: ${elevationAngle.toFixed(6)}度`);
console.log(`誤差: ${(elevationAngle - 1.87).toFixed(6)}度`);
console.log(`誤差率: ${((elevationAngle - 1.87) / 1.87 * 100).toFixed(2)}%`);

if (Math.abs(elevationAngle - 1.87) < 0.01) {
  console.log('✅ 非常に正確です！');
} else if (Math.abs(elevationAngle - 1.87) < 0.05) {
  console.log('✅ 許容範囲内です');
} else {
  console.log('❌ まだ調整が必要です');
}

// 現在の実装との比較用に、従来の計算も実行
console.log(`\n=== 従来の実装との比較 ===`);

// 従来の実装（問題のある計算）
const heightDiff = FUJI_COORDINATES.elevation - observerEffectiveHeight;
const curvatureCorr = (distance * distance) / (2 * EARTH_RADIUS);
const effectiveHeightDiff = heightDiff - curvatureCorr;
const basicElevation = Math.atan(effectiveHeightDiff / distance) * (180 / Math.PI);

// 従来の大気屈折補正（過大）
const oldRefraction = 0.57 * Math.cos(basicElevation * Math.PI / 180);
const oldFinalElevation = basicElevation + oldRefraction;

console.log(`従来の基本仰角: ${basicElevation.toFixed(6)}度`);
console.log(`従来の大気屈折補正: ${oldRefraction.toFixed(6)}度`);
console.log(`従来の最終仰角: ${oldFinalElevation.toFixed(6)}度`);
console.log(`従来実装の誤差: ${(oldFinalElevation - 1.87).toFixed(6)}度`);

console.log(`\n=== 修正が必要な点 ===`);
console.log(`1. 大気屈折の計算方法を変更`);
console.log(`   従来: 角度ベースの補正（${oldRefraction.toFixed(3)}度）`);
console.log(`   正確: 距離ベースの補正（${refractionLift.toFixed(2)}m → ${(refractionLift/distance*180/Math.PI).toFixed(6)}度相当）`);
console.log(`2. 地球曲率補正の適用方法を統一`);
console.log(`   従来: 高度差から曲率補正を減算`);
console.log(`   正確: 曲率低下から屈折持ち上げを減算後、高度差から減算`);