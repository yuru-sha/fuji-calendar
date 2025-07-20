// 2025-12-26 海ほたるPAのパール富士計算デバッグ
const Astronomy = require('astronomy-engine');

// 海ほたるPAの座標
const umihotaruLocation = {
  id: 265,
  name: '海ほたるパーキングエリア',
  prefecture: '千葉県',
  latitude: 35.4469,
  longitude: 139.8331,
  elevation: 10
};

// 富士山の座標
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

// 富士山への方位角計算
function calculateBearingToFuji(fromLocation) {
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// 富士山頂への仰角計算
function calculateElevationToFuji(fromLocation) {
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

// パール富士許容範囲
function getPearlAzimuthTolerance(distanceKm) {
  if (distanceKm <= 50) return 0.5;
  if (distanceKm <= 100) return 0.8;
  return 1.2;
}

async function debugPearlFuji() {
  console.log('=== 2025-12-26 海ほたるPA パール富士デバッグ ===\n');
  
  const targetDate = new Date(2025, 11, 26); // 2025年12月26日
  console.log(`対象日: ${targetDate.toLocaleDateString('ja-JP')}`);
  console.log(`地点: ${umihotaruLocation.name} (${umihotaruLocation.latitude}°N, ${umihotaruLocation.longitude}°E)`);
  
  // 富士山への基本情報
  const fujiAzimuth = calculateBearingToFuji(umihotaruLocation);
  const fujiElevation = calculateElevationToFuji(umihotaruLocation);
  const fujiDistance = calculateDistanceToFuji(umihotaruLocation);
  
  console.log(`\n富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  console.log(`富士山頂への仰角: ${fujiElevation.toFixed(2)}°`);
  console.log(`富士山までの距離: ${fujiDistance.toFixed(1)}km`);
  
  // 許容範囲
  const azimuthTolerance = getPearlAzimuthTolerance(fujiDistance);
  const elevationTolerance = 0.5; // パール富士用
  
  console.log(`\n許容範囲:`);
  console.log(`方位角: ±${azimuthTolerance}°`);
  console.log(`仰角: ±${elevationTolerance}°`);
  
  // 月の出・月の入り時刻を取得
  const observer = new Astronomy.Observer(umihotaruLocation.latitude, umihotaruLocation.longitude, umihotaruLocation.elevation);
  
  console.log(`\n=== 月の出・月の入り検索 ===`);
  
  try {
    // 前日から翌日までの範囲で検索
    const searchStart = new Date(targetDate);
    searchStart.setDate(searchStart.getDate() - 1);
    
    const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, searchStart, 3);
    const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, searchStart, 3);
    
    console.log(`月の出: ${moonrise ? moonrise.date.toLocaleString('ja-JP') : 'なし'}`);
    console.log(`月の入り: ${moonset ? moonset.date.toLocaleString('ja-JP') : 'なし'}`);
    
    // 指定日内かチェック
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const moonriseInRange = moonrise && moonrise.date >= startOfDay && moonrise.date <= endOfDay;
    const moonsetInRange = moonset && moonset.date >= startOfDay && moonset.date <= endOfDay;
    
    console.log(`月の出が対象日内: ${moonriseInRange}`);
    console.log(`月の入りが対象日内: ${moonsetInRange}`);
    
    // 月相を確認
    const moonPhase = Astronomy.MoonPhase(targetDate);
    const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));
    
    console.log(`\n=== 月相情報 ===`);
    console.log(`月相角度: ${moonPhase.toFixed(1)}°`);
    console.log(`照光面積: ${(illuminationFraction * 100).toFixed(1)}%`);
    console.log(`月相判定: ${illuminationFraction > 0.1 ? '表示対象' : '新月期間（除外）'}`);
    
    // パール富士の詳細チェック
    console.log(`\n=== パール富士詳細チェック ===`);
    
    const checkTimes = [];
    if (moonriseInRange) checkTimes.push({ time: moonrise.date, type: '月の出' });
    if (moonsetInRange) checkTimes.push({ time: moonset.date, type: '月の入り' });
    
    for (const { time, type } of checkTimes) {
      console.log(`\n--- ${type}: ${time.toLocaleString('ja-JP')} ---`);
      
      // 前後30分を2分刻みで検索
      const searchStart = new Date(time.getTime() - 30 * 60 * 1000);
      const searchEnd = new Date(time.getTime() + 30 * 60 * 1000);
      
      let bestMatch = null;
      let bestScore = Infinity;
      
      for (let searchTime = new Date(searchStart); searchTime <= searchEnd; searchTime.setMinutes(searchTime.getMinutes() + 2)) {
        const equatorial = Astronomy.Equator(Astronomy.Body.Moon, searchTime, observer, true, true);
        const horizontal = Astronomy.Horizon(searchTime, observer, equatorial.ra, equatorial.dec, 'normal');
        
        const moonAzimuth = horizontal.azimuth;
        const moonElevation = horizontal.altitude;
        
        const azimuthDiff = Math.abs(moonAzimuth - fujiAzimuth);
        const elevationDiff = Math.abs(moonElevation - fujiElevation);
        
        if (azimuthDiff <= azimuthTolerance && elevationDiff <= elevationTolerance) {
          const score = azimuthDiff + elevationDiff;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = {
              time: new Date(searchTime),
              moonAzimuth,
              moonElevation,
              azimuthDiff,
              elevationDiff,
              score
            };
          }
        }
      }
      
      if (bestMatch) {
        console.log(`✅ パール富士発見！`);
        console.log(`  時刻: ${bestMatch.time.toLocaleString('ja-JP')}`);
        console.log(`  月の方位角: ${bestMatch.moonAzimuth.toFixed(2)}° (富士山: ${fujiAzimuth.toFixed(2)}°)`);
        console.log(`  月の仰角: ${bestMatch.moonElevation.toFixed(2)}° (富士山: ${fujiElevation.toFixed(2)}°)`);
        console.log(`  方位角差: ${bestMatch.azimuthDiff.toFixed(2)}° (許容: ${azimuthTolerance}°)`);
        console.log(`  仰角差: ${bestMatch.elevationDiff.toFixed(2)}° (許容: ${elevationTolerance}°)`);
        console.log(`  総合スコア: ${bestMatch.score.toFixed(3)}`);
      } else {
        console.log(`❌ パール富士なし`);
        
        // 最も近い時刻の詳細を表示
        const equatorial = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
        const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
        
        const moonAzimuth = horizontal.azimuth;
        const moonElevation = horizontal.altitude;
        const azimuthDiff = Math.abs(moonAzimuth - fujiAzimuth);
        const elevationDiff = Math.abs(moonElevation - fujiElevation);
        
        console.log(`  ${type}時の月の方位角: ${moonAzimuth.toFixed(2)}° (富士山: ${fujiAzimuth.toFixed(2)}°)`);
        console.log(`  ${type}時の月の仰角: ${moonElevation.toFixed(2)}° (富士山: ${fujiElevation.toFixed(2)}°)`);
        console.log(`  方位角差: ${azimuthDiff.toFixed(2)}° (許容: ${azimuthTolerance}°) ${azimuthDiff <= azimuthTolerance ? '✅' : '❌'}`);
        console.log(`  仰角差: ${elevationDiff.toFixed(2)}° (許容: ${elevationTolerance}°) ${elevationDiff <= elevationTolerance ? '✅' : '❌'}`);
      }
    }
    
    if (checkTimes.length === 0) {
      console.log(`❌ 対象日内に月の出・月の入りなし`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

debugPearlFuji().catch(console.error);