/**
 * 仰角計算の検証スクリプト
 * 修正前後の計算結果を比較し、精度を検証する
 */

// 富士山座標定義
const FUJI_COORDINATES = {
  latitude: 35.3605556,   // 35°21'38" 北緯
  longitude: 138.7275,    // 138°43'39" 東経  
  elevation: 3776         // 剣ヶ峰標高（メートル）
};

// 地球半径（メートル）
const EARTH_RADIUS = 6371000;

/**
 * 度をラジアンに変換
 */
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * ラジアンを度に変換
 */
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Haversine 公式による 2 点間の距離計算
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = EARTH_RADIUS;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * 旧計算方式（修正前）
 */
function calculateElevationOld(location) {
  const distance = calculateDistance(
    location.latitude, location.longitude,
    FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
  );
  
  const heightDifference = FUJI_COORDINATES.elevation - location.elevation;
  
  // 地球曲率による見かけの高度補正（誤った方向）
  const earthCurvature = Math.pow(distance, 2) / (2 * EARTH_RADIUS);
  const adjustedHeight = heightDifference + earthCurvature;
  
  // 基本仰角計算
  const elevationRadians = Math.atan(adjustedHeight / distance);
  let elevationDegrees = toDegrees(elevationRadians);
  
  // 複雑な大気屈折補正
  const refractionCorrection = calculateAtmosphericRefractionComplex(elevationDegrees);
  elevationDegrees += refractionCorrection;
  
  return {
    elevation: elevationDegrees,
    distance,
    heightDifference,
    earthCurvature,
    adjustedHeight,
    refractionCorrection
  };
}

/**
 * 新計算方式（修正後）- ベースコードに基づく正確な実装
 */
function calculateElevationNew(location) {
  const distance = calculateDistance(
    location.latitude, location.longitude,
    FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
  );
  
  return calculateElevationAngleBase(
    FUJI_COORDINATES.elevation,  // 富士山山頂標高
    location.elevation,          // 観測地点標高
    1.7,                        // 観測者目線高さ
    distance,                   // 直線距離
    EARTH_RADIUS,              // 地球半径
    0.13                       // 大気屈折係数
  );
}

/**
 * ベースコードに基づく仰角計算（海ほたる PA 方式）
 */
function calculateElevationAngleBase(
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
  const curvatureDrop = Math.pow(distance, 2) / (2 * earthRadius);

  // 4. 大気差による見かけの持ち上げ（低下の相殺） (メートル)
  const refractionLift = refractionCoefficient * curvatureDrop;

  // 5. 正味の見かけの低下 (メートル)
  const netApparentDrop = curvatureDrop - refractionLift;

  // 6. 最終的な見かけの垂直距離
  const apparentVerticalDistance = heightDifference - netApparentDrop;

  // 7. 仰角の計算 (ラジアン)
  const angleRad = Math.atan2(apparentVerticalDistance, distance);

  // 8. 仰角を度数に変換
  const elevationDegrees = angleRad * (180 / Math.PI);
  
  return {
    elevation: elevationDegrees,
    distance,
    observerEffectiveHeight,
    heightDifference,
    curvatureDrop,
    refractionLift,
    netApparentDrop,
    apparentVerticalDistance
  };
}

/**
 * 複雑な大気屈折補正（旧方式）
 */
function calculateAtmosphericRefractionComplex(elevationDegrees) {
  if (elevationDegrees < -2) return 0;
  
  const elevationRadians = toRadians(Math.abs(elevationDegrees));
  const refraction = 1.02 / Math.tan(elevationRadians + 10.3 / (elevationRadians + 5.11));
  
  return refraction / 60; // 分から度に変換
}

/**
 * テスト用地点データ
 */
const testLocations = [
  {
    name: "海ほたる PA（ベースケース）",
    latitude: 35.4444,
    longitude: 139.8547,
    elevation: 5.0,
    expectedElevation: null, // ベースコードで計算される値
    distance: 105000 // 105km（ベースコードの値）
  },
  {
    name: "富津岬付近（房総半島）",
    latitude: 35.3044,
    longitude: 139.7786,
    elevation: 1.0,
    expectedElevation: 2.246, // ドキュメント記載の期待値
    distance: null
  },
  {
    name: "三浦半島・城ヶ島",
    latitude: 35.1344,
    longitude: 139.6086,
    elevation: 20.0,
    expectedElevation: null,
    distance: null
  },
  {
    name: "伊豆半島・石廊崎",
    latitude: 34.6078,
    longitude: 138.8483,
    elevation: 50.0,
    expectedElevation: null,
    distance: null
  },
  {
    name: "箱根・芦ノ湖",
    latitude: 35.2042,
    longitude: 139.0256,
    elevation: 725.0,
    expectedElevation: null,
    distance: null
  },
  {
    name: "江の島",
    latitude: 35.2989,
    longitude: 139.4831,
    elevation: 60.0,
    expectedElevation: null,
    distance: null
  }
];

/**
 * 検証実行
 */
function verifyElevationCalculations() {
  console.log('='.repeat(80));
  console.log('富士山頂仰角計算の検証');
  console.log('='.repeat(80));
  console.log();
  
  for (const location of testLocations) {
    console.log(`📍 ${location.name}`);
    console.log(`   座標: ${location.latitude}°N, ${location.longitude}°E`);
    console.log(`   標高: ${location.elevation}m`);
    console.log();
    
    // 旧計算方式
    const oldResult = calculateElevationOld(location);
    console.log('【旧計算方式（修正前）】');
    console.log(`   距離: ${Math.round(oldResult.distance)}m`);
    console.log(`   高度差: ${oldResult.heightDifference.toFixed(1)}m`);
    console.log(`   地球曲率補正: +${oldResult.earthCurvature.toFixed(3)}m`);
    console.log(`   大気屈折補正: +${oldResult.refractionCorrection.toFixed(6)}°`);
    console.log(`   → 仰角: ${oldResult.elevation.toFixed(6)}°`);
    console.log();
    
    // 新計算方式
    const newResult = calculateElevationNew(location);
    console.log('【新計算方式（修正後）】');
    console.log(`   距離: ${Math.round(newResult.distance)}m`);
    console.log(`   観測者実効高度: ${newResult.observerEffectiveHeight.toFixed(1)}m`);
    console.log(`   高度差: ${newResult.heightDifference.toFixed(1)}m`);
    console.log(`   地球曲率低下: -${newResult.curvatureDrop.toFixed(3)}m`);
    console.log(`   大気屈折上昇: +${newResult.refractionLift.toFixed(3)}m`);
    console.log(`   正味見かけ低下: -${newResult.netApparentDrop.toFixed(3)}m`);
    console.log(`   見かけ垂直距離: ${newResult.apparentVerticalDistance.toFixed(1)}m`);
    console.log(`   → 仰角: ${newResult.elevation.toFixed(6)}°`);
    console.log();
    
    // 差分計算
    const difference = newResult.elevation - oldResult.elevation;
    console.log('【差分分析】');
    console.log(`   仰角差: ${difference > 0 ? '+' : ''}${difference.toFixed(6)}° (${difference > 0 ? '上昇' : '下降'})`);
    console.log(`   距離差: ${Math.round(newResult.distance - oldResult.distance)}m`);
    
    // 期待値との比較
    if (location.expectedElevation !== null) {
      const expectedDiff = newResult.elevation - location.expectedElevation;
      console.log(`   期待値差: ${expectedDiff > 0 ? '+' : ''}${expectedDiff.toFixed(6)}° (期待値: ${location.expectedElevation}°)`);
      
      if (Math.abs(expectedDiff) < 0.01) {
        console.log(`   ✅ 期待値と一致（±0.01°以内）`);
      } else {
        console.log(`   ⚠️  期待値と相違（${Math.abs(expectedDiff).toFixed(3)}°の差異）`);
      }
    }
    
    console.log();
    console.log('-'.repeat(80));
    console.log();
  }
  
  // 物理的妥当性チェック
  console.log('📊 物理的妥当性チェック');
  console.log('-'.repeat(40));
  
  // 距離と地球曲率の関係確認
  const distances = [25000, 50000, 100000, 150000, 200000]; // 25km, 50km, 100km, 150km, 200km
  console.log('距離別地球曲率効果:');
  distances.forEach(dist => {
    const curvature = Math.pow(dist, 2) / (2 * EARTH_RADIUS);
    const refraction = 0.13 * curvature;
    const net = curvature - refraction;
    console.log(`   ${(dist/1000).toFixed(0)}km: 曲率-${curvature.toFixed(2)}m, 屈折+${refraction.toFixed(2)}m, 正味-${net.toFixed(2)}m`);
  });
  
  // ベースコード（海ほたる PA）の検証
  console.log();
  console.log('🔍 ベースコード（海ほたる PA）検証');
  console.log('-'.repeat(40));
  
  const baseResult = calculateElevationAngleBase(
    3776,    // FUJI_SUMMIT_ELEVATION
    5,       // PA_ELEVATION  
    1.7,     // OBSERVER_EYE_LEVEL
    105000,  // DISTANCE (105km)
    6371000, // EARTH_RADIUS
    0.13     // REFRACTION_COEFFICIENT
  );
  
  console.log('海ほたる PA から富士山山頂への仰角:');
  console.log(`   距離: 105km`);
  console.log(`   観測者実効高度: ${baseResult.observerEffectiveHeight}m`);
  console.log(`   高度差: ${baseResult.heightDifference}m`);
  console.log(`   地球曲率低下: ${baseResult.curvatureDrop.toFixed(3)}m`);
  console.log(`   大気屈折上昇: ${baseResult.refractionLift.toFixed(3)}m`);
  console.log(`   正味見かけ低下: ${baseResult.netApparentDrop.toFixed(3)}m`);
  console.log(`   見かけ垂直距離: ${baseResult.apparentVerticalDistance.toFixed(1)}m`);
  console.log(`   → 仰角: ${baseResult.elevation.toFixed(2)}°`);
  
  console.log();
  console.log('🎯 検証完了');
}

// スクリプト実行
if (require.main === module) {
  verifyElevationCalculations();
}

module.exports = {
  calculateElevationOld,
  calculateElevationNew,
  verifyElevationCalculations
};