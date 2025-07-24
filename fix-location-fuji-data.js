const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 富士山座標（FUJI_COORDINATES）
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

// 度をラジアンに変換
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// ラジアンを度に変換
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

// 方位角計算
function calculateBearingToFuji(fromLocation) {
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// 距離計算
function calculateDistanceToFuji(fromLocation) {
  const earthRadius = 6371; // km
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

// 仰角計算
function calculateElevationToFuji(fromLocation) {
  const observerEyeLevel = 1.7; // メートル
  const earthRadius = 6371000; // メートル
  const refractionCoefficient = 0.13;
  
  const distanceKm = calculateDistanceToFuji(fromLocation);
  const distanceM = distanceKm * 1000;
  
  // 簡易仰角計算
  const heightDiff = FUJI_COORDINATES.elevation - fromLocation.elevation - observerEyeLevel;
  const earthCurvature = (distanceM * distanceM) / (2 * earthRadius);
  const correctedHeight = heightDiff - earthCurvature * (1 - refractionCoefficient);
  
  return toDegrees(Math.atan(correctedHeight / distanceM));
}

async function fixLocationFujiData() {
  try {
    console.log('🔧 地点の富士山データ修正開始...\n');

    // 全地点を取得
    const locations = await prisma.location.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`📍 対象地点数: ${locations.length}`);

    for (const location of locations) {
      console.log(`\n📍 地点: ${location.name} (ID: ${location.id})`);
      console.log(`   座標: ${location.latitude}, ${location.longitude}`);
      console.log(`   標高: ${location.elevation}m`);

      // 富士山データを再計算
      const fujiAzimuth = calculateBearingToFuji(location);
      const fujiElevation = calculateElevationToFuji(location);
      const fujiDistance = calculateDistanceToFuji(location) * 1000; // メートル単位

      console.log(`   🏔️ 計算値:`);
      console.log(`      方位角: ${fujiAzimuth.toFixed(3)}°`);
      console.log(`      仰角: ${fujiElevation.toFixed(6)}°`);
      console.log(`      距離: ${(fujiDistance / 1000).toFixed(1)}km`);

      // 現在の値と比較
      console.log(`   📊 現在の値:`);
      console.log(`      方位角: ${location.fujiAzimuth}°`);
      console.log(`      仰角: ${location.fujiElevation}°`);
      console.log(`      距離: ${location.fujiDistance ? (location.fujiDistance / 1000).toFixed(1) : 'null'}km`);

      // データベース更新
      await prisma.location.update({
        where: { id: location.id },
        data: {
          fujiAzimuth: fujiAzimuth,
          fujiElevation: fujiElevation,
          fujiDistance: fujiDistance
        }
      });

      console.log(`   ✅ 更新完了`);
    }

    console.log('\n🎉 全地点の富士山データ修正完了！');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLocationFujiData();