import { AstronomicalCalculatorImpl } from './src/server/services/AstronomicalCalculator';
import { FUJI_COORDINATES } from './src/shared/types';

function testDistanceCalculation() {
  const calculator = new AstronomicalCalculatorImpl();
  
  // テスト用の地点
  const testLocation = {
    id: 1,
    name: 'テスト地点',
    prefecture: '神奈川県',
    latitude: 35.5,     // 富士山から約数十km
    longitude: 139.5,   // 富士山から約数十km
    elevation: 100,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('富士山座標:', FUJI_COORDINATES);
  console.log('テスト地点:', { 
    latitude: testLocation.latitude, 
    longitude: testLocation.longitude,
    elevation: testLocation.elevation
  });
  
  const distance = calculator.getDistanceToFuji(testLocation);
  console.log('計算された距離:', distance, 'メートル');
  console.log('計算された距離:', (distance / 1000).toFixed(2), 'km');
  
  // 手動でHaversine公式を検証
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const lat1 = toRadians(testLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - testLocation.longitude);
  
  console.log('緯度差 (度):', FUJI_COORDINATES.latitude - testLocation.latitude);
  console.log('経度差 (度):', FUJI_COORDINATES.longitude - testLocation.longitude);
  console.log('緯度差 (ラジアン):', deltaLat);
  console.log('経度差 (ラジアン):', deltaLon);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  console.log('a値:', a);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  console.log('c値:', c);
  
  const earthRadius = 6371000; // meters
  const manualDistance = earthRadius * c;
  console.log('手動計算距離:', manualDistance, 'メートル');
  console.log('手動計算距離:', (manualDistance / 1000).toFixed(2), 'km');
}

testDistanceCalculation();