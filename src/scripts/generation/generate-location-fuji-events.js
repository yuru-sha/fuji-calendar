import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データベース接続
const dbPath = path.join(__dirname, '../data/fuji-calendar.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

// 富士山の座標
const FUJI_COORDS = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

/**
 * 2点間の方位角を計算（球面三角法）
 * @param {number} lat1 始点の緯度（度）
 * @param {number} lon1 始点の経度（度）
 * @param {number} lat2 終点の緯度（度）
 * @param {number} lon2 終点の経度（度）
 * @returns {number} 方位角（度、北を0度として時計回り）
 */
function calculateAzimuth(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;
  
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let azimuth = toDeg(Math.atan2(y, x));
  return (azimuth + 360) % 360; // 0-360度に正規化
}

/**
 * ダイヤモンド富士の判定
 * @param {Object} celestialData 天体データ
 * @param {number} fujiAzimuth 富士山への方位角
 * @returns {boolean} ダイヤモンド富士の条件を満たすか
 */
function isDiamondFuji(celestialData, fujiAzimuth) {
  if (celestialData.celestial_type !== 'sun') return false;
  
  // 時間帯の確認（ドキュメントより）
  const hour = celestialData.hour;
  const isMorning = (hour >= 4 && hour < 10); // 4:00-9:59
  const isAfternoon = (hour >= 14 && hour < 20); // 14:00-19:59
  
  if (!isMorning && !isAfternoon) return false;
  
  // 方位角の差を計算（±1.5度以内）
  const azimuthDiff = Math.abs(celestialData.azimuth - fujiAzimuth);
  const normalizedDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  
  // 高度が水平線近く（-2度〜10度）かつ方位角が近い
  return celestialData.elevation >= -2 && 
         celestialData.elevation <= 10 && 
         normalizedDiff <= 1.5;
}

/**
 * パール富士の判定
 * @param {Object} celestialData 天体データ
 * @param {number} fujiAzimuth 富士山への方位角
 * @returns {boolean} パール富士の条件を満たすか
 */
function isPearlFuji(celestialData, fujiAzimuth) {
  if (celestialData.celestial_type !== 'moon') return false;
  
  // 方位角の差を計算（±1.5度以内）
  const azimuthDiff = Math.abs(celestialData.azimuth - fujiAzimuth);
  const normalizedDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  
  // 高度が水平線近く（-2度〜10度）かつ方位角が近い
  // 満月に近い（照明度50%以上）ほど良い
  return celestialData.elevation >= -2 && 
         celestialData.elevation <= 10 && 
         normalizedDiff <= 1.5 &&
         celestialData.moon_illumination >= 0.3; // 30%以上の明るさ
}

/**
 * 品質評価
 * @param {Object} celestialData 天体データ
 * @param {number} azimuthDiff 方位角の差
 * @returns {string} 品質評価（excellent/good/fair/poor）
 */
function evaluateQuality(celestialData, azimuthDiff) {
  if (celestialData.celestial_type === 'sun') {
    if (azimuthDiff <= 0.5 && celestialData.elevation >= 0) return 'excellent';
    if (azimuthDiff <= 1.0 && celestialData.elevation >= -1) return 'good';
    if (azimuthDiff <= 1.5) return 'fair';
  } else {
    // 月の場合は照明度も考慮
    const illumination = celestialData.moon_illumination || 0;
    if (azimuthDiff <= 0.5 && illumination >= 0.8) return 'excellent';
    if (azimuthDiff <= 1.0 && illumination >= 0.6) return 'good';
    if (azimuthDiff <= 1.5 && illumination >= 0.3) return 'fair';
  }
  return 'poor';
}

// メイン処理
async function generateLocationFujiEvents() {
  console.log('location_fuji_eventsテーブルの生成を開始します...');
  
  // 既存データをクリア
  await dbRun('DELETE FROM location_fuji_events');
  
  // 全地点を取得
  const locations = await dbAll('SELECT * FROM locations');
  console.log(`${locations.length}地点のデータを処理します`);
  
  // 各地点について処理
  for (const location of locations) {
    console.log(`\n処理中: ${location.name} (ID: ${location.id})`);
    
    // 富士山への方位角を計算
    const fujiAzimuth = calculateAzimuth(
      location.latitude, 
      location.longitude,
      FUJI_COORDS.latitude, 
      FUJI_COORDS.longitude
    );
    
    console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(1)}度`);
    
    // 年間の天体データを取得（2025年）
    const celestialData = await dbAll(`
      SELECT * FROM celestial_orbit_data 
      WHERE date BETWEEN '2025-01-01' AND '2025-12-31'
      AND visible = 1
      ORDER BY date, time
    `);
    
    const events = [];
    const processedDates = new Set();
    
    // 各天体データをチェック
    for (const data of celestialData) {
      const dateKey = `${data.date}-${data.celestial_type}`;
      
      // 同じ日の同じ天体は1回だけ処理
      if (processedDates.has(dateKey)) continue;
      
      const azimuthDiff = Math.abs(data.azimuth - fujiAzimuth);
      const normalizedDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
      
      // ダイヤモンド富士チェック
      if (isDiamondFuji(data, fujiAzimuth)) {
        processedDates.add(dateKey);
        const timeOfDay = data.hour < 12 ? 'sunrise' : 'sunset';
        
        events.push({
          location_id: location.id,
          event_date: data.date,
          event_type: `diamond_${timeOfDay}`,
          event_time: data.time,
          celestial_azimuth: data.azimuth,
          fuji_azimuth: fujiAzimuth,
          azimuth_difference: normalizedDiff,
          moon_phase: null,
          moon_illumination: null,
          quality: evaluateQuality(data, normalizedDiff),
          observation_notes: `${timeOfDay === 'sunrise' ? '日の出' : '日没'}時のダイヤモンド富士`
        });
      }
      
      // パール富士チェック
      if (isPearlFuji(data, fujiAzimuth)) {
        processedDates.add(dateKey);
        const timeOfDay = data.hour < 12 ? 'moonrise' : 'moonset';
        
        events.push({
          location_id: location.id,
          event_date: data.date,
          event_type: `pearl_${timeOfDay}`,
          event_time: data.time,
          celestial_azimuth: data.azimuth,
          fuji_azimuth: fujiAzimuth,
          azimuth_difference: normalizedDiff,
          moon_phase: data.moon_phase,
          moon_illumination: data.moon_illumination,
          quality: evaluateQuality(data, normalizedDiff),
          observation_notes: `${timeOfDay === 'moonrise' ? '月の出' : '月の入り'}時のパール富士（月相: ${(data.moon_phase * 100).toFixed(0)}%）`
        });
      }
    }
    
    // イベントを挿入
    if (events.length > 0) {
      for (const event of events) {
        await dbRun(`
          INSERT INTO location_fuji_events (
            location_id, event_date, event_type, event_time,
            celestial_azimuth, fuji_azimuth, azimuth_difference,
            moon_phase, moon_illumination, quality,
            observation_notes, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, datetime('now', '+9 hours'), datetime('now', '+9 hours')
          )
        `, [
          event.location_id, event.event_date, event.event_type, event.event_time,
          event.celestial_azimuth, event.fuji_azimuth, event.azimuth_difference,
          event.moon_phase, event.moon_illumination, event.quality,
          event.observation_notes
        ]);
      }
      console.log(`  → ${events.length}件のイベントを登録`);
    } else {
      console.log(`  → イベントなし`);
    }
  }
  
  // 統計情報
  const stats = await dbAll(`
    SELECT 
      event_type,
      COUNT(*) as count
    FROM location_fuji_events
    GROUP BY event_type
  `);
  
  console.log('\n=== 生成結果 ===');
  stats.forEach(stat => {
    console.log(`${stat.event_type}: ${stat.count}件`);
  });
  
  const total = await dbGet('SELECT COUNT(*) as count FROM location_fuji_events');
  console.log(`\n合計: ${total.count}件のイベントを生成しました`);
  
  // データベースを閉じる
  await new Promise((resolve) => db.close(resolve));
}

// 実行
generateLocationFujiEvents().catch(console.error);