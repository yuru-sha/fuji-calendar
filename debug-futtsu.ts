import { AstronomicalCalculatorImpl } from './src/server/services/AstronomicalCalculator';
import { FUJI_COORDINATES } from './src/shared/types';

function testFuttsuDistance() {
  const calculator = new AstronomicalCalculatorImpl();
  
  // 富津岬付近の実際のデータ
  const futtsuLocation = {
    id: 6,
    name: '房総半島・富津岬付近',
    prefecture: '千葉県',
    latitude: 35.313326,
    longitude: 139.785738,
    elevation: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('富士山座標:', FUJI_COORDINATES);
  console.log('富津岬付近:', { 
    latitude: futtsuLocation.latitude, 
    longitude: futtsuLocation.longitude,
    elevation: futtsuLocation.elevation
  });
  
  const distance = calculator.getDistanceToFuji(futtsuLocation);
  console.log('計算された距離:', distance, 'メートル');
  console.log('計算された距離:', (distance / 1000).toFixed(2), 'km');
  
  // 手動でHaversine公式を検証
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const lat1 = toRadians(futtsuLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - futtsuLocation.longitude);
  
  console.log('緯度差 (度):', FUJI_COORDINATES.latitude - futtsuLocation.latitude);
  console.log('経度差 (度):', FUJI_COORDINATES.longitude - futtsuLocation.longitude);
  console.log('緯度差 (ラジアン):', deltaLat);
  console.log('経度差 (ラジアン):', deltaLon);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  console.log('a値:', a);
  console.log('Math.sqrt(a):', Math.sqrt(a));
  console.log('Math.sqrt(1-a):', Math.sqrt(1 - a));
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  console.log('c値:', c);
  
  const earthRadius = 6371000; // meters
  const manualDistance = earthRadius * c;
  console.log('手動計算距離:', manualDistance, 'メートル');
  console.log('手動計算距離:', (manualDistance / 1000).toFixed(2), 'km');
  
  // 実際のデータベース値と比較
  console.log('\nデータベース上の値: 96134.71 km');
  console.log('実際の計算値:', (manualDistance / 1000).toFixed(2), 'km');
  console.log('差異:', (96134.71 - manualDistance / 1000).toFixed(2), 'km');
}

testFuttsuDistance();