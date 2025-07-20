const Astronomy = require('astronomy-engine');

// 富士山より北側の地点（7月のダイヤモンド富士の可能性）
const northernLocations = [
  {
    name: "諏訪湖",
    prefecture: "長野県",
    latitude: 36.0500,
    longitude: 138.1167,
    elevation: 759,
    description: "長野県の湖。富士山より北側"
  },
  {
    name: "八ヶ岳・清里高原",
    prefecture: "山梨県",
    latitude: 35.9167,
    longitude: 138.4333,
    elevation: 1200,
    description: "八ヶ岳南麓の高原。富士山より北側"
  },
  {
    name: "甲府盆地",
    prefecture: "山梨県",
    latitude: 35.6667,
    longitude: 138.5667,
    elevation: 250,
    description: "山梨県の中心部。富士山より北側"
  },
  {
    name: "韮崎市",
    prefecture: "山梨県",
    latitude: 35.7167,
    longitude: 138.4500,
    elevation: 350,
    description: "山梨県北西部。富士山より北側"
  },
  {
    name: "身延山",
    prefecture: "山梨県",
    latitude: 35.5000,
    longitude: 138.4333,
    elevation: 1153,
    description: "日蓮宗総本山。富士山より北西"
  },
  {
    name: "富士川町",
    prefecture: "山梨県",
    latitude: 35.5833,
    longitude: 138.4167,
    elevation: 200,
    description: "富士川沿いの町。富士山より北西"
  }
];

const FUJI_LAT = 35.3606;
const FUJI_LON = 138.7274;
const FUJI_ELEVATION = 3776;

/**
 * 富士山への方位角を計算
 */
function calculateBearingToFuji(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * 富士山への仰角を計算
 */
function calculateElevationToFuji(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const waterDistance = earthRadius * c;
  
  const heightDifference = (FUJI_ELEVATION - location.elevation) / 1000;
  const elevation = toDegrees(Math.atan(heightDifference / waterDistance));
  
  return elevation;
}

/**
 * 距離を計算
 */
function calculateDistance(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLat / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
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
 * 北側地点での7月のダイヤモンド富士をチェック
 */
function checkNorthernJulyFuji() {
  console.log('=== 富士山より北側での7月ダイヤモンド富士チェック ===\n');
  
  const julyDate = new Date(2025, 6, 15); // 7月15日
  
  const results = [];
  
  for (const location of northernLocations) {
    const fujiAzimuth = calculateBearingToFuji(location);
    const fujiElevation = calculateElevationToFuji(location);
    const fujiDistance = calculateDistance(location);
    
    console.log(`--- ${location.name} (${location.prefecture}) ---`);
    console.log(`富士山方位角: ${fujiAzimuth.toFixed(1)}°`);
    console.log(`富士山仰角: ${fujiElevation.toFixed(1)}°`);
    console.log(`富士山距離: ${fujiDistance.toFixed(1)}km`);
    
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
    
    try {
      // 日の出・日の入り時刻を取得
      const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, julyDate, 1);
      const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, julyDate, 1);
      
      let bestMatch = null;
      let bestScore = Infinity;
      
      // 日の出をチェック
      if (sunrise) {
        const sunrisePos = calculateSunPosition(sunrise.date, location);
        const azimuthDiff = Math.abs(sunrisePos.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(sunrisePos.elevation - fujiElevation);
        const score = azimuthDiff + elevationDiff;
        
        console.log(`日の出: ${sunrise.date.toLocaleTimeString('ja-JP')} 方位角${sunrisePos.azimuth.toFixed(1)}° (差${azimuthDiff.toFixed(1)}°)`);
        
        if (score < bestScore) {
          bestScore = score;
          bestMatch = {
            type: 'sunrise',
            time: sunrise.date,
            sunAzimuth: sunrisePos.azimuth,
            sunElevation: sunrisePos.elevation,
            azimuthDiff: azimuthDiff,
            elevationDiff: elevationDiff,
            score: score
          };
        }
      }
      
      // 日の入りをチェック
      if (sunset) {
        const sunsetPos = calculateSunPosition(sunset.date, location);
        const azimuthDiff = Math.abs(sunsetPos.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(sunsetPos.elevation - fujiElevation);
        const score = azimuthDiff + elevationDiff;
        
        console.log(`日の入り: ${sunset.date.toLocaleTimeString('ja-JP')} 方位角${sunsetPos.azimuth.toFixed(1)}° (差${azimuthDiff.toFixed(1)}°)`);
        
        if (score < bestScore) {
          bestScore = score;
          bestMatch = {
            type: 'sunset',
            time: sunset.date,
            sunAzimuth: sunsetPos.azimuth,
            sunElevation: sunsetPos.elevation,
            azimuthDiff: azimuthDiff,
            elevationDiff: elevationDiff,
            score: score
          };
        }
      }
      
      if (bestMatch && bestMatch.azimuthDiff <= 10 && bestMatch.elevationDiff <= 5) {
        console.log('✅ ダイヤモンド富士の可能性あり!');
        console.log(`最適: ${bestMatch.type === 'sunrise' ? '日の出' : '日の入り'}`);
        console.log(`方位角差: ${bestMatch.azimuthDiff.toFixed(1)}°`);
        console.log(`仰角差: ${bestMatch.elevationDiff.toFixed(1)}°`);
        console.log(`スコア: ${bestMatch.score.toFixed(2)}`);
        
        results.push({
          location: location.name,
          prefecture: location.prefecture,
          bestMatch: bestMatch,
          fujiDistance: fujiDistance,
          fujiAzimuth: fujiAzimuth
        });
      } else {
        console.log('❌ 7月のダイヤモンド富士は困難');
        if (bestMatch) {
          console.log(`  最小差: 方位角${bestMatch.azimuthDiff.toFixed(1)}°, 仰角${bestMatch.elevationDiff.toFixed(1)}°`);
        }
      }
      
    } catch (error) {
      console.log('エラー:', error.message);
    }
    
    console.log('');
  }
  
  // 結果をスコア順にソート
  results.sort((a, b) => a.bestMatch.score - b.bestMatch.score);
  
  console.log('=== 7月のダイヤモンド富士ランキング（北側地点） ===\n');
  
  if (results.length === 0) {
    console.log('富士山より北側の地点でも7月のダイヤモンド富士は困難です。');
    console.log('');
    console.log('理由:');
    console.log('1. 夏至前後は太陽が最も北寄り（方位角60-300°）を通る');
    console.log('2. 富士山は大部分の地点から南～南西方向（180-270°）に見える');
    console.log('3. 太陽軌道と富士山方向の差が大きすぎる');
    console.log('');
    console.log('7月にダイヤモンド富士を見るには:');
    console.log('- 富士山が北西（300°付近）に見える地点が必要');
    console.log('- そのような地点は富士山の南東側だが、海上や遠距離になる');
    console.log('- 実用的な撮影地点は存在しない');
  } else {
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.location} (${result.prefecture})`);
      console.log(`   タイプ: ${result.bestMatch.type === 'sunrise' ? '日の出' : '日の入り'}`);
      console.log(`   スコア: ${result.bestMatch.score.toFixed(2)}`);
      console.log(`   方位角差: ${result.bestMatch.azimuthDiff.toFixed(1)}°`);
      console.log(`   仰角差: ${result.bestMatch.elevationDiff.toFixed(1)}°`);
      console.log(`   富士山方位角: ${result.fujiAzimuth.toFixed(1)}°`);
      console.log(`   距離: ${result.fujiDistance.toFixed(1)}km`);
      console.log('');
    });
  }
  
  // パール富士について
  console.log('=== 7月のパール富士について ===\n');
  console.log('パール富士は月の軌道によるため、ダイヤモンド富士より条件が緩いです：');
  console.log('');
  console.log('1. 月は太陽と異なる軌道を持つ');
  console.log('2. 月の方位角は日によって大きく変化');
  console.log('3. 7月でも富士山方向に月が来る日がある');
  console.log('4. 特に満月前後は夜間に富士山方向に月が見える可能性');
  console.log('');
  console.log('7月のパール富士の有名地点:');
  console.log('- 山中湖: 夜間のパール富士');
  console.log('- 河口湖: 夜間のパール富士');
  console.log('- 精進湖: 夜間のパール富士');
  console.log('- 本栖湖: 夜間のパール富士');
  console.log('');
  console.log('※具体的な日時は月の軌道計算が必要');
}

// 実行
checkNorthernJulyFuji();