const Astronomy = require('astronomy-engine');

// 富士山座標
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

// より遠い地点や海岸線の地点
const candidateLocations = [
  {
    id: 'enoshima',
    name: '江ノ島',
    latitude: 35.2980,
    longitude: 139.4819,
    elevation: 60
  },
  {
    id: 'kamakura',
    name: '鎌倉（由比ヶ浜）',
    latitude: 35.3067,
    longitude: 139.5500,
    elevation: 10
  },
  {
    id: 'yokohama_mm',
    name: '横浜みなとみらい',
    latitude: 35.4537,
    longitude: 139.6380,
    elevation: 50
  },
  {
    id: 'tokyo_tower',
    name: '東京タワー',
    latitude: 35.6586,
    longitude: 139.7454,
    elevation: 250
  },
  {
    id: 'skytree',
    name: '東京スカイツリー',
    latitude: 35.7101,
    longitude: 139.8107,
    elevation: 350
  },
  {
    id: 'chiba_port',
    name: '千葉ポートタワー',
    latitude: 35.6067,
    longitude: 140.1067,
    elevation: 125
  },
  {
    id: 'izu_oshima',
    name: '伊豆大島',
    latitude: 34.7500,
    longitude: 139.3833,
    elevation: 100
  },
  {
    id: 'hakone',
    name: '箱根（芦ノ湖）',
    latitude: 35.2000,
    longitude: 139.0167,
    elevation: 723
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
 * 距離を計算
 */
function calculateDistance(fromLocation) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  
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
 * ダイヤモンド富士の可能性を詳細分析
 */
function analyzeDiamondFujiPotential() {
  console.log('=== ダイヤモンド富士撮影地点詳細分析 ===\n');
  
  const results = [];
  
  for (const location of candidateLocations) {
    const fujiAzimuth = calculateBearingToFuji(location);
    const fujiElevation = calculateElevationToFuji(location);
    const distance = calculateDistance(location);
    
    console.log(`--- ${location.name} ---`);
    console.log(`距離: ${distance.toFixed(1)}km`);
    console.log(`富士山方位角: ${fujiAzimuth.toFixed(1)}°`);
    console.log(`富士山仰角: ${fujiElevation.toFixed(2)}°`);
    
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
    
    // 年間の太陽軌道をチェック
    const seasons = [
      { name: '冬至', date: new Date(2024, 11, 21), weight: 1.0 },
      { name: '1月末', date: new Date(2024, 0, 31), weight: 0.9 },
      { name: '11月初', date: new Date(2024, 10, 10), weight: 0.9 },
      { name: '春分', date: new Date(2024, 2, 20), weight: 0.7 },
      { name: '秋分', date: new Date(2024, 8, 23), weight: 0.7 }
    ];
    
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const season of seasons) {
      try {
        const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, season.date, 1);
        const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, season.date, 1);
        
        // 日の出をチェック
        if (sunrise) {
          const sunPos = calculateSunPosition(sunrise.date, location);
          const azimuthDiff = Math.abs(sunPos.azimuth - fujiAzimuth);
          const elevationDiff = Math.abs(sunPos.elevation - fujiElevation);
          
          // スコア計算（方位角差を重視、仰角差も考慮）
          const score = azimuthDiff * 2 + elevationDiff + (fujiElevation > 2 ? fujiElevation * 2 : 0);
          const adjustedScore = score / season.weight;
          
          if (adjustedScore < bestScore && azimuthDiff < 30) {
            bestScore = adjustedScore;
            bestMatch = {
              season: season.name,
              type: '日の出',
              time: sunrise.date,
              sunAzimuth: sunPos.azimuth,
              sunElevation: sunPos.elevation,
              azimuthDiff: azimuthDiff,
              elevationDiff: elevationDiff,
              score: adjustedScore
            };
          }
        }
        
        // 日の入りをチェック
        if (sunset) {
          const sunPos = calculateSunPosition(sunset.date, location);
          const azimuthDiff = Math.abs(sunPos.azimuth - fujiAzimuth);
          const elevationDiff = Math.abs(sunPos.elevation - fujiElevation);
          
          const score = azimuthDiff * 2 + elevationDiff + (fujiElevation > 2 ? fujiElevation * 2 : 0);
          const adjustedScore = score / season.weight;
          
          if (adjustedScore < bestScore && azimuthDiff < 30) {
            bestScore = adjustedScore;
            bestMatch = {
              season: season.name,
              type: '日の入り',
              time: sunset.date,
              sunAzimuth: sunPos.azimuth,
              sunElevation: sunPos.elevation,
              azimuthDiff: azimuthDiff,
              elevationDiff: elevationDiff,
              score: adjustedScore
            };
          }
        }
      } catch (error) {
        // エラーは無視
      }
    }
    
    if (bestMatch) {
      console.log(`最適条件: ${bestMatch.season}の${bestMatch.type}`);
      console.log(`時刻: ${bestMatch.time.toLocaleString('ja-JP')}`);
      console.log(`太陽方位角: ${bestMatch.sunAzimuth.toFixed(1)}°`);
      console.log(`太陽仰角: ${bestMatch.sunElevation.toFixed(2)}°`);
      console.log(`方位角差: ${bestMatch.azimuthDiff.toFixed(1)}°`);
      console.log(`仰角差: ${bestMatch.elevationDiff.toFixed(2)}°`);
      console.log(`総合スコア: ${bestMatch.score.toFixed(1)}`);
      
      // 評価
      let rating = '❌';
      if (bestMatch.azimuthDiff <= 2 && bestMatch.elevationDiff <= 1) {
        rating = '🌟 優秀';
      } else if (bestMatch.azimuthDiff <= 5 && bestMatch.elevationDiff <= 2) {
        rating = '⭐ 良好';
      } else if (bestMatch.azimuthDiff <= 10 && bestMatch.elevationDiff <= 3) {
        rating = '🔶 可能性あり';
      }
      
      console.log(`評価: ${rating}`);
      
      results.push({
        location: location.name,
        distance: distance,
        fujiElevation: fujiElevation,
        bestMatch: bestMatch,
        rating: rating
      });
    } else {
      console.log('❌ ダイヤモンド富士の可能性なし');
    }
    
    console.log('\n');
  }
  
  // 結果をスコア順にソート
  results.sort((a, b) => a.bestMatch.score - b.bestMatch.score);
  
  console.log('=== 総合ランキング ===');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.location} (スコア: ${result.bestMatch.score.toFixed(1)}) ${result.rating}`);
  });
}

// 実行
analyzeDiamondFujiPotential();