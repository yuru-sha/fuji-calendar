const Astronomy = require('astronomy-engine');

// テスト用の撮影地点（海ほたるPA）
const testLocation = {
  id: 'umihotaru',
  name: '海ほたるPA',
  latitude: 35.4494,
  longitude: 139.7747,
  elevation: 10,
  fujiAzimuth: 258.5,
  fujiElevation: 1.2,
  fujiDistance: 70
};

// 富士山座標
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

/**
 * 撮影地点から富士山への方位角を計算
 */
function calculateBearingToFuji(fromLocation) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * 撮影地点から富士山への仰角を計算
 */
function calculateElevationToFuji(fromLocation) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const waterDistance = earthRadius * c;
  
  const heightDifference = (FUJI_COORDINATES.elevation - fromLocation.elevation) / 1000;
  const elevation = toDegrees(Math.atan(heightDifference / waterDistance));
  
  return elevation;
}

/**
 * 太陽位置を計算
 */
function calculateSunPosition(time, location) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  
  return {
    azimuth: horizontal.azimuth,
    elevation: horizontal.altitude
  };
}

/**
 * 大気屈折補正
 */
function getAtmosphericRefraction(elevation) {
  const JAPAN_CORRECTION_FACTOR = 1.02;
  
  let standardRefraction;
  if (elevation > 15) {
    standardRefraction = 0.00452 * Math.tan((90 - elevation) * Math.PI / 180);
  } else {
    standardRefraction = 0.1594 + 0.0196 * elevation + 0.00002 * elevation * elevation;
  }
  
  return standardRefraction * JAPAN_CORRECTION_FACTOR;
}

/**
 * ダイヤモンド富士の詳細デバッグ
 */
function debugDiamondFuji() {
  console.log('=== ダイヤモンド富士計算デバッグ ===\n');
  
  // 基本情報
  console.log('撮影地点:', testLocation.name);
  console.log('座標:', `${testLocation.latitude}, ${testLocation.longitude}`);
  console.log('標高:', `${testLocation.elevation}m`);
  
  // 富士山への方位角・仰角を計算
  const calculatedAzimuth = calculateBearingToFuji(testLocation);
  const calculatedElevation = calculateElevationToFuji(testLocation);
  
  console.log('\n--- 富士山への方向 ---');
  console.log('計算された方位角:', calculatedAzimuth.toFixed(2) + '°');
  console.log('設定値の方位角:', testLocation.fujiAzimuth + '°');
  console.log('方位角の差:', Math.abs(calculatedAzimuth - testLocation.fujiAzimuth).toFixed(2) + '°');
  
  console.log('計算された仰角:', calculatedElevation.toFixed(2) + '°');
  console.log('設定値の仰角:', testLocation.fujiElevation + '°');
  console.log('仰角の差:', Math.abs(calculatedElevation - testLocation.fujiElevation).toFixed(2) + '°');
  
  // テスト日付（冬至前後のダイヤモンド富士シーズン）
  const testDates = [
    new Date(2024, 11, 20), // 12月20日
    new Date(2024, 11, 21), // 12月21日（冬至）
    new Date(2024, 11, 22), // 12月22日
    new Date(2025, 0, 15),  // 1月15日
    new Date(2025, 0, 20),  // 1月20日
  ];
  
  for (const date of testDates) {
    console.log(`\n--- ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ---`);
    
    // 日の出・日の入り時刻を取得
    const observer = new Astronomy.Observer(testLocation.latitude, testLocation.longitude, testLocation.elevation);
    
    try {
      const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, date, 1);
      const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 1);
      
      if (sunrise) {
        console.log('日の出時刻:', sunrise.date.toLocaleString('ja-JP'));
        const sunrisePos = calculateSunPosition(sunrise.date, testLocation);
        console.log('日の出時の太陽位置:', `方位角=${sunrisePos.azimuth.toFixed(2)}°, 仰角=${sunrisePos.elevation.toFixed(2)}°`);
        
        const azimuthDiff = Math.abs(sunrisePos.azimuth - testLocation.fujiAzimuth);
        const elevationDiff = Math.abs(sunrisePos.elevation - testLocation.fujiElevation);
        console.log('富士山との差:', `方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
        
        if (azimuthDiff <= 0.4 && elevationDiff <= 0.25) {
          console.log('🌅 ダイヤモンド富士の可能性あり（日の出）');
        }
      }
      
      if (sunset) {
        console.log('日の入り時刻:', sunset.date.toLocaleString('ja-JP'));
        const sunsetPos = calculateSunPosition(sunset.date, testLocation);
        console.log('日の入り時の太陽位置:', `方位角=${sunsetPos.azimuth.toFixed(2)}°, 仰角=${sunsetPos.elevation.toFixed(2)}°`);
        
        const azimuthDiff = Math.abs(sunsetPos.azimuth - testLocation.fujiAzimuth);
        const elevationDiff = Math.abs(sunsetPos.elevation - testLocation.fujiElevation);
        console.log('富士山との差:', `方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
        
        if (azimuthDiff <= 0.4 && elevationDiff <= 0.25) {
          console.log('🌄 ダイヤモンド富士の可能性あり（日の入り）');
        }
      }
      
      // 詳細な時間検索（日の入り前後2時間）
      if (sunset) {
        console.log('\n詳細検索（日の入り前後2時間、10分刻み）:');
        const searchStart = new Date(sunset.date.getTime() - 2 * 60 * 60 * 1000);
        const searchEnd = new Date(sunset.date.getTime() + 2 * 60 * 60 * 1000);
        
        let bestMatch = null;
        let bestScore = Infinity;
        
        for (let time = new Date(searchStart); time <= searchEnd; time.setMinutes(time.getMinutes() + 10)) {
          const sunPos = calculateSunPosition(time, testLocation);
          const correctedElevation = sunPos.elevation + getAtmosphericRefraction(sunPos.elevation);
          
          const azimuthDiff = Math.abs(sunPos.azimuth - testLocation.fujiAzimuth);
          const elevationDiff = Math.abs(correctedElevation - testLocation.fujiElevation);
          
          if (azimuthDiff <= 0.4 && elevationDiff <= 0.25) {
            const score = azimuthDiff + elevationDiff;
            if (score < bestScore) {
              bestScore = score;
              bestMatch = {
                time: new Date(time),
                azimuth: sunPos.azimuth,
                elevation: sunPos.elevation,
                correctedElevation: correctedElevation,
                azimuthDiff: azimuthDiff,
                elevationDiff: elevationDiff,
                score: score
              };
            }
          }
        }
        
        if (bestMatch) {
          console.log('✨ 最適なダイヤモンド富士時刻を発見:');
          console.log('時刻:', bestMatch.time.toLocaleString('ja-JP'));
          console.log('太陽方位角:', bestMatch.azimuth.toFixed(2) + '°');
          console.log('太陽仰角:', bestMatch.elevation.toFixed(2) + '°');
          console.log('補正後仰角:', bestMatch.correctedElevation.toFixed(2) + '°');
          console.log('方位角差:', bestMatch.azimuthDiff.toFixed(2) + '°');
          console.log('仰角差:', bestMatch.elevationDiff.toFixed(2) + '°');
          console.log('総合スコア:', bestMatch.score.toFixed(3));
        } else {
          console.log('❌ ダイヤモンド富士の条件に合致する時刻なし');
        }
      }
      
    } catch (error) {
      console.log('エラー:', error.message);
    }
  }
}

// 実行
debugDiamondFuji();