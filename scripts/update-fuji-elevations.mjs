#!/usr/bin/env node

/**
 * 既存の全地点の fuji_elevation を一括更新するスクリプト
 * 
 * 使用方法:
 * node scripts/update-fuji-elevations.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 富士山の座標
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

/**
 * 地球曲率・大気屈折を考慮した富士山頂への仰角計算
 */
function calculateElevationToFuji(location) {
  const R = 6371000; // 地球半径（メートル）
  
  // 地点間の距離計算（ハバーサイン公式）
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = toRadians(FUJI_COORDINATES.latitude - location.latitude);
  const deltaLng = toRadians(FUJI_COORDINATES.longitude - location.longitude);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // 高度差
  const heightDiff = FUJI_COORDINATES.elevation - location.elevation;

  // 地球曲率による補正
  const curvatureCorrection = (distance * distance) / (2 * R);
  const correctedHeightDiff = heightDiff - curvatureCorrection;

  // 仰角計算（ラジアン）
  const elevationRad = Math.atan(correctedHeightDiff / distance);
  
  // 大気屈折補正（経験的補正）
  const refractionCorrection = 0.13 * (distance / 1000); // km 当たり 0.13 度の補正
  const elevationDeg = toDegrees(elevationRad) + refractionCorrection;

  return elevationDeg;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

async function updateFujiElevations() {
  try {
    console.log('🚀 富士山仰角一括更新スクリプト開始');

    // 全ての地点を取得
    const locations = await prisma.location.findMany();
    console.log(`📍 ${locations.length} 件の地点を取得しました`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const location of locations) {
      try {
        // 富士山への仰角を計算
        const fujiElevation = calculateElevationToFuji(location);
        
        // データベースを更新
        await prisma.location.update({
          where: { id: location.id },
          data: { fujiElevation: fujiElevation }
        });

        console.log(`✅ ${location.name} (ID: ${location.id}): ${fujiElevation.toFixed(4)}°`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ ${location.name} (ID: ${location.id}): エラー - ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 更新結果:');
    console.log(`   成功: ${updatedCount} 件`);
    console.log(`   失敗: ${errorCount} 件`);
    console.log(`   合計: ${locations.length} 件`);

    if (updatedCount > 0) {
      console.log('\n🎉 富士山仰角の一括更新が完了しました！');
    } else {
      console.log('\n⚠️  更新された地点がありません');
    }

  } catch (error) {
    console.error('💥 スクリプト実行エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
updateFujiElevations().catch((error) => {
  console.error('💥 予期しないエラー:', error);
  process.exit(1);
});