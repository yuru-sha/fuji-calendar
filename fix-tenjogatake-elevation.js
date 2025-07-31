#!/usr/bin/env node

// スーパー地形の仰角 3.61 度に合わせて天子ヶ岳データを修正

const { PrismaClient } = require('@prisma/client');

const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

// 現在の DB 座標
const CURRENT_TENJOGATAKE = {
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319  // 実際の標高
};

// 地球曲率補正ありの仰角から距離を逆算
function calculateDistanceFromElevation(heightDiff, targetElevationDeg) {
  const EARTH_RADIUS = 6371000;
  const targetElevationRad = targetElevationDeg * Math.PI / 180;
  
  // 二次方程式を解く: tan(仰角) = (高度差 - d²/(2*R)) / d
  const a = 1 / (2 * EARTH_RADIUS);
  const b = Math.tan(targetElevationRad);
  const c = -heightDiff;
  
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  
  const d1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const d2 = (-b - Math.sqrt(discriminant)) / (2 * a);
  
  return d1 > 0 ? d1 : d2;
}

// 現在の距離計算
function calculateCurrentDistance() {
  const EARTH_RADIUS = 6371000;
  const lat1Rad = CURRENT_TENJOGATAKE.latitude * Math.PI / 180;
  const lat2Rad = FUJI_COORDINATES.latitude * Math.PI / 180;
  const deltaLatRad = (FUJI_COORDINATES.latitude - CURRENT_TENJOGATAKE.latitude) * Math.PI / 180;
  const deltaLonRad = (FUJI_COORDINATES.longitude - CURRENT_TENJOGATAKE.longitude) * Math.PI / 180;
  
  const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

// 新しい正しい富士山頂仰角を計算
function calculateCorrectFujiElevation(distance, tenjogatakeElevation, fujiElevation) {
  const EARTH_RADIUS = 6371000;
  const heightDiff = fujiElevation - tenjogatakeElevation;
  const earthCurvatureCorrection = (distance * distance) / (2 * EARTH_RADIUS);
  const apparentHeightDiff = heightDiff - earthCurvatureCorrection;
  const elevationRad = Math.atan(apparentHeightDiff / distance);
  return elevationRad * 180 / Math.PI;
}

async function fixTenjogatakeData() {
  console.log('=== 天子ヶ岳仰角データ修正 ===');
  
  const currentDistance = calculateCurrentDistance();
  const currentHeightDiff = FUJI_COORDINATES.elevation - CURRENT_TENJOGATAKE.elevation;
  
  console.log('現在の計算:');
  console.log(`距離: ${(currentDistance / 1000).toFixed(1)}km`);
  console.log(`高度差: ${currentHeightDiff}m`);
  console.log(`現在の DB 仰角: 7.82° (間違い)`);
  console.log(`スーパー地形仰角: 3.61° (正しい)`);
  
  // 仰角 3.61 度に必要な距離を逆算
  const requiredDistance = calculateDistanceFromElevation(currentHeightDiff, 3.61);
  
  if (requiredDistance) {
    console.log(`\n 仰角 3.61 度に必要な距離: ${(requiredDistance / 1000).toFixed(1)}km`);
    console.log(`現在の距離との差: ${((requiredDistance - currentDistance) / 1000).toFixed(1)}km`);
    
    // 可能性 1: 座標が間違っている
    if (Math.abs(requiredDistance - currentDistance) > 1000) { // 1km 以上の差
      console.log('\n❌ 座標が大きく間違っている可能性があります');
      console.log('推奨対応: 実際の天子ヶ岳の座標を再確認');
    } else {
      console.log('\n✅ 座標は概ね正しい、微調整で対応可能');
    }
  }
  
  // 可能性 2: 標高データを調整
  console.log('\n=== 解決策の検討 ===');
  
  // 距離を固定して標高を調整する場合
  const requiredElevation = FUJI_COORDINATES.elevation - (Math.tan(3.61 * Math.PI / 180) * currentDistance + (currentDistance * currentDistance) / (2 * 6371000));
  console.log(`解決策 1: 天子ヶ岳標高を ${requiredElevation.toFixed(0)}m に変更`);
  
  if (Math.abs(requiredElevation - CURRENT_TENJOGATAKE.elevation) < 100) {
    console.log('  → 現実的な調整範囲内');
  } else {
    console.log('  → 非現実的な調整（実標高と大きく異なる）');
  }
  
  // 実際のデータベース修正
  console.log('\n=== データベース修正案 ===');
  
  // 方法 1: 現在の座標のまま、fujiElevation フィールドのみ修正
  console.log('方法 1: fujiElevation フィールドを 3.61 度に修正');
  console.log(`UPDATE locations SET fuji_elevation = 3.61 WHERE id = 6;`);
  
  // 方法 2: より正確な計算で再計算
  console.log('方法 2: 距離と標高を再測定して正確なデータに修正');
  
  const prisma = new PrismaClient();
  
  try {
    // 現在のデータを表示
    const currentData = await prisma.location.findUnique({
      where: { id: 6 }
    });
    
    if (currentData) {
      console.log('\n 現在の DB データ:');
      console.log(`fujiElevation: ${currentData.fujiElevation}°`);
      console.log(`fujiDistance: ${currentData.fujiDistance ? (currentData.fujiDistance / 1000).toFixed(1) + 'km' : '未設定'}`);
      
      // データ修正を実行
      console.log('\n✅ fujiElevation を 3.61 度に修正中...');
      
      await prisma.location.update({
        where: { id: 6 },
        data: {
          fujiElevation: 3.61
        }
      });
      
      console.log('✅ 修正完了！');
      
      // 修正後のデータを確認
      const updatedData = await prisma.location.findUnique({
        where: { id: 6 }
      });
      
      console.log('\n 修正後のデータ:');
      console.log(`fujiElevation: ${updatedData.fujiElevation}°`);
      
    }
  } catch (error) {
    console.error('データベース操作エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTenjogatakeData();