#!/usr/bin/env node

// Astronomy Engineの動作をテストするスクリプト
import * as Astronomy from 'astronomy-engine';

console.log('Astronomy Engine のテストを開始します...');

// 富士山の座標
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776 // meters
};

// 観測者オブジェクト作成
try {
  const observer = new Astronomy.Observer(
    FUJI_COORDINATES.latitude, 
    FUJI_COORDINATES.longitude, 
    FUJI_COORDINATES.elevation
  );
  console.log('✅ 観測者オブジェクト作成成功:', observer);
} catch (error) {
  console.error('❌ 観測者オブジェクト作成失敗:', error.message);
}

// 日付設定
const testDate = new Date('2025-01-01T12:00:00Z');
console.log('\nテスト日時:', testDate.toISOString());

// 太陽位置の計算
try {
  console.log('\n=== 太陽位置計算テスト ===');
  
  // 方法1: SunPositionから直接地平座標を計算
  const observer = new Astronomy.Observer(
    FUJI_COORDINATES.latitude, 
    FUJI_COORDINATES.longitude, 
    FUJI_COORDINATES.elevation
  );
  
  // 太陽ベクトルを取得
  const sunVector = Astronomy.GeoVector(Astronomy.Body.Sun, testDate, false);
  console.log('太陽ベクトル:', sunVector);
  
  // 地平座標に変換
  const sunHorizontal = Astronomy.HorizonFromVector(testDate, observer, sunVector);
  console.log('太陽の地平座標:', sunHorizontal);
  
  if (sunHorizontal && typeof sunHorizontal.azimuth === 'number' && typeof sunHorizontal.altitude === 'number') {
    console.log('✅ 太陽の方位角・高度取得成功');
    console.log(`方位角: ${sunHorizontal.azimuth}度, 高度: ${sunHorizontal.altitude}度`);
  } else {
    console.error('❌ 太陽の地平座標が不正:', sunHorizontal);
  }
  
  // 方法2: Equator経由で確認
  console.log('\n=== 赤道座標経由での太陽位置計算 ===');
  const sunEquatorial = Astronomy.Equator(Astronomy.Body.Sun, testDate, observer, false, true);
  console.log('太陽の赤道座標:', sunEquatorial);
  
  if (sunEquatorial && typeof sunEquatorial.ra === 'number' && typeof sunEquatorial.dec === 'number') {
    console.log('✅ 太陽の赤経・赤緯取得成功');
    console.log(`赤経: ${sunEquatorial.ra}h, 赤緯: ${sunEquatorial.dec}度`);
    
    const sunHorizontal2 = Astronomy.Horizon(testDate, observer, sunEquatorial.ra, sunEquatorial.dec, 'normal');
    console.log('太陽の地平座標(方法2):', sunHorizontal2);
  }
  
} catch (error) {
  console.error('❌ 太陽位置計算エラー:', error.message);
  console.error('スタックトレース:', error.stack);
}

// 利用可能なメソッドを確認
console.log('\n=== Astronomy Engine で利用可能なメソッド ===');
const methods = Object.getOwnPropertyNames(Astronomy).filter(name => typeof Astronomy[name] === 'function');
console.log('利用可能な関数:', methods.sort());

console.log('\n=== バージョン情報 ===');
try {
  console.log('Astronomy Engine:', Astronomy);
} catch (error) {
  console.error('バージョン取得エラー:', error.message);
}