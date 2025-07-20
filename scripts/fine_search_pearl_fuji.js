// 2025-12-26 22時台の詳細検索
const Astronomy = require('astronomy-engine');

async function fineSearchAroundTime() {
  const umihotaruLocation = {
    latitude: 35.464815,
    longitude: 139.872861,
    elevation: 5
  };
  
  const FUJI_COORDINATES = { latitude: 35.3606, longitude: 138.7274, elevation: 3776 };
  
  // 富士山への方位角・仰角計算
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const toDegrees = (radians) => radians * (180 / Math.PI);
  
  const lat1 = toRadians(umihotaruLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - umihotaruLocation.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  const fujiAzimuth = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  
  const earthRadius = 6371;
  const deltaLat = lat2 - lat1;
  const deltaLonRad = toRadians(FUJI_COORDINATES.longitude - umihotaruLocation.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const waterDistance = earthRadius * c;
  
  const heightDifference = (FUJI_COORDINATES.elevation - umihotaruLocation.elevation) / 1000;
  const fujiElevation = toDegrees(Math.atan(heightDifference / waterDistance));
  
  console.log('=== 2025-12-26 22時台の詳細検索 ===\n');
  console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  console.log(`富士山頂への仰角: ${fujiElevation.toFixed(2)}°\n`);
  
  const observer = new Astronomy.Observer(umihotaruLocation.latitude, umihotaruLocation.longitude, umihotaruLocation.elevation);
  
  // 22時から23時まで5分刻みで検索
  const baseTime = new Date(2025, 11, 26, 22, 0, 0); // 2025-12-26 22:00:00
  
  let bestMatch = null;
  let bestScore = Infinity;
  
  console.log('時刻\t\t月方位角\t月仰角\t方位角差\t仰角差\t判定');
  console.log('------------------------------------------------------------');
  
  for (let minutes = 0; minutes < 60; minutes += 5) {
    const checkTime = new Date(baseTime.getTime() + minutes * 60 * 1000);
    
    try {
      const equatorial = Astronomy.Equator(Astronomy.Body.Moon, checkTime, observer, true, true);
      const horizontal = Astronomy.Horizon(checkTime, observer, equatorial.ra, equatorial.dec, 'normal');
      
      const moonAzimuth = horizontal.azimuth;
      const moonElevation = horizontal.altitude;
      
      const azimuthDiff = Math.abs(moonAzimuth - fujiAzimuth);
      const elevationDiff = Math.abs(moonElevation - fujiElevation);
      
      const azimuthTolerance = 1.2;
      const elevationTolerance = 0.5;
      
      const azimuthOK = azimuthDiff <= azimuthTolerance;
      const elevationOK = elevationDiff <= elevationTolerance;
      const isMatch = azimuthOK && elevationOK;
      
      const timeStr = checkTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const status = isMatch ? '✅ MATCH' : (azimuthOK ? '🔶 Az OK' : (elevationOK ? '🔷 El OK' : '❌'));
      
      console.log(`${timeStr}\t\t${moonAzimuth.toFixed(2)}°\t\t${moonElevation.toFixed(2)}°\t${azimuthDiff.toFixed(2)}°\t\t${elevationDiff.toFixed(2)}°\t${status}`);
      
      if (isMatch) {
        const score = azimuthDiff + elevationDiff;
        if (score < bestScore) {
          bestScore = score;
          bestMatch = {
            time: new Date(checkTime),
            moonAzimuth,
            moonElevation,
            azimuthDiff,
            elevationDiff,
            score
          };
        }
      }
      
    } catch (error) {
      console.log(`${checkTime.toLocaleTimeString('ja-JP')}\t\tエラー: ${error.message}`);
    }
  }
  
  console.log('\n=== 結果 ===');
  if (bestMatch) {
    console.log(`✅ パール富士発見！`);
    console.log(`最適時刻: ${bestMatch.time.toLocaleString('ja-JP')}`);
    console.log(`月の方位角: ${bestMatch.moonAzimuth.toFixed(2)}° (富士山: ${fujiAzimuth.toFixed(2)}°)`);
    console.log(`月の仰角: ${bestMatch.moonElevation.toFixed(2)}° (富士山: ${fujiElevation.toFixed(2)}°)`);
    console.log(`方位角差: ${bestMatch.azimuthDiff.toFixed(2)}°`);
    console.log(`仰角差: ${bestMatch.elevationDiff.toFixed(2)}°`);
    console.log(`総合スコア: ${bestMatch.score.toFixed(3)}`);
  } else {
    console.log(`❌ 22時台にパール富士なし`);
  }
}

fineSearchAroundTime().catch(console.error);