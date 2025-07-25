import { AstronomicalCalculatorImpl } from './src/server/services/AstronomicalCalculator';

function testPearlCalculation() {
  const calculator = new AstronomicalCalculatorImpl();
  
  // 富津岬付近の地点
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
  
  console.log('=== パール富士計算のデバッグ ===');
  console.log('地点:', futtsuLocation.name);
  
  // 富士山までの基本情報
  const fujiAzimuth = calculator.calculateAzimuthToFuji(futtsuLocation);
  const fujiDistance = calculator.getDistanceToFuji(futtsuLocation);
  
  console.log('富士山方位角:', fujiAzimuth.toFixed(2), '度');
  console.log('富士山距離:', (fujiDistance / 1000).toFixed(1), 'km');
  
  // 富士山頂の仰角を計算
  const baseTargetElevation = calculator['calculateElevationToFujiSummit'](futtsuLocation);
  console.log('富士山頂への基本仰角:', baseTargetElevation.toFixed(3), '度');
  
  // 月の角直径
  const moonAngularDiameter = 0.518; // AstronomicalCalculatorの値
  console.log('月の角直径:', moonAngularDiameter.toFixed(3), '度');
  
  // 月の下部が山頂に来る場合の月中心の目標仰角
  const moonCenterTargetElevation = baseTargetElevation + moonAngularDiameter / 2;
  console.log('月中心の目標仰角:', moonCenterTargetElevation.toFixed(3), '度');
  console.log('  (月下部位置:', (moonCenterTargetElevation - moonAngularDiameter / 2).toFixed(3), '度)');
  
  // 8月13日の実際の月位置を確認
  const testDate = new Date(2025, 7, 13, 8, 36, 0); // 8月13日 8:36
  const moonPos = calculator.getMoonPosition(testDate, futtsuLocation.latitude, futtsuLocation.longitude, futtsuLocation.elevation);
  
  console.log('\n=== 8月13日 8:36の実際の月位置 ===');
  console.log('月の方位角:', moonPos.azimuth.toFixed(2), '度');
  console.log('月の仰角:', moonPos.elevation.toFixed(3), '度');
  console.log('月の下部の仰角:', (moonPos.elevation - moonAngularDiameter / 2).toFixed(3), '度');
  
  console.log('\n=== 比較 ===');
  console.log('富士山頂仰角:', baseTargetElevation.toFixed(3), '度');
  console.log('月下部仰角:', (moonPos.elevation - moonAngularDiameter / 2).toFixed(3), '度');
  console.log('差異:', ((moonPos.elevation - moonAngularDiameter / 2) - baseTargetElevation).toFixed(3), '度');
  console.log('差異(分角):', (((moonPos.elevation - moonAngularDiameter / 2) - baseTargetElevation) * 60).toFixed(1), '分');
  
  // 8:39でも確認
  console.log('\n=== 8月13日 8:39の月位置 ===');
  const testDate2 = new Date(2025, 7, 13, 8, 39, 0);
  const moonPos2 = calculator.getMoonPosition(testDate2, futtsuLocation.latitude, futtsuLocation.longitude, futtsuLocation.elevation);
  console.log('月の仰角:', moonPos2.elevation.toFixed(3), '度');
  console.log('月の下部の仰角:', (moonPos2.elevation - moonAngularDiameter / 2).toFixed(3), '度');
  console.log('富士山頂との差異:', ((moonPos2.elevation - moonAngularDiameter / 2) - baseTargetElevation).toFixed(3), '度');
  console.log('差異(分角):', (((moonPos2.elevation - moonAngularDiameter / 2) - baseTargetElevation) * 60).toFixed(1), '分');
}

testPearlCalculation();