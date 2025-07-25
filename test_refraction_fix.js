/**
 * 大気屈折補正の修正テスト
 * 富津岬の仰角計算を正確にする
 */

// 富津岬の条件
const FUTTSU_LOCATION = {
    name: '富津岬',
    latitude: 35.313326,
    longitude: 139.785738,
    elevation: 3.0  // 1.3m + 1.7m
};

const FUJI_COORDINATES = {
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

// 修正された大気屈折計算
function calculateAtmosphericRefractionFixed(apparentElevation) {
    if (apparentElevation < -2) return 0;

    const h = Math.abs(apparentElevation);

    // 高度が高い場合は屈折を大幅に減らす
    if (h > 10) return 0; // 10度以上では屈折はほぼ無視

    // 地平線付近（1度未満）では標準的な屈折
    if (h < 1) {
        return apparentElevation >= 0 ? 0.57 : -0.57;
    }

    // 1度〜10度の間では線形に減少
    // 1度で0.57度、10度で0度
    const refraction = 0.57 * (10 - h) / 9;

    return apparentElevation >= 0 ? refraction : -refraction;
}

// 最終的な仰角計算
function calculateElevationFinal(fromLocation) {
    console.log('\n=== 最終修正版の計算 ===');

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

console.log('富津岬から富士山頂への仰角計算 - 最終修正版');
console.log('===========================================');
console.log(`期待値: 1.87度`);

const result = calculateElevationFinal(FUTTSU_LOCATION);

console.log('\n=== 最終結果 ===');
console.log(`期待値:     1.87000 度`);
console.log(`計算結果:   ${result.toFixed(5)} 度`);
console.log(`誤差:       ${(result - 1.87).toFixed(5)} 度`);
console.log(`誤差率:     ${((result - 1.87) / 1.87 * 100).toFixed(2)}%`);

if (Math.abs(result - 1.87) < 0.1) {
    console.log('✅ 許容範囲内です');
} else {
    console.log('❌ まだ調整が必要です');
}