import { AstronomicalCalculatorImpl } from '../src/server/services/AstronomicalCalculator';
import { timeUtils } from '../src/shared/utils/timeUtils';
import { FUJI_COORDINATES, Location } from '../src/shared/types';

// 舞浜海岸の座標（データベースから取得した実際の値）
const MAIHAMA_COAST: Location = {
  id: 1, // テスト用のID
  name: '舞浜海岸',
  prefecture: '千葉県',
  latitude: 35.6225,  // データベースの値
  longitude: 139.8853, // データベースの値
  elevation: 3.0, // データベースの値（標高3m）
  description: '',
  accessInfo: '',
  warnings: '',
  createdAt: new Date(),
  updatedAt: new Date()
};

// 地球上の2点間の方位角を計算（球面三角法）
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  
  return (θ * 180 / Math.PI + 360) % 360;
}

// 富士山頂への視線角度（仰角）を計算
function calculateElevationAngle(observerLat: number, observerLon: number, observerElevation: number): number {
  const R = 6371000; // 地球の半径 (m)
  
  // 観測地点と富士山の直線距離を計算
  const lat1 = observerLat * Math.PI / 180;
  const lat2 = FUJI_COORDINATES.latitude * Math.PI / 180;
  const Δlat = (FUJI_COORDINATES.latitude - observerLat) * Math.PI / 180;
  const Δlon = (FUJI_COORDINATES.longitude - observerLon) * Math.PI / 180;
  
  const a = Math.sin(Δlat/2) * Math.sin(Δlat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(Δlon/2) * Math.sin(Δlon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // 高度差
  const heightDiff = FUJI_COORDINATES.elevation - observerElevation;
  
  // 視線角度（仰角）
  const elevationAngle = Math.atan2(heightDiff, distance) * 180 / Math.PI;
  
  return elevationAngle;
}

async function testDiamondFuji() {
  console.log('=== 舞浜海岸からのダイヤモンド富士テスト ===\n');
  
  console.log('観測地点情報:');
  console.log(`  名称: ${MAIHAMA_COAST.name}`);
  console.log(`  緯度: ${MAIHAMA_COAST.latitude}°`);
  console.log(`  経度: ${MAIHAMA_COAST.longitude}°`);
  console.log(`  標高: ${MAIHAMA_COAST.elevation}m\n`);
  
  console.log('富士山情報:');
  console.log(`  緯度: ${FUJI_COORDINATES.latitude}°`);
  console.log(`  経度: ${FUJI_COORDINATES.longitude}°`);
  console.log(`  標高: ${FUJI_COORDINATES.elevation}m\n`);
  
  // 富士山への方位角を計算
  const bearingToFuji = calculateBearing(
    MAIHAMA_COAST.latitude,
    MAIHAMA_COAST.longitude,
    FUJI_COORDINATES.latitude,
    FUJI_COORDINATES.longitude
  );
  
  console.log(`舞浜海岸から富士山への方位角: ${bearingToFuji.toFixed(2)}°`);
  
  // 富士山頂への視線角度を計算
  const elevationAngle = calculateElevationAngle(
    MAIHAMA_COAST.latitude,
    MAIHAMA_COAST.longitude,
    MAIHAMA_COAST.elevation
  );
  
  console.log(`舞浜海岸から富士山頂への視線角度（仰角）: ${elevationAngle.toFixed(2)}°\n`);
  
  // AstronomicalCalculatorを使用して計算
  const calculator = new AstronomicalCalculatorImpl();
  
  // 2025年2月18日を設定（JST）
  const targetDate = new Date('2025-02-18T00:00:00+09:00');
  console.log(`対象日: ${timeUtils.formatDateString(targetDate)}\n`);
  
  // ダイヤモンド富士の計算
  console.log('=== ダイヤモンド富士の計算結果 ===');
  
  const events = calculator.calculateDiamondFuji(targetDate, [MAIHAMA_COAST]);
  
  // 結果を表示
  const sunsetEvents = events.filter(e => e.subType === 'setting');
  const sunriseEvents = events.filter(e => e.subType === 'rising');
  
  if (sunsetEvents.length > 0) {
    console.log('\n沈むダイヤモンド富士:');
    sunsetEvents.forEach(event => {
      const timeStr = timeUtils.formatJstTime(event.time);
      console.log(`  時刻: ${timeUtils.formatDateString(event.time)} ${timeStr}`);
      console.log(`  太陽の方位角: ${event.azimuth.toFixed(2)}°`);
      console.log(`  太陽の高度: ${event.elevation?.toFixed(2) ?? 'N/A'}°`);
      console.log(`  富士山への方位角との差: ${Math.abs(event.azimuth - bearingToFuji).toFixed(2)}°`);
    });
  } else {
    console.log('\n沈むダイヤモンド富士: なし');
  }
  
  if (sunriseEvents.length > 0) {
    console.log('\n昇るダイヤモンド富士:');
    sunriseEvents.forEach(event => {
      const timeStr = timeUtils.formatJstTime(event.time);
      console.log(`  時刻: ${timeUtils.formatDateString(event.time)} ${timeStr}`);
      console.log(`  太陽の方位角: ${event.azimuth.toFixed(2)}°`);
      console.log(`  太陽の高度: ${event.elevation?.toFixed(2) ?? 'N/A'}°`);
      console.log(`  富士山への方位角との差: ${Math.abs(event.azimuth - bearingToFuji).toFixed(2)}°`);
    });
  } else {
    console.log('\n昇るダイヤモンド富士: なし');
  }
  
  // デバッグ用：日没前後の太陽の位置を詳細に追跡
  console.log('\n=== 日没前後の太陽の位置（17:00-18:00 JST） ===');
  console.log('時刻(JST) | 方位角 | 高度 | 富士山との差');
  console.log('---------|--------|------|-------------');
  
  for (let hour = 17; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const checkTime = new Date(`2025-02-18T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+09:00`);
      const sunPosition = calculator.getSunPosition(checkTime, MAIHAMA_COAST.latitude, MAIHAMA_COAST.longitude, MAIHAMA_COAST.elevation);
      
      const azimuthDiff = Math.abs(sunPosition.azimuth - bearingToFuji);
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      console.log(
        `${timeStr}    | ${sunPosition.azimuth.toFixed(1).padStart(6)}° | ${sunPosition.elevation.toFixed(1).padStart(5)}° | ${azimuthDiff.toFixed(1).padStart(11)}°`
      );
    }
  }
}

// 実行
testDiamondFuji().catch(console.error);