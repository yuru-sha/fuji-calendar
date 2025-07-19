// 直接CalendarServiceを使用してテスト
process.chdir('/Users/tomo/github.com/yuru-sha/fuji-calendar');

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// データベースの初期化
const dbPath = path.join(process.cwd(), 'data', 'fuji_calendar.db');
console.log('データベースパス:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    return;
  }
  console.log('データベース接続成功');
});

// 直接AstronomicalCalculatorを使用
const Astronomy = require('astronomy-engine');

// 舞浜海岸の詳細計算
async function testDirectCalculation() {
  console.log('\n=== 直接計算テスト: 舞浜海岸の2025年10月23日 ===');

  // 舞浜海岸の情報
  const maihamaLocation = {
    id: 256,
    name: '舞浜海岸',
    prefecture: '千葉県',
    latitude: 35.6225,
    longitude: 139.8853,
    elevation: 3,
    description: 'ダイヤモンド富士の撮影地',
    accessInfo: '',
    warnings: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 富士山の座標
  const FUJI_COORDINATES = {
    latitude: 35.3606,
    longitude: 138.7274,
    elevation: 3776
  };

  // 方位角計算
  function calculateAzimuth(lat1, lon1, lat2, lon2) {
    const toRadians = (deg) => deg * (Math.PI / 180);
    const toDegrees = (rad) => rad * (180 / Math.PI);
    
    const dLon = toRadians(lon2 - lon1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = toDegrees(bearingRad);
    
    return (bearingDeg + 360) % 360;
  }

  // 視線角度計算
  function calculateViewingAngle(location) {
    const R = 6371; // 地球の半径（km）
    const dLat = (FUJI_COORDINATES.latitude - location.latitude) * Math.PI / 180;
    const dLon = (FUJI_COORDINATES.longitude - location.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(location.latitude * Math.PI / 180) * Math.cos(FUJI_COORDINATES.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const heightDifference = FUJI_COORDINATES.elevation - location.elevation;
    const earthRadiusKm = 6371;
    const curvatureCorrection = (distance * distance) / (2 * earthRadiusKm) * 1000;
    const effectiveHeight = heightDifference - curvatureCorrection;
    
    return Math.atan(effectiveHeight / (distance * 1000)) * (180 / Math.PI);
  }

  // 富士山への方位角と視線角度
  const fujiAzimuth = calculateAzimuth(
    maihamaLocation.latitude, maihamaLocation.longitude,
    FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
  );
  
  const fujiViewingAngle = calculateViewingAngle(maihamaLocation);

  console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  console.log(`富士山頂への視線角度: ${fujiViewingAngle.toFixed(2)}°`);

  // 2025年10月23日のダイヤモンド富士を検索
  console.log('\n=== ダイヤモンド富士検索: 16:40-16:50 ===');
  
  const targetDate = new Date(2025, 9, 23);
  const observer = new Astronomy.Observer(maihamaLocation.latitude, maihamaLocation.longitude, maihamaLocation.elevation);
  
  const diamondEvents = [];

  for (let minute = 40; minute <= 50; minute++) {
    const testTime = new Date(2025, 9, 23, 16, minute, 0);
    
    try {
      const sunEquatorial = Astronomy.Equator(Astronomy.Body.Sun, testTime, observer, true, true);
      const sunHorizontal = Astronomy.Horizon(testTime, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');
      
      const azimuthDiff = Math.abs(sunHorizontal.azimuth - fujiAzimuth);
      const elevationDiff = Math.abs(sunHorizontal.altitude - fujiViewingAngle);
      
      const timeStr = testTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      console.log(`${timeStr} - 方位角: ${sunHorizontal.azimuth.toFixed(2)}° (差: ${azimuthDiff.toFixed(2)}°), 高度: ${sunHorizontal.altitude.toFixed(2)}° (視線角度差: ${elevationDiff.toFixed(2)}°)`);
      
      // ダイヤモンド富士の判定条件（高度も考慮）
      if (azimuthDiff <= 1.5 && elevationDiff <= 1.0 && sunHorizontal.altitude > -2) {
        console.log(`   🌅 **ダイヤモンド富士発見！** ${timeStr}`);
        
        diamondEvents.push({
          id: `diamond-setting-${maihamaLocation.id}-2025-10-23`,
          type: 'diamond',
          subType: 'setting',
          time: testTime,
          location: maihamaLocation,
          azimuth: sunHorizontal.azimuth,
          elevation: sunHorizontal.altitude
        });
      }
    } catch (error) {
      console.log(`${minute}分: 計算エラー - ${error.message}`);
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`発見されたダイヤモンド富士イベント: ${diamondEvents.length}個`);
  
  if (diamondEvents.length > 0) {
    const bestEvent = diamondEvents.reduce((best, current) => {
      const bestDiff = Math.abs(best.azimuth - fujiAzimuth) + Math.abs(best.elevation - fujiViewingAngle);
      const currentDiff = Math.abs(current.azimuth - fujiAzimuth) + Math.abs(current.elevation - fujiViewingAngle);
      return currentDiff < bestDiff ? current : best;
    });

    console.log(`ベストタイム: ${bestEvent.time.toLocaleTimeString('ja-JP')}`);
    console.log(`方位角精度: ${Math.abs(bestEvent.azimuth - fujiAzimuth).toFixed(3)}°`);
    console.log(`高度精度: ${Math.abs(bestEvent.elevation - fujiViewingAngle).toFixed(3)}°`);
  }

  // データベース接続を閉じる
  db.close((err) => {
    if (err) {
      console.error('データベース接続終了エラー:', err);
    } else {
      console.log('\nデータベース接続を終了しました');
    }
  });
}

testDirectCalculation();