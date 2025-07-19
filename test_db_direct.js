// データベースから直接計算するテスト
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベース接続
const dbPath = path.join(process.cwd(), 'data', 'fuji_calendar.db');
const db = new sqlite3.Database(dbPath);

// AstronomicalCalculatorを模擬（簡略版）
const Astronomy = require('astronomy-engine');

// 舞浜海岸の情報を取得して計算
function getMaihamaAndCalculate() {
  return new Promise((resolve, reject) => {
    // 舞浜海岸のデータを取得
    const sql = "SELECT * FROM locations WHERE name LIKE '%舞浜%'";
    
    db.get(sql, [], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error('舞浜海岸が見つかりません'));
        return;
      }
      
      console.log('=== 舞浜海岸情報 ===');
      console.log(`ID: ${row.id}`);
      console.log(`名前: ${row.name}`);
      console.log(`都道府県: ${row.prefecture}`);
      console.log(`緯度: ${row.latitude}`);
      console.log(`経度: ${row.longitude}`);
      console.log(`標高: ${row.elevation}m`);
      console.log('');

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

      // 富士山への方位角
      const fujiAzimuth = calculateAzimuth(
        row.latitude, row.longitude,
        FUJI_COORDINATES.latitude, FUJI_COORDINATES.longitude
      );

      console.log('=== 2025年10月23日 ダイヤモンド富士計算 ===');
      console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);

      // 2025年10月23日の太陽位置をチェック（16:40-16:50）
      console.log('\n=== 16:40-16:50の太陽位置 ===');
      
      const targetDate = new Date(2025, 9, 23); // 10月23日
      const observer = new Astronomy.Observer(row.latitude, row.longitude, row.elevation);

      for (let minute = 40; minute <= 50; minute++) {
        const testTime = new Date(2025, 9, 23, 16, minute, 0);
        
        try {
          const sunEquatorial = Astronomy.Equator(Astronomy.Body.Sun, testTime, observer, true, true);
          const sunHorizontal = Astronomy.Horizon(testTime, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');
          
          const azimuthDiff = Math.abs(sunHorizontal.azimuth - fujiAzimuth);
          const timeStr = testTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
          
          console.log(`${timeStr} - 方位角: ${sunHorizontal.azimuth.toFixed(2)}° (差: ${azimuthDiff.toFixed(2)}°), 高度: ${sunHorizontal.altitude.toFixed(2)}°`);
          
          if (azimuthDiff <= 1.5 && sunHorizontal.altitude > -2) {
            console.log(`   🌅 **ダイヤモンド富士！** ${timeStr}`);
          }
        } catch (error) {
          console.log(`${minute}分: 計算エラー - ${error.message}`);
        }
      }

      resolve();
    });
  });
}

async function runTest() {
  try {
    await getMaihamaAndCalculate();
  } catch (error) {
    console.error('テストエラー:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('データベース接続終了エラー:', err);
      } else {
        console.log('\nデータベース接続を終了しました');
      }
    });
  }
}

runTest();