#!/usr/bin/env node

// 天子ヶ岳での 2025-01-16 月昇パール富士の詳細検索

const Astronomy = require('astronomy-engine');

const tenjogatakeLocation = {
  id: 6,
  name: '天子山地・天子ヶ岳山頂付近',
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319
};

const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

// 方位角計算
function calculateAzimuthToFuji(location) {
  const φ1 = location.latitude * Math.PI / 180;
  const φ2 = FUJI_COORDINATES.latitude * Math.PI / 180;
  const Δλ = (FUJI_COORDINATES.longitude - location.longitude) * Math.PI / 180;

  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let azimuth = Math.atan2(x, y) * 180 / Math.PI;
  
  if (azimuth < 0) {
    azimuth += 360;
  }
  
  return azimuth;
}

// 精密月昇り時刻検索（1 分間隔）
async function findPreciseMoonrise() {
  const date = new Date('2025-01-16T00:00:00+09:00');
  const fujiAzimuth = calculateAzimuthToFuji(tenjogatakeLocation);
  
  console.log('=== 2025-01-16 月昇りパール富士精密検索 ===');
  console.log(`天子ヶ岳: 緯度 ${tenjogatakeLocation.latitude}, 経度 ${tenjogatakeLocation.longitude}, 標高 ${tenjogatakeLocation.elevation}m`);
  console.log(`富士山への方位角: ${fujiAzimuth.toFixed(3)}°`);
  
  const observer = new Astronomy.Observer(
    tenjogatakeLocation.latitude,
    tenjogatakeLocation.longitude,
    tenjogatakeLocation.elevation
  );
  
  // 24 時間全体を 1 分間隔で検索
  let bestCandidate = null;
  let minAzimuthDiff = 999;
  
  console.log('\n=== 24 時間全体検索（1 分間隔） ===');
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 1) { // 1 分間隔
      const checkTime = new Date(date);
      checkTime.setHours(hour, minute, 0, 0);
      
      try {
        const utcTime = new Date(checkTime.getTime() - 9 * 60 * 60 * 1000);
        
        const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, utcTime, observer, true, true);
        const moonPosition = Astronomy.Horizon(utcTime, observer, moonEquator.ra, moonEquator.dec, 'normal');
        const moonPhase = Astronomy.MoonPhase(utcTime);
        const moonIllumination = Astronomy.Illumination('Moon', utcTime);
        
        const azimuthDiff = Math.abs(moonPosition.azimuth - fujiAzimuth);
        const isVisible = moonPosition.altitude > -2;
        const isInRange = azimuthDiff <= 1.5;
        
        // より良い候補を記録
        if (isVisible && azimuthDiff < minAzimuthDiff) {
          minAzimuthDiff = azimuthDiff;
          bestCandidate = {
            time: new Date(checkTime),
            azimuth: moonPosition.azimuth,
            altitude: moonPosition.altitude,
            azimuthDiff: azimuthDiff,
            moonPhase: moonPhase,
            illumination: moonIllumination.fraction,
            isInRange: isInRange
          };
        }
        
        // 範囲内かつ可視の場合は詳細出力
        if (isInRange && isVisible) {
          console.log(`✅ ${checkTime.toLocaleTimeString('ja-JP')}: ` +
            `方位角 ${moonPosition.azimuth.toFixed(3)}° (差分 ${azimuthDiff.toFixed(3)}°) ` +
            `高度 ${moonPosition.altitude.toFixed(3)}° ` +
            `月相 ${moonPhase.toFixed(3)} ` +
            `照度 ${(moonIllumination.fraction * 100).toFixed(1)}%`);
        }
        
      } catch (error) {
        // エラーは無視
      }
    }
  }
  
  console.log('\n=== 検索結果 ===');
  if (bestCandidate) {
    console.log('最良候補:');
    console.log(`時刻: ${bestCandidate.time.toLocaleString('ja-JP')}`);
    console.log(`方位角: ${bestCandidate.azimuth.toFixed(3)}° (差分: ${bestCandidate.azimuthDiff.toFixed(3)}°)`);
    console.log(`高度: ${bestCandidate.altitude.toFixed(3)}°`);
    console.log(`月相: ${bestCandidate.moonPhase.toFixed(3)}`);
    console.log(`照度: ${(bestCandidate.illumination * 100).toFixed(1)}%`);
    console.log(`パール富士条件: ${bestCandidate.isInRange ? '✅ 満たす' : '❌ 満たさない'}`);
    
    if (bestCandidate.isInRange) {
      console.log('\n🌙 パール富士昇りが検出されました！');
    } else {
      console.log(`\n❌ パール富士昇りは検出されませんでした（最小差分: ${minAzimuthDiff.toFixed(3)}°）`);
    }
  } else {
    console.log('月が見つかりませんでした');
  }
  
  // Astronomy.SearchRiseSet での月の出時刻も確認
  console.log('\n=== Astronomy.SearchRiseSet での月の出確認 ===');
  try {
    const utcDate = new Date(date.getTime() - 9 * 60 * 60 * 1000);
    const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, utcDate, 1);
    
    if (moonrise) {
      const jstTime = new Date(moonrise.getTime() + 9 * 60 * 60 * 1000);
      console.log(`公式月の出時刻: ${jstTime.toLocaleString('ja-JP')}`);
      
      const riseEquator = Astronomy.Equator(Astronomy.Body.Moon, moonrise, observer, true, true);
      const risePosition = Astronomy.Horizon(moonrise, observer, riseEquator.ra, riseEquator.dec, 'normal');
      const riseAzimuthDiff = Math.abs(risePosition.azimuth - fujiAzimuth);
      
      console.log(`月の出方位角: ${risePosition.azimuth.toFixed(3)}°`);
      console.log(`富士山との差分: ${riseAzimuthDiff.toFixed(3)}°`);
      console.log(`月の出高度: ${risePosition.altitude.toFixed(3)}°`);
      
      if (riseAzimuthDiff <= 1.5) {
        console.log('✅ 月の出時にパール富士条件を満たします');
      } else {
        console.log('❌ 月の出時はパール富士条件を満たしません');
      }
    } else {
      console.log('月の出が見つかりませんでした');
    }
  } catch (error) {
    console.log(`月の出計算エラー: ${error.message}`);
  }
}

findPreciseMoonrise();