const Astronomy = require('astronomy-engine');

// 海ほたるPA
const testLocation = {
  id: 'umihotaru',
  name: '海ほたるPA',
  latitude: 35.4494,
  longitude: 139.7747,
  elevation: 10
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
 * 2025年3月10日の海ほたるPAでのダイヤモンド富士チェック
 */
function checkDiamondFuji20250310() {
  console.log('=== 2025年3月10日 海ほたるPA ダイヤモンド富士チェック ===\n');
  
  const testDate = new Date(2025, 2, 10); // 3月10日
  
  console.log('撮影地点:', testLocation.name);
  console.log('日付:', testDate.toLocaleDateString('ja-JP'));
  console.log('座標:', `${testLocation.latitude}, ${testLocation.longitude}`);
  console.log('標高:', `${testLocation.elevation}m`);
  
  // 富士山への方位角・仰角を計算
  const fujiAzimuth = calculateBearingToFuji(testLocation);
  const fujiElevation = calculateElevationToFuji(testLocation);
  
  console.log('\n--- 富士山への方向 ---');
  console.log('富士山方位角:', fujiAzimuth.toFixed(2) + '°');
  console.log('富士山仰角:', fujiElevation.toFixed(2) + '°');
  
  const observer = new Astronomy.Observer(testLocation.latitude, testLocation.longitude, testLocation.elevation);
  
  try {
    // 日の出・日の入り時刻を取得
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, testDate, 1);
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, testDate, 1);
    
    console.log('\n--- 基本的な太陽の動き ---');
    
    if (sunrise) {
      console.log('日の出時刻:', sunrise.date.toLocaleString('ja-JP'));
      const sunrisePos = calculateSunPosition(sunrise.date, testLocation);
      console.log('日の出時太陽位置:', `方位角=${sunrisePos.azimuth.toFixed(2)}°, 仰角=${sunrisePos.elevation.toFixed(2)}°`);
      
      const azimuthDiff = Math.abs(sunrisePos.azimuth - fujiAzimuth);
      const elevationDiff = Math.abs(sunrisePos.elevation - fujiElevation);
      console.log('富士山との差:', `方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
      
      if (azimuthDiff <= 5 && elevationDiff <= 2) {
        console.log('🌅 日の出ダイヤモンド富士の可能性あり');
      }
    }
    
    if (sunset) {
      console.log('日の入り時刻:', sunset.date.toLocaleString('ja-JP'));
      const sunsetPos = calculateSunPosition(sunset.date, testLocation);
      console.log('日の入り時太陽位置:', `方位角=${sunsetPos.azimuth.toFixed(2)}°, 仰角=${sunsetPos.elevation.toFixed(2)}°`);
      
      const azimuthDiff = Math.abs(sunsetPos.azimuth - fujiAzimuth);
      const elevationDiff = Math.abs(sunsetPos.elevation - fujiElevation);
      console.log('富士山との差:', `方位角差=${azimuthDiff.toFixed(2)}°, 仰角差=${elevationDiff.toFixed(2)}°`);
      
      if (azimuthDiff <= 5 && elevationDiff <= 2) {
        console.log('🌄 日の入りダイヤモンド富士の可能性あり');
      }
    }
    
    // 詳細な時間検索（全日）
    console.log('\n--- 詳細検索（全日、30分刻み） ---');
    
    const startOfDay = new Date(testDate);
    startOfDay.setHours(5, 0, 0, 0); // 朝5時から
    
    const endOfDay = new Date(testDate);
    endOfDay.setHours(19, 0, 0, 0); // 夜7時まで
    
    let bestMatches = [];
    
    for (let time = new Date(startOfDay); time <= endOfDay; time.setMinutes(time.getMinutes() + 30)) {
      const sunPos = calculateSunPosition(time, testLocation);
      
      // 太陽が地平線上にある場合のみチェック
      if (sunPos.elevation > -1) {
        const correctedElevation = sunPos.elevation + getAtmosphericRefraction(sunPos.elevation);
        
        const azimuthDiff = Math.abs(sunPos.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(correctedElevation - fujiElevation);
        
        // 緩い条件でチェック
        if (azimuthDiff <= 10 && elevationDiff <= 3) {
          bestMatches.push({
            time: new Date(time),
            azimuth: sunPos.azimuth,
            elevation: sunPos.elevation,
            correctedElevation: correctedElevation,
            azimuthDiff: azimuthDiff,
            elevationDiff: elevationDiff,
            score: azimuthDiff + elevationDiff
          });
        }
      }
    }
    
    if (bestMatches.length > 0) {
      console.log(`${bestMatches.length}個の候補を発見:`);
      
      // スコア順にソート
      bestMatches.sort((a, b) => a.score - b.score);
      
      bestMatches.forEach((match, index) => {
        console.log(`\n候補${index + 1}:`);
        console.log('時刻:', match.time.toLocaleString('ja-JP'));
        console.log('太陽方位角:', match.azimuth.toFixed(2) + '°');
        console.log('太陽仰角:', match.elevation.toFixed(2) + '°');
        console.log('補正後仰角:', match.correctedElevation.toFixed(2) + '°');
        console.log('方位角差:', match.azimuthDiff.toFixed(2) + '°');
        console.log('仰角差:', match.elevationDiff.toFixed(2) + '°');
        console.log('総合スコア:', match.score.toFixed(2));
        
        // 評価
        if (match.azimuthDiff <= 1 && match.elevationDiff <= 0.5) {
          console.log('評価: 🌟 優秀（ダイヤモンド富士確実）');
        } else if (match.azimuthDiff <= 2 && match.elevationDiff <= 1) {
          console.log('評価: ⭐ 良好（ダイヤモンド富士可能性高）');
        } else if (match.azimuthDiff <= 5 && match.elevationDiff <= 2) {
          console.log('評価: 🔶 可能性あり');
        } else {
          console.log('評価: 🔸 条件やや厳しい');
        }
      });
      
      // 最適な候補の前後1時間を10分刻みで精密検索
      const bestCandidate = bestMatches[0];
      console.log('\n--- 精密検索（最適候補の前後1時間、10分刻み） ---');
      
      const preciseStart = new Date(bestCandidate.time.getTime() - 60 * 60 * 1000); // 1時間前
      const preciseEnd = new Date(bestCandidate.time.getTime() + 60 * 60 * 1000);   // 1時間後
      
      let preciseMatches = [];
      
      for (let time = new Date(preciseStart); time <= preciseEnd; time.setMinutes(time.getMinutes() + 10)) {
        const sunPos = calculateSunPosition(time, testLocation);
        
        if (sunPos.elevation > -1) {
          const correctedElevation = sunPos.elevation + getAtmosphericRefraction(sunPos.elevation);
          
          const azimuthDiff = Math.abs(sunPos.azimuth - fujiAzimuth);
          const elevationDiff = Math.abs(correctedElevation - fujiElevation);
          
          if (azimuthDiff <= 5 && elevationDiff <= 2) {
            preciseMatches.push({
              time: new Date(time),
              azimuth: sunPos.azimuth,
              elevation: sunPos.elevation,
              correctedElevation: correctedElevation,
              azimuthDiff: azimuthDiff,
              elevationDiff: elevationDiff,
              score: azimuthDiff + elevationDiff
            });
          }
        }
      }
      
      if (preciseMatches.length > 0) {
        preciseMatches.sort((a, b) => a.score - b.score);
        const bestPrecise = preciseMatches[0];
        
        console.log('✨ 最精密な最適時刻:');
        console.log('時刻:', bestPrecise.time.toLocaleString('ja-JP'));
        console.log('太陽方位角:', bestPrecise.azimuth.toFixed(3) + '°');
        console.log('太陽仰角:', bestPrecise.elevation.toFixed(3) + '°');
        console.log('補正後仰角:', bestPrecise.correctedElevation.toFixed(3) + '°');
        console.log('方位角差:', bestPrecise.azimuthDiff.toFixed(3) + '°');
        console.log('仰角差:', bestPrecise.elevationDiff.toFixed(3) + '°');
        console.log('総合スコア:', bestPrecise.score.toFixed(3));
      }
      
    } else {
      console.log('❌ ダイヤモンド富士の条件に合致する時刻なし');
    }
    
    // 春分前後の比較
    console.log('\n--- 春分前後の太陽軌道比較 ---');
    const comparisonDates = [
      { name: '3月5日', date: new Date(2025, 2, 5) },
      { name: '3月10日', date: new Date(2025, 2, 10) },
      { name: '3月15日', date: new Date(2025, 2, 15) },
      { name: '3月20日（春分）', date: new Date(2025, 2, 20) },
      { name: '3月25日', date: new Date(2025, 2, 25) }
    ];
    
    for (const comp of comparisonDates) {
      const compSunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, comp.date, 1);
      if (compSunset) {
        const compSunsetPos = calculateSunPosition(compSunset.date, testLocation);
        const azimuthDiff = Math.abs(compSunsetPos.azimuth - fujiAzimuth);
        console.log(`${comp.name}: 日の入り方位角=${compSunsetPos.azimuth.toFixed(1)}°, 富士山との差=${azimuthDiff.toFixed(1)}°`);
      }
    }
    
  } catch (error) {
    console.log('エラー:', error.message);
  }
}

// 実行
checkDiamondFuji20250310();