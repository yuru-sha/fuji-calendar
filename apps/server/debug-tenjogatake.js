#!/usr/bin/env node

// 天子ヶ岳（location_id=6）の 2025-01-16 20:00 パール富士昇り検出のデバッグ

const Astronomy = require('astronomy-engine');

// 天子ヶ岳の座標（仮定値 - 実際の DB から取得する必要がある）
const tenjogatakeLocation = {
  id: 6,
  name: '天子ヶ岳山頂',
  latitude: 35.3333,  // 仮定値
  longitude: 138.5833, // 仮定値
  elevation: 1330     // 仮定値
};

// 富士山の座標
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

// 2025-01-16 の月の動きを詳細チェック
function debugMoonRiseOnDate() {
  const date = new Date('2025-01-16T00:00:00+09:00'); // JST
  console.log('=== 天子ヶ岳 2025-01-16 パール富士昇りデバッグ ===');
  console.log(`日付: ${date.toISOString()}`);
  console.log(`天子ヶ岳: 緯度 ${tenjogatakeLocation.latitude}, 経度 ${tenjogatakeLocation.longitude}`);
  
  const fujiAzimuth = calculateAzimuthToFuji(tenjogatakeLocation);
  console.log(`富士山への方位角: ${fujiAzimuth.toFixed(2)}°`);
  
  // 18:00 から 翌 6:00 まで 1 時間毎に月の位置をチェック
  console.log('\n=== 時刻別月の位置 ===');
  for (let hour = 18; hour <= 30; hour++) { // 30 = 翌日 6 時
    const checkTime = new Date(date);
    if (hour >= 24) {
      checkTime.setDate(checkTime.getDate() + 1);
      checkTime.setHours(hour - 24, 0, 0, 0);
    } else {
      checkTime.setHours(hour, 0, 0, 0);
    }
    
    try {
      // UTC 時刻に変換（JST - 9 時間）
      const utcTime = new Date(checkTime.getTime() - 9 * 60 * 60 * 1000);
      
      const observer = new Astronomy.Observer(
        tenjogatakeLocation.latitude,
        tenjogatakeLocation.longitude,
        tenjogatakeLocation.elevation
      );
      
      const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, utcTime, observer, true, true);
      const moonPosition = Astronomy.Horizon(utcTime, observer, moonEquator.ra, moonEquator.dec, 'normal');
      const moonPhase = Astronomy.MoonPhase(utcTime);
      const moonIllumination = Astronomy.Illumination('Moon', utcTime);
      
      const azimuthDiff = Math.abs(moonPosition.azimuth - fujiAzimuth);
      const isInRange = azimuthDiff <= 1.5;
      const isVisible = moonPosition.altitude > -2;
      
      console.log(`${checkTime.toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}: ` +
        `方位角 ${moonPosition.azimuth.toFixed(2)}° (差分 ${azimuthDiff.toFixed(2)}°) ` +
        `高度 ${moonPosition.altitude.toFixed(2)}° ` +
        `月相 ${moonPhase.toFixed(3)} ` +
        `照度 ${(moonIllumination.fraction * 100).toFixed(1)}% ` +
        `範囲内: ${isInRange ? 'YES' : 'NO'} ` +
        `可視: ${isVisible ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log(`${checkTime.toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}: エラー - ${error.message}`);
    }
  }
  
  // 19:30 - 20:30 の範囲を 10 分間隔で詳細チェック
  console.log('\n=== 19:30-20:30 詳細チェック（10 分間隔）===');
  for (let minutes = 19 * 60 + 30; minutes <= 20 * 60 + 30; minutes += 10) {
    const checkTime = new Date(date);
    checkTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    
    try {
      const utcTime = new Date(checkTime.getTime() - 9 * 60 * 60 * 1000);
      
      const observer = new Astronomy.Observer(
        tenjogatakeLocation.latitude,
        tenjogatakeLocation.longitude,
        tenjogatakeLocation.elevation
      );
      
      const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, utcTime, observer, true, true);
      const moonPosition = Astronomy.Horizon(utcTime, observer, moonEquator.ra, moonEquator.dec, 'normal');
      const azimuthDiff = Math.abs(moonPosition.azimuth - fujiAzimuth);
      
      console.log(`${checkTime.toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}: ` +
        `方位角 ${moonPosition.azimuth.toFixed(3)}° (差分 ${azimuthDiff.toFixed(3)}°) ` +
        `高度 ${moonPosition.altitude.toFixed(3)}°`);
        
    } catch (error) {
      console.log(`${checkTime.toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}: エラー - ${error.message}`);
    }
  }
}

// 月の出時刻を直接計算
function calculateMoonrise() {
  console.log('\n=== 月の出時刻計算 ===');
  const date = new Date('2025-01-16T00:00:00+09:00');
  const utcDate = new Date(date.getTime() - 9 * 60 * 60 * 1000);
  
  const observer = new Astronomy.Observer(
    tenjogatakeLocation.latitude,
    tenjogatakeLocation.longitude,
    tenjogatakeLocation.elevation
  );
  
  try {
    const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, utcDate, 1);
    if (moonrise) {
      const jstTime = new Date(moonrise.getTime() + 9 * 60 * 60 * 1000);
      console.log(`月の出時刻: ${jstTime.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
      
      // 月の出時の方位角と高度
      const riseEquator = Astronomy.Equator(Astronomy.Body.Moon, moonrise, observer, true, true);
      const risePosition = Astronomy.Horizon(moonrise, observer, riseEquator.ra, riseEquator.dec, 'normal');
      const azimuthDiff = Math.abs(risePosition.azimuth - fujiAzimuth);
      
      console.log(`月の出時の方位角: ${risePosition.azimuth.toFixed(3)}°`);
      console.log(`富士山との方位角差: ${azimuthDiff.toFixed(3)}°`);
      console.log(`月の出時の高度: ${risePosition.altitude.toFixed(3)}°`);
      
      if (azimuthDiff <= 1.5) {
        console.log('✅ パール富士昇り条件を満たしています！');
      } else {
        console.log('❌ パール富士昇り条件を満たしていません');
      }
    } else {
      console.log('月の出が見つかりませんでした');
    }
  } catch (error) {
    console.log(`月の出計算エラー: ${error.message}`);
  }
}

// 実行
debugMoonRiseOnDate();
calculateMoonrise();