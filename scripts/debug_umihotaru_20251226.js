const Astronomy = require('astronomy-engine');

// 海ほたるPA（APIから取得した実際のデータ）
const umihotaruLocation = {
  id: 259,
  name: "東京湾アクアライン・海ほたるPA北岸付近",
  prefecture: "千葉県",
  latitude: 35.464815,
  longitude: 139.872861,
  elevation: 5,
  fujiAzimuth: 263.96236548910787,
  fujiElevation: 2.067670153957952,
  fujiDistance: 104.450210282952
};

/**
 * 月位置を計算
 */
function calculateMoonPosition(time, location) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  const equatorial = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  
  return {
    azimuth: horizontal.azimuth,
    elevation: horizontal.altitude
  };
}

/**
 * 月相を計算
 */
function calculateMoonPhase(date) {
  const moonPhase = Astronomy.MoonPhase(date);
  const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));
  return {
    phase: moonPhase,
    illuminationFraction: illuminationFraction
  };
}

/**
 * パール富士専用の距離に応じた方位角許容範囲を取得
 */
function getPearlAzimuthTolerance(distanceKm) {
  if (distanceKm <= 50) return 1.0;    // 50km以内（ダイヤモンド富士の4倍）
  if (distanceKm <= 100) return 2.0;   // 50-100km（ダイヤモンド富士の5倍）
  return 3.0;                          // 100km以上（ダイヤモンド富士の5倍）
}

/**
 * 2025年12月26日の海ほたるPAでのパール富士をデバッグ
 */
function debugUmihotaruPearlFuji() {
  console.log('=== 2025年12月26日 海ほたるPA パール富士デバッグ ===\n');
  
  const testDate = new Date(2025, 11, 26); // 12月26日
  
  console.log('撮影地点:', umihotaruLocation.name);
  console.log('日付:', testDate.toLocaleDateString('ja-JP'));
  console.log('座標:', `${umihotaruLocation.latitude}, ${umihotaruLocation.longitude}`);
  console.log('標高:', `${umihotaruLocation.elevation}m`);
  console.log('富士山方位角:', umihotaruLocation.fujiAzimuth.toFixed(2) + '°');
  console.log('富士山仰角:', umihotaruLocation.fujiElevation.toFixed(2) + '°');
  console.log('富士山距離:', umihotaruLocation.fujiDistance.toFixed(1) + 'km');
  
  // 月相をチェック
  const moonPhaseInfo = calculateMoonPhase(testDate);
  console.log('\n--- 月相情報 ---');
  console.log('月相:', moonPhaseInfo.phase.toFixed(1) + '°');
  console.log('照度:', (moonPhaseInfo.illuminationFraction * 100).toFixed(1) + '%');
  
  if (moonPhaseInfo.illuminationFraction < 0.1) {
    console.log('❌ 新月期間のため除外される可能性');
    return;
  } else {
    console.log('✅ 月相は問題なし');
  }
  
  // その日の全時間帯を1時間刻みでチェック
  console.log('\n--- 全時間帯チェック（1時間刻み） ---');
  
  const startOfDay = new Date(testDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const candidates = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const checkTime = new Date(startOfDay);
    checkTime.setHours(hour, 0, 0, 0);
    
    try {
      const moonPos = calculateMoonPosition(checkTime, umihotaruLocation);
      
      // 月が地平線上にある場合のみチェック
      if (moonPos.elevation > -1) {
        const azimuthDiff = Math.abs(moonPos.azimuth - umihotaruLocation.fujiAzimuth);
        const elevationDiff = Math.abs(moonPos.elevation - umihotaruLocation.fujiElevation);
        
        console.log(`${hour.toString().padStart(2, '0')}:00 - 月位置: 方位角=${moonPos.azimuth.toFixed(1)}°, 仰角=${moonPos.elevation.toFixed(1)}°, 方位角差=${azimuthDiff.toFixed(1)}°, 仰角差=${elevationDiff.toFixed(1)}°`);
        
        // 粗い判定で候補を絞り込み（許容範囲の2倍）
        const azimuthTolerance = getPearlAzimuthTolerance(umihotaruLocation.fujiDistance);
        if (azimuthDiff <= azimuthTolerance * 2 && elevationDiff <= 8.0) { // パール富士の仰角許容範囲4.0の2倍
          candidates.push({
            time: new Date(checkTime),
            azimuth: moonPos.azimuth,
            elevation: moonPos.elevation,
            azimuthDiff: azimuthDiff,
            elevationDiff: elevationDiff
          });
          
          console.log(`  ✅ 候補として追加`);
        }
      } else {
        console.log(`${hour.toString().padStart(2, '0')}:00 - 月は地平線下 (仰角=${moonPos.elevation.toFixed(1)}°)`);
      }
    } catch (error) {
      console.log(`${hour.toString().padStart(2, '0')}:00 - エラー: ${error.message}`);
    }
  }
  
  console.log(`\n--- 候補検索結果 ---`);
  console.log(`発見された候補: ${candidates.length}個`);
  
  if (candidates.length === 0) {
    console.log('❌ パール富士の候補が見つかりませんでした');
    return;
  }
  
  // 各候補の詳細検索
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`\n--- 候補${i + 1}の詳細検索 ---`);
    console.log('候補時刻:', candidate.time.toLocaleString('ja-JP'));
    
    // 前後2時間を10分刻みで詳細検索
    const searchStart = new Date(candidate.time.getTime() - 2 * 60 * 60 * 1000); // 2時間前
    const searchEnd = new Date(candidate.time.getTime() + 2 * 60 * 60 * 1000);   // 2時間後
    
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (let searchTime = new Date(searchStart); searchTime <= searchEnd; searchTime.setMinutes(searchTime.getMinutes() + 10)) {
      try {
        const moonPos = calculateMoonPosition(searchTime, umihotaruLocation);
        
        // 月が地平線上にある場合のみ
        if (moonPos.elevation > -0.5) {
          const azimuthDiff = Math.abs(moonPos.azimuth - umihotaruLocation.fujiAzimuth);
          const elevationDiff = Math.abs(moonPos.elevation - umihotaruLocation.fujiElevation);
          
          // パール富士の許容範囲
          const azimuthTolerance = getPearlAzimuthTolerance(umihotaruLocation.fujiDistance);
          
          if (azimuthDiff <= azimuthTolerance && elevationDiff <= 4.0) {
            const score = azimuthDiff + elevationDiff;
            if (score < bestScore) {
              bestScore = score;
              bestMatch = {
                time: new Date(searchTime),
                azimuth: moonPos.azimuth,
                elevation: moonPos.elevation,
                azimuthDiff: azimuthDiff,
                elevationDiff: elevationDiff,
                score: score,
                subType: searchTime.getHours() < 12 ? 'rising' : 'setting'
              };
            }
          }
        }
      } catch (error) {
        // エラーは無視して続行
      }
    }
    
    if (bestMatch) {
      console.log('✅ パール富士発見!');
      console.log('最適時刻:', bestMatch.time.toLocaleString('ja-JP'));
      console.log('月方位角:', bestMatch.azimuth.toFixed(2) + '°');
      console.log('月仰角:', bestMatch.elevation.toFixed(2) + '°');
      console.log('方位角差:', bestMatch.azimuthDiff.toFixed(2) + '°');
      console.log('仰角差:', bestMatch.elevationDiff.toFixed(2) + '°');
      console.log('総合スコア:', bestMatch.score.toFixed(3));
      console.log('サブタイプ:', bestMatch.subType);
      
      // 評価
      if (bestMatch.azimuthDiff <= 0.5 && bestMatch.elevationDiff <= 0.3) {
        console.log('評価: 🌟 優秀');
      } else if (bestMatch.azimuthDiff <= 0.8 && bestMatch.elevationDiff <= 0.5) {
        console.log('評価: ⭐ 良好');
      } else {
        console.log('評価: 🔶 可能性あり');
      }
    } else {
      console.log('❌ 詳細検索で条件に合致する時刻なし');
    }
  }
}

// 実行
debugUmihotaruPearlFuji();