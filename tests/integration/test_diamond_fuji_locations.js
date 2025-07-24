const Astronomy = require('astronomy-engine');

// 共通定数をインポート
const { FUJI_COORDINATES } = require('../../src/shared/types');

// 実際にダイヤモンド富士が見える可能性の高い地点
const testLocations = [
  {
    id: 'kawaguchiko',
    name: '河口湖',
    latitude: 35.5056,
    longitude: 138.7644,
    elevation: 833
  },
  {
    id: 'yamanakako',
    name: '山中湖',
    latitude: 35.4167,
    longitude: 138.8667,
    elevation: 980
  },
  {
    id: 'tanuki_lake',
    name: '田貫湖',
    latitude: 35.3333,
    longitude: 138.6167,
    elevation: 650
  },
  {
    id: 'shizuoka_city',
    name: '静岡市（日本平）',
    latitude: 34.9667,
    longitude: 138.3833,
    elevation: 300
  },
  {
    id: 'choshi',
    name: '銚子（犬吠埼）',
    latitude: 35.7069,
    longitude: 140.8694,
    elevation: 20
  }
];

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
 * 各地点でのダイヤモンド富士可能性をチェック
 */
function checkDiamondFujiPossibility() {
  console.log('=== ダイヤモンド富士撮影地点分析 ===\n');
  
  // 冬至前後の日付
  const testDate = new Date(2024, 11, 21); // 12月21日（冬至）
  
  for (const location of testLocations) {
    console.log(`--- ${location.name} ---`);
    console.log(`座標: ${location.latitude}, ${location.longitude}`);
    console.log(`標高: ${location.elevation}m`);
    
    // 富士山への方位角・仰角を計算
    const fujiAzimuth = calculateBearingToFuji(location);
    const fujiElevation = calculateElevationToFuji(location);
    
    console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
    console.log(`富士山への仰角: ${fujiElevation.toFixed(2)}°`);
    
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
    
    try {
      // 日の出・日の入り時刻
      const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, testDate, 1);
      const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, testDate, 1);
      
      let diamondPossible = false;
      
      if (sunrise) {
        const sunrisePos = calculateSunPosition(sunrise.date, location);
        const azimuthDiff = Math.abs(sunrisePos.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(sunrisePos.elevation - fujiElevation);
        
        console.log(`日の出: ${sunrise.date.toLocaleString('ja-JP')}`);
        console.log(`日の出時太陽位置: 方位角=${sunrisePos.azimuth.toFixed(2)}°, 仰角=${sunrisePos.elevation.toFixed(2)}°`);
        console.log(`富士山との差: 方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
        
        if (azimuthDiff <= 5 && elevationDiff <= 2) {
          console.log('🌅 日の出ダイヤモンド富士の可能性あり');
          diamondPossible = true;
        }
      }
      
      if (sunset) {
        const sunsetPos = calculateSunPosition(sunset.date, location);
        const azimuthDiff = Math.abs(sunsetPos.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(sunsetPos.elevation - fujiElevation);
        
        console.log(`日の入り: ${sunset.date.toLocaleString('ja-JP')}`);
        console.log(`日の入り時太陽位置: 方位角=${sunsetPos.azimuth.toFixed(2)}°, 仰角=${sunsetPos.elevation.toFixed(2)}°`);
        console.log(`富士山との差: 方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
        
        if (azimuthDiff <= 5 && elevationDiff <= 2) {
          console.log('🌄 日の入りダイヤモンド富士の可能性あり');
          diamondPossible = true;
        }
      }
      
      if (!diamondPossible) {
        console.log('❌ ダイヤモンド富士の可能性低い');
      }
      
      // 太陽の軌道分析（年間を通じて）
      console.log('\n年間太陽軌道分析:');
      const seasons = [
        { name: '春分', date: new Date(2024, 2, 20) },
        { name: '夏至', date: new Date(2024, 5, 21) },
        { name: '秋分', date: new Date(2024, 8, 23) },
        { name: '冬至', date: new Date(2024, 11, 21) }
      ];
      
      for (const season of seasons) {
        const seasonSunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, season.date, 1);
        if (seasonSunset) {
          const seasonSunsetPos = calculateSunPosition(seasonSunset.date, location);
          const azimuthDiff = Math.abs(seasonSunsetPos.azimuth - fujiAzimuth);
          console.log(`${season.name}: 太陽方位角=${seasonSunsetPos.azimuth.toFixed(1)}°, 富士山との差=${azimuthDiff.toFixed(1)}°`);
        }
      }
      
    } catch (error) {
      console.log('エラー:', error.message);
    }
    
    console.log('\n');
  }
}

// 実行
checkDiamondFujiPossibility();