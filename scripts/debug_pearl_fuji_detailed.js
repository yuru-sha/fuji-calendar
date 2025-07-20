// 2025-12-26 22:18頃の海ほたるPA パール富士詳細調査
const Astronomy = require('astronomy-engine');

// 海ほたるPAの座標（画像の座標に合わせて調整）
const umihotaruLocation = {
  id: 265,
  name: '海ほたるパーキングエリア',
  prefecture: '千葉県',
  latitude: 35.464815,  // 画像の座標
  longitude: 139.872861, // 画像の座標
  elevation: 5  // 画像の標高
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

async function debugSpecificTime() {
  console.log('=== 2025-12-26 22:18 海ほたるPA パール富士詳細調査 ===\n');
  
  // 画像で示された時刻
  const targetTime = new Date(2025, 11, 26, 22, 18, 0); // 2025年12月26日 22:18:00
  console.log(`対象時刻: ${targetTime.toLocaleString('ja-JP')}`);
  console.log(`地点: ${umihotaruLocation.name}`);
  console.log(`座標: ${umihotaruLocation.latitude}°N, ${umihotaruLocation.longitude}°E, 標高${umihotaruLocation.elevation}m`);
  
  // 富士山への基本情報
  const fujiAzimuth = calculateBearingToFuji(umihotaruLocation);
  const fujiElevation = calculateElevationToFuji(umihotaruLocation);
  
  console.log(`\n富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  console.log(`富士山頂への仰角: ${fujiElevation.toFixed(2)}°`);
  
  // 指定時刻の月の位置を計算
  const observer = new Astronomy.Observer(umihotaruLocation.latitude, umihotaruLocation.longitude, umihotaruLocation.elevation);
  
  try {
    const equatorial = Astronomy.Equator(Astronomy.Body.Moon, targetTime, observer, true, true);
    const horizontal = Astronomy.Horizon(targetTime, observer, equatorial.ra, equatorial.dec, 'normal');
    
    const moonAzimuth = horizontal.azimuth;
    const moonElevation = horizontal.altitude;
    
    console.log(`\n=== 指定時刻の月の位置 ===`);
    console.log(`月の方位角: ${moonAzimuth.toFixed(2)}°`);
    console.log(`月の仰角: ${moonElevation.toFixed(2)}°`);
    
    // 差を計算
    const azimuthDiff = Math.abs(moonAzimuth - fujiAzimuth);
    const elevationDiff = Math.abs(moonElevation - fujiElevation);
    
    console.log(`\n=== 富士山との差 ===`);
    console.log(`方位角差: ${azimuthDiff.toFixed(2)}°`);
    console.log(`仰角差: ${elevationDiff.toFixed(2)}°`);
    
    // 許容範囲チェック
    const azimuthTolerance = 1.2; // 100km以上の距離用
    const elevationTolerance = 0.5; // パール富士用
    
    console.log(`\n=== 許容範囲チェック ===`);
    console.log(`方位角: ${azimuthDiff.toFixed(2)}° <= ${azimuthTolerance}° : ${azimuthDiff <= azimuthTolerance ? '✅ OK' : '❌ NG'}`);
    console.log(`仰角: ${elevationDiff.toFixed(2)}° <= ${elevationTolerance}° : ${elevationDiff <= elevationTolerance ? '✅ OK' : '❌ NG'}`);
    
    const isValidPearlFuji = azimuthDiff <= azimuthTolerance && elevationDiff <= elevationTolerance;
    console.log(`\n結果: ${isValidPearlFuji ? '✅ パール富士条件を満たす' : '❌ パール富士条件を満たさない'}`);
    
    // 月相チェック
    const moonPhase = Astronomy.MoonPhase(targetTime);
    const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));
    
    console.log(`\n=== 月相情報 ===`);
    console.log(`月相角度: ${moonPhase.toFixed(1)}°`);
    console.log(`照光面積: ${(illuminationFraction * 100).toFixed(1)}%`);
    console.log(`月相判定: ${illuminationFraction > 0.1 ? '✅ 表示対象' : '❌ 新月期間（除外）'}`);
    
    // 月の出入り時刻を確認
    console.log(`\n=== 月の出入り時刻確認 ===`);
    
    const targetDate = new Date(2025, 11, 26);
    const searchStart = new Date(targetDate);
    searchStart.setDate(searchStart.getDate() - 1);
    
    try {
      const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, searchStart, 3);
      const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, searchStart, 3);
      
      console.log(`最近の月の出: ${moonrise ? moonrise.date.toLocaleString('ja-JP') : 'なし'}`);
      console.log(`最近の月の入り: ${moonset ? moonset.date.toLocaleString('ja-JP') : 'なし'}`);
      
      // 22:18が月の入り時刻に近いかチェック
      if (moonset) {
        const timeDiff = Math.abs(targetTime.getTime() - moonset.date.getTime()) / (1000 * 60); // 分
        console.log(`月の入り時刻との差: ${timeDiff.toFixed(1)}分`);
        
        if (timeDiff <= 60) { // 1時間以内
          console.log(`✅ 月の入り時刻に近い（パール富士の可能性あり）`);
        }
      }
      
    } catch (error) {
      console.log(`月の出入り検索エラー: ${error.message}`);
    }
    
  } catch (error) {
    console.error('計算エラー:', error.message);
  }
}

debugSpecificTime().catch(console.error);