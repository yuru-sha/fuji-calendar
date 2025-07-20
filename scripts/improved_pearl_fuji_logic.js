// 改善されたパール富士計算ロジック
const Astronomy = require('astronomy-engine');

// 改善されたパール富士計算
async function calculateImprovedPearlFuji(date, location) {
  const events = [];
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  
  // 富士山への基本情報
  const fujiAzimuth = calculateBearingToFuji(location);
  const fujiElevation = calculateElevationToFuji(location);
  
  console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  console.log(`富士山頂への仰角: ${fujiElevation.toFixed(2)}°`);
  
  // その日の0時から24時まで1時間刻みでチェック
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const candidates = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const checkTime = new Date(startOfDay);
    checkTime.setHours(hour, 0, 0, 0);
    
    try {
      const equatorial = Astronomy.Equator(Astronomy.Body.Moon, checkTime, observer, true, true);
      const horizontal = Astronomy.Horizon(checkTime, observer, equatorial.ra, equatorial.dec, 'normal');
      
      // 月が地平線上にある場合のみチェック
      if (horizontal.altitude > -1) { // 地平線より少し下まで含める
        const azimuthDiff = Math.abs(horizontal.azimuth - fujiAzimuth);
        const elevationDiff = Math.abs(horizontal.altitude - fujiElevation);
        
        // 粗い判定で候補を絞り込み
        if (azimuthDiff <= 2.0 && elevationDiff <= 1.0) {
          candidates.push({
            time: new Date(checkTime),
            azimuthDiff,
            elevationDiff,
            moonAzimuth: horizontal.azimuth,
            moonElevation: horizontal.altitude
          });
          
          console.log(`候補発見: ${checkTime.getHours()}時 - 方位角差:${azimuthDiff.toFixed(2)}°, 仰角差:${elevationDiff.toFixed(2)}°`);
        }
      }
    } catch (error) {
      console.log(`${hour}時の計算エラー: ${error.message}`);
    }
  }
  
  // 候補がある場合、詳細検索
  for (const candidate of candidates) {
    const detailedEvent = await findPrecisePearlFujiTime(candidate.time, location, fujiAzimuth, fujiElevation);
    if (detailedEvent) {
      events.push(detailedEvent);
    }
  }
  
  return events;
}

// 詳細検索（候補時刻の前後2時間を10分刻み）
async function findPrecisePearlFujiTime(candidateTime, location, targetAzimuth, targetElevation) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  
  const searchStart = new Date(candidateTime.getTime() - 2 * 60 * 60 * 1000); // 2時間前
  const searchEnd = new Date(candidateTime.getTime() + 2 * 60 * 60 * 1000);   // 2時間後
  
  let bestMatch = null;
  let bestScore = Infinity;
  
  // 10分刻みで詳細検索
  for (let searchTime = new Date(searchStart); searchTime <= searchEnd; searchTime.setMinutes(searchTime.getMinutes() + 10)) {
    try {
      const equatorial = Astronomy.Equator(Astronomy.Body.Moon, searchTime, observer, true, true);
      const horizontal = Astronomy.Horizon(searchTime, observer, equatorial.ra, equatorial.dec, 'normal');
      
      // 月が地平線上にある場合のみ
      if (horizontal.altitude > -0.5) {
        const azimuthDiff = Math.abs(horizontal.azimuth - targetAzimuth);
        const elevationDiff = Math.abs(horizontal.altitude - targetElevation);
        
        // パール富士の許容範囲
        const azimuthTolerance = 1.2; // 遠距離用
        const elevationTolerance = 0.5;
        
        if (azimuthDiff <= azimuthTolerance && elevationDiff <= elevationTolerance) {
          const score = azimuthDiff + elevationDiff;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = {
              time: new Date(searchTime),
              moonAzimuth: horizontal.azimuth,
              moonElevation: horizontal.altitude,
              azimuthDiff,
              elevationDiff,
              score
            };
          }
        }
      }
    } catch (error) {
      // エラーは無視して続行
    }
  }
  
  if (bestMatch) {
    console.log(`✅ パール富士発見: ${bestMatch.time.toLocaleString('ja-JP')}`);
    console.log(`  方位角差: ${bestMatch.azimuthDiff.toFixed(2)}°, 仰角差: ${bestMatch.elevationDiff.toFixed(2)}°`);
    
    return {
      id: `pearl_improved_${Date.now()}`,
      type: 'pearl',
      subType: bestMatch.time.getHours() < 12 ? 'rising' : 'setting',
      time: bestMatch.time,
      location,
      azimuth: targetAzimuth,
      elevation: targetElevation
    };
  }
  
  return null;
}

// 富士山への方位角計算（既存と同じ）
function calculateBearingToFuji(fromLocation) {
  const FUJI_COORDINATES = { latitude: 35.3606, longitude: 138.7274, elevation: 3776 };
  
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const toDegrees = (radians) => radians * (180 / Math.PI);
  
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// 富士山頂への仰角計算（既存と同じ）
function calculateElevationToFuji(fromLocation) {
  const FUJI_COORDINATES = { latitude: 35.3606, longitude: 138.7274, elevation: 3776 };
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const toDegrees = (radians) => radians * (180 / Math.PI);
  
  const earthRadius = 6371;
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

// テスト実行
async function testImprovedLogic() {
  const umihotaruLocation = {
    id: 265,
    name: '海ほたるパーキングエリア',
    prefecture: '千葉県',
    latitude: 35.464815,
    longitude: 139.872861,
    elevation: 5
  };
  
  const targetDate = new Date(2025, 11, 26); // 2025年12月26日
  
  console.log('=== 改善されたパール富士計算テスト ===\n');
  console.log(`対象日: ${targetDate.toLocaleDateString('ja-JP')}`);
  console.log(`地点: ${umihotaruLocation.name}\n`);
  
  const events = await calculateImprovedPearlFuji(targetDate, umihotaruLocation);
  
  console.log(`\n=== 結果 ===`);
  console.log(`発見されたパール富士: ${events.length}個`);
  
  events.forEach((event, index) => {
    console.log(`${index + 1}. ${event.time.toLocaleString('ja-JP')} (${event.subType})`);
  });
}

testImprovedLogic().catch(console.error);