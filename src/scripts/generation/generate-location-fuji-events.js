#!/usr/bin/env node

/**
 * 地点別富士現象イベント生成スクリプト（PostgreSQL + Prisma版）
 * celestial_orbit_dataとlocationsからlocation_fuji_eventsを生成
 */

const path = require('path');
require('ts-node').register({
  project: path.join(__dirname, '../../../tsconfig.server.json')
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n⚠️  処理を中断しています...');
  try {
    const { PrismaClientManager } = require('../../server/database/prisma');
    await PrismaClientManager.disconnect();
    console.log('✅ データベース接続をクリーンアップしました');
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error.message);
  }
  process.exit(0);
});

const { prisma } = require('../../server/database/prisma');
const { astronomicalCalculator } = require('../../server/services/AstronomicalCalculatorAstronomyEngine');

// 共通定数をインポート
const { FUJI_COORDINATES } = require('../../shared/types');

/**
 * 2点間の方位角を計算（球面三角法）
 */
function calculateAzimuth(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;
  
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let azimuth = toDeg(Math.atan2(y, x));
  return (azimuth + 360) % 360; // 0-360度に正規化
}

/**
 * 2点間の距離を計算（Haversine formula）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球の半径（km）
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * 地点に富士山データを設定（高精度版）
 */
async function setupLocationFujiData() {
  console.log('🗻 地点に富士山データを設定中（高精度計算）...');
  
  const locations = await prisma.location.findMany({
    where: {
      OR: [
        { fujiAzimuth: null },
        { fujiElevation: null },
        { fujiDistance: null }
      ]
    }
  });
  
  for (const location of locations) {
    // AstronomicalCalculatorAstronomyEngineの高精度計算を使用
    const fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(location);
    const fujiElevation = astronomicalCalculator.calculateElevationToFuji(location);
    const fujiDistance = astronomicalCalculator.calculateDistanceToFuji(location);
    
    await prisma.location.update({
      where: { id: location.id },
      data: {
        fujiAzimuth: Math.round(fujiAzimuth * 1000) / 1000,
        fujiElevation: Math.round(fujiElevation * 1000) / 1000,
        fujiDistance: Math.round(fujiDistance * 100) / 100
      }
    });
    
    console.log(`  ✅ ${location.name}: 方位角${fujiAzimuth.toFixed(3)}°, 仰角${fujiElevation.toFixed(6)}°, 距離${fujiDistance.toFixed(1)}km`);
  }
}

/**
 * ダイヤモンド富士の判定（高精度版）
 */
function isDiamondFuji(celestialData, fujiAzimuth, fujiElevation, fujiDistance) {
  if (celestialData.celestialType !== 'sun') return false;
  
  // 時間帯の確認（朝：4-10時、夕：14-20時）
  const hour = celestialData.hour;
  const isMorning = (hour >= 4 && hour < 10);
  const isEvening = (hour >= 14 && hour < 20);
  
  if (!isMorning && !isEvening) return false;
  
  // 距離に応じた方位角許容範囲（高精度版と同じ）
  let azimuthTolerance;
  if (fujiDistance <= 50) azimuthTolerance = 0.25;
  else if (fujiDistance <= 100) azimuthTolerance = 0.4;
  else azimuthTolerance = 0.6;
  
  // 方位角の差を計算
  const azimuthDiff = Math.abs(celestialData.azimuth - fujiAzimuth);
  const normalizedAzimuthDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  
  // 仰角の差を計算（±0.25度以内）
  const elevationDiff = Math.abs(celestialData.elevation - fujiElevation);
  
  return normalizedAzimuthDiff <= azimuthTolerance && elevationDiff <= 0.25;
}

/**
 * パール富士の判定（高精度版）
 */
function isPearlFuji(celestialData, fujiAzimuth, fujiElevation, fujiDistance) {
  if (celestialData.celestialType !== 'moon') return false;
  
  // 距離に応じたパール富士用方位角許容範囲（ダイヤモンド富士の3-4倍）
  let azimuthTolerance;
  if (fujiDistance <= 50) azimuthTolerance = 1.0;
  else if (fujiDistance <= 100) azimuthTolerance = 2.0;
  else azimuthTolerance = 3.0;
  
  // 方位角の差を計算
  const azimuthDiff = Math.abs(celestialData.azimuth - fujiAzimuth);
  const normalizedAzimuthDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  
  // 仰角の差を計算（±4.0度以内）
  const elevationDiff = Math.abs(celestialData.elevation - fujiElevation);
  
  // 満月に近い（照明度70%以上）ほど良い
  return normalizedAzimuthDiff <= azimuthTolerance && 
         elevationDiff <= 4.0 &&
         celestialData.moonIllumination >= 0.7;
}

/**
 * 品質評価
 */
function evaluateQuality(azimuthDiff, elevationDiff, celestialType) {
  const totalDiff = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);
  
  if (celestialType === 'sun') {
    if (totalDiff <= 0.5) return 'perfect';
    if (totalDiff <= 1.0) return 'excellent';
    if (totalDiff <= 1.5) return 'good';
    return 'fair';
  } else { // moon
    if (totalDiff <= 1.0) return 'perfect';
    if (totalDiff <= 2.0) return 'excellent';
    if (totalDiff <= 3.0) return 'good';
    return 'fair';
  }
}

async function main() {
  console.log('🚀 地点別富士現象イベント生成開始 - 2025年データ');
  console.log('📊 celestial_orbit_dataとlocationsからlocation_fuji_eventsを生成');
  console.log('⏰ 処理時間: 10-15分程度かかります');
  console.log('');
  
  const startTime = Date.now();
  const year = 2025;
  
  try {
    // データベース接続テスト
    console.log('🔍 データベース接続をテスト中...');
    const { PrismaClientManager } = require('../../server/database/prisma');
    const isConnected = await PrismaClientManager.testConnection();
    if (!isConnected) {
      throw new Error('データベースに接続できません');
    }
    console.log('✅ データベース接続OK');
    
    console.log(`⏰ ${new Date().toLocaleString('ja-JP')} - 計算開始`);
    
    // Step 1: 地点の富士山データを設定
    await setupLocationFujiData();
    
    // Step 2: 既存の現象データをクリア
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    console.log('\n🗑️  既存データをクリア中...');
    const deleteResult = await prisma.locationFujiEvent.deleteMany({
      where: {
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });
    console.log(`✅ ${deleteResult.count}件の既存データを削除しました`);
    
    // Step 3: 地点を取得
    console.log('\n📍 撮影地点を取得中...');
    const locations = await prisma.location.findMany({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      }
    });
    
    console.log(`✅ ${locations.length}地点を取得しました`);
    
    let totalEvents = 0;
    let diamondEvents = 0;
    let pearlEvents = 0;
    
    // Step 4: 各地点で富士現象を計算
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      console.log(`\n📍 地点 ${i + 1}/${locations.length}: ${location.name}`);
      console.log(`   富士山 - 方位角: ${location.fujiAzimuth}°, 仰角: ${location.fujiElevation}°, 距離: ${location.fujiDistance}km`);
      
      // 天体データを取得（方位角・仰角が近いもの）
      const celestialData = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: startDate, lt: endDate },
          azimuth: {
            gte: location.fujiAzimuth - 2.5,
            lte: location.fujiAzimuth + 2.5
          },
          elevation: {
            gte: location.fujiElevation - 2.0,
            lte: location.fujiElevation + 2.0
          },
          visible: true
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });
      
      console.log(`   天体データ候補: ${celestialData.length}件`);
      
      let locationDiamondCount = 0;
      let locationPearlCount = 0;
      
      // 各天体データをチェック
      for (const data of celestialData) {
        let eventType = null;
        let isEvent = false;
        
        // ダイヤモンド富士判定
        if (isDiamondFuji(data, location.fujiAzimuth, location.fujiElevation, location.fujiDistance)) {
          eventType = data.hour < 12 ? 'diamond_sunrise' : 'diamond_sunset';
          isEvent = true;
          locationDiamondCount++;
          diamondEvents++;
        }
        // パール富士判定
        else if (isPearlFuji(data, location.fujiAzimuth, location.fujiElevation, location.fujiDistance)) {
          eventType = 'pearl_moonrise'; // 簡易実装
          isEvent = true;
          locationPearlCount++;
          pearlEvents++;
        }
        
        if (isEvent) {
          const azimuthDiff = Math.abs(data.azimuth - location.fujiAzimuth);
          const elevationDiff = Math.abs(data.elevation - location.fujiElevation);
          const qualityScore = Math.max(0, 1.0 - (azimuthDiff * 0.3 + elevationDiff * 0.4));
          const accuracy = evaluateQuality(azimuthDiff, elevationDiff, data.celestialType);
          
          await prisma.locationFujiEvent.create({
            data: {
              locationId: location.id,
              eventDate: data.date,
              eventTime: data.time,
              eventType,
              azimuth: data.azimuth,
              altitude: data.elevation,
              qualityScore,
              accuracy,
              moonPhase: data.moonPhase,
              moonIllumination: data.moonIllumination,
              calculationYear: year
            }
          });
          
          totalEvents++;
        }
      }
      
      console.log(`   ✅ ダイヤモンド富士: ${locationDiamondCount}件, パール富士: ${locationPearlCount}件`);
    }
    
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.log('\n🎉 地点別富士現象イベント生成完了！');
    console.log('═══════════════════════════════════════');
    console.log(`年度: ${year}`);
    console.log(`総実行時間: ${totalMinutes}分`);
    console.log(`対象地点数: ${locations.length}地点`);
    console.log(`最終イベント数: ${totalEvents.toLocaleString()}件`);
    console.log(`ダイヤモンド富士: ${diamondEvents.toLocaleString()}件`);
    console.log(`パール富士: ${pearlEvents.toLocaleString()}件`);
    console.log(`平均イベント数/地点: ${Math.round(totalEvents / locations.length)}件`);
    console.log('\n✅ location_fuji_eventsテーブルの準備が完了しました！');
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.error('\n💥 地点別富士現象イベント生成中にエラーが発生しました');
    console.error(`実行時間: ${totalMinutes}分`);
    console.error('エラー詳細:', error.message);
    console.error('スタックトレース:');
    console.error(error.stack);
    
    process.exit(1);
  } finally {
    // 最終クリーンアップ
    try {
      const { PrismaClientManager } = require('../../server/database/prisma');
      await PrismaClientManager.disconnect();
    } catch (error) {
      // 無視
    }
  }
}

console.log('⚠️  注意: この処理は10-15分程度時間がかかります');
console.log('📊 celestial_orbit_dataとlocationsからlocation_fuji_eventsを直接生成します');
console.log('🗻 地点の富士山データも自動設定されます');
console.log('🚀 自動開始...');
console.log('');

main();