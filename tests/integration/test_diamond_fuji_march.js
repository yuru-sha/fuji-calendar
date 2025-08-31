const Astronomy = require('astronomy-engine');

// 海ほたるPA
const testLocation = {
  id: 'umihotaru',
  name: '海ほたるPA',
  latitude: 35.4494,
  longitude: 139.7747,
  elevation: 10,
  fujiAzimuth: 264.36,
  fujiElevation: 2.26,
  fujiDistance: 70
};

// 共通定数をインポート
const { FUJI_COORDINATES } = require('@fuji-calendar/types');

/**
 * 修正されたダイヤモンド富士シーズン判定
 */
function isDiamondFujiSeason(date) {
  const month = date.getMonth() + 1;
  // 10月～3月がダイヤモンド富士のシーズン（春分前後も含む）
  return month >= 10 || month <= 3;
}

/**
 * 季節による検索範囲最適化
 */
function getOptimizedSearchRanges(date) {
  const month = date.getMonth() + 1;
  const ranges = [];
  
  // 季節に応じた時間範囲の動的調整
  if (month >= 10 || month <= 2) { // 冬季
    ranges.push(
      { type: 'sunrise', start: 6, end: 9 },   // 冬の日の出：6-9時
      { type: 'sunset', start: 15, end: 19 }   // 冬の日の入り：15-19時
    );
  } else if (month >= 3 && month <= 5) { // 春季
    ranges.push(
      { type: 'sunrise', start: 5, end: 8 },   // 春の日の出：5-8時
      { type: 'sunset', start: 16, end: 19 }   // 春の日の入り：16-19時
    );
  } else if (month >= 6 && month <= 9) { // 夏季・秋季
    ranges.push(
      { type: 'sunrise', start: 4, end: 7 },   // 夏の日の出：4-7時
      { type: 'sunset', start: 17, end: 20 }   // 夏の日の入り：17-20時
    );
  }
  
  return ranges;
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
 * 距離に応じた方位角許容範囲を取得
 */
function getAzimuthTolerance(distanceKm) {
  if (distanceKm <= 50) return 0.25;   // 50km以内
  if (distanceKm <= 100) return 0.4;   // 50-100km
  return 0.6;                          // 100km以上
}

/**
 * 修正されたダイヤモンド富士計算をシミュレート
 */
async function simulateDiamondFujiCalculation() {
  console.log('=== 修正後のダイヤモンド富士計算シミュレーション ===\n');
  
  const testDate = new Date(2025, 2, 10); // 3月10日
  
  console.log('テスト日付:', testDate.toLocaleDateString('ja-JP'));
  console.log('撮影地点:', testLocation.name);
  
  // シーズン判定
  const isInSeason = isDiamondFujiSeason(testDate);
  console.log('ダイヤモンド富士シーズン:', isInSeason ? 'はい' : 'いいえ');
  
  if (!isInSeason) {
    console.log('❌ シーズン外のため計算をスキップ');
    return;
  }
  
  // 検索範囲を取得
  const searchRanges = getOptimizedSearchRanges(testDate);
  console.log('検索範囲:', searchRanges);
  
  const events = [];
  
  for (const range of searchRanges) {
    console.log(`\n--- ${range.type}の検索 (${range.start}時-${range.end}時) ---`);
    
    // 粗い検索（10分刻み）
    const startTime = new Date(testDate);
    startTime.setHours(range.start, 0, 0, 0);
    
    const endTime = new Date(testDate);
    endTime.setHours(range.end, 0, 0, 0);
    
    const candidates = [];
    
    for (let time = new Date(startTime); time <= endTime; time.setMinutes(time.getMinutes() + 10)) {
      const sunPosition = calculateSunPosition(time, testLocation);
      const azimuthDifference = Math.abs(sunPosition.azimuth - testLocation.fujiAzimuth);
      
      // 観測データに基づく方位角許容範囲（粗い検索では2倍に拡大）
      const azimuthTolerance = getAzimuthTolerance(testLocation.fujiDistance) * 2;
      
      if (azimuthDifference <= azimuthTolerance) {
        candidates.push({
          time: new Date(time),
          azimuth: sunPosition.azimuth,
          elevation: sunPosition.elevation,
          azimuthDiff: azimuthDifference
        });
      }
    }
    
    console.log(`粗い検索で${candidates.length}個の候補を発見`);
    
    if (candidates.length > 0) {
      // 最有力候補の精密検索
      const bestCandidate = candidates[0];
      console.log('最有力候補:', bestCandidate.time.toLocaleString('ja-JP'));
      
      // 精密検索（1分刻み）
      const preciseStart = new Date(bestCandidate.time.getTime() - 60 * 60 * 1000); // 1時間前
      const preciseEnd = new Date(bestCandidate.time.getTime() + 60 * 60 * 1000);   // 1時間後
      
      let bestTime = null;
      let minDifference = Infinity;
      
      for (let time = new Date(preciseStart); time <= preciseEnd; time.setMinutes(time.getMinutes() + 1)) {
        const sunPosition = calculateSunPosition(time, testLocation);
        const correctedElevation = sunPosition.elevation + getAtmosphericRefraction(sunPosition.elevation);
        
        const azimuthDifference = Math.abs(sunPosition.azimuth - testLocation.fujiAzimuth);
        const elevationDifference = Math.abs(correctedElevation - testLocation.fujiElevation);
        
        const azimuthTolerance = getAzimuthTolerance(testLocation.fujiDistance);
        const elevationTolerance = 0.25;
        
        if (azimuthDifference <= azimuthTolerance && elevationDifference <= elevationTolerance) {
          const totalDifference = azimuthDifference + elevationDifference;
          
          if (totalDifference < minDifference) {
            minDifference = totalDifference;
            bestTime = new Date(time);
          }
        }
      }
      
      if (bestTime) {
        const finalSunPos = calculateSunPosition(bestTime, testLocation);
        const finalCorrectedElevation = finalSunPos.elevation + getAtmosphericRefraction(finalSunPos.elevation);
        
        const event = {
          id: `diamond_${testLocation.id}_${testDate.toISOString().split('T')[0]}_${range.type}`,
          type: 'diamond',
          subType: range.type === 'sunrise' ? 'sunrise' : 'sunset',
          time: bestTime,
          location: testLocation,
          azimuth: testLocation.fujiAzimuth,
          elevation: testLocation.fujiElevation,
          sunAzimuth: finalSunPos.azimuth,
          sunElevation: finalCorrectedElevation,
          azimuthDiff: Math.abs(finalSunPos.azimuth - testLocation.fujiAzimuth),
          elevationDiff: Math.abs(finalCorrectedElevation - testLocation.fujiElevation)
        };
        
        events.push(event);
        
        console.log('✅ ダイヤモンド富士発見!');
        console.log('最適時刻:', bestTime.toLocaleString('ja-JP'));
        console.log('太陽方位角:', finalSunPos.azimuth.toFixed(2) + '°');
        console.log('太陽仰角:', finalCorrectedElevation.toFixed(2) + '°');
        console.log('方位角差:', event.azimuthDiff.toFixed(2) + '°');
        console.log('仰角差:', event.elevationDiff.toFixed(2) + '°');
      } else {
        console.log('❌ 精密検索で条件に合致する時刻なし');
      }
    }
  }
  
  console.log(`\n=== 結果 ===`);
  console.log(`発見されたダイヤモンド富士イベント: ${events.length}個`);
  
  events.forEach((event, index) => {
    console.log(`\nイベント${index + 1}:`);
    console.log('タイプ:', event.subType);
    console.log('時刻:', event.time.toLocaleString('ja-JP'));
    console.log('方位角差:', event.azimuthDiff.toFixed(3) + '°');
    console.log('仰角差:', event.elevationDiff.toFixed(3) + '°');
  });
}

describe('Diamond Fuji Calculation (March)', () => {
    it('should simulate diamond fuji calculation for a given date and location', async () => {
        await simulateDiamondFujiCalculation();
    });
});