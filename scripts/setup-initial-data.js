#!/usr/bin/env node

/**
 * 初期データセットアップスクリプト（初期インストール時用）
 * 
 * このスクリプトは以下を実行します：
 * 1. 地点データの富士山座標計算を修正
 * 2. 現在年の天体軌道データを生成
 * 3. LocationFujiEventServiceでイベントマッチング実行
 * 
 * 使用方法:
 *   node scripts/setup-initial-data.js [year]
 */

const { celestialOrbitDataService } = require('../dist/server/services/CelestialOrbitDataService');
const { locationFujiEventService } = require('../dist/server/services/LocationFujiEventService');
const { PrismaClient } = require('@prisma/client');

// 富士山座標
const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

// 計算ユーティリティ
function toRadians(degrees) { return degrees * (Math.PI / 180); }
function toDegrees(radians) { return radians * (180 / Math.PI); }

function calculateBearingToFuji(fromLocation) {
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function calculateDistanceToFuji(fromLocation) {
  const earthRadius = 6371;
  const lat1 = toRadians(fromLocation.latitude);
  const lat2 = toRadians(FUJI_COORDINATES.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_COORDINATES.longitude - fromLocation.longitude);
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function calculateElevationToFuji(fromLocation) {
  const observerEyeLevel = 1.7;
  const earthRadius = 6371000;
  const refractionCoefficient = 0.13;
  const distanceKm = calculateDistanceToFuji(fromLocation);
  const distanceM = distanceKm * 1000;
  const heightDiff = FUJI_COORDINATES.elevation - fromLocation.elevation - observerEyeLevel;
  const earthCurvature = (distanceM * distanceM) / (2 * earthRadius);
  const correctedHeight = heightDiff - earthCurvature * (1 - refractionCoefficient);
  return toDegrees(Math.atan(correctedHeight / distanceM));
}

async function setupInitialData() {
  const args = process.argv.slice(2);
  const year = args.length > 0 ? parseInt(args[0]) : new Date().getFullYear();

  if (isNaN(year) || year < 2000 || year > 2100) {
    console.error('❌ エラー: 年は2000-2100の範囲で指定してください');
    process.exit(1);
  }

  console.log('🚀 富士カレンダー初期データセットアップ開始');
  console.log(`📅 対象年: ${year}年`);
  console.log(`⏰ 開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  const prisma = new PrismaClient();
  const overallStartTime = Date.now();

  try {
    // ステップ1: 地点データの富士山計算修正
    console.log('📍 ステップ1: 地点データの富士山座標計算を修正中...');
    const locations = await prisma.location.findMany({ orderBy: { id: 'asc' } });
    
    for (const location of locations) {
      const fujiAzimuth = calculateBearingToFuji(location);
      const fujiElevation = calculateElevationToFuji(location);
      const fujiDistance = calculateDistanceToFuji(location) * 1000;

      await prisma.location.update({
        where: { id: location.id },
        data: { fujiAzimuth, fujiElevation, fujiDistance }
      });

      console.log(`  ✅ ${location.name}: 方位角${fujiAzimuth.toFixed(1)}°, 距離${(fujiDistance/1000).toFixed(1)}km`);
    }
    console.log(`📍 地点データ修正完了: ${locations.length}件\n`);

    // ステップ2: 天体軌道データ生成
    console.log(`🌟 ステップ2: ${year}年の天体軌道データ生成中...`);
    const celestialStartTime = Date.now();
    const celestialResult = await celestialOrbitDataService.generateYearlyData(year);
    const celestialTime = Date.now() - celestialStartTime;

    if (!celestialResult.success) {
      throw new Error('天体軌道データ生成に失敗しました');
    }

    console.log(`🌟 天体軌道データ生成完了: ${celestialResult.totalDataPoints.toLocaleString()}件 (${Math.floor(celestialTime/60000)}分${Math.floor((celestialTime%60000)/1000)}秒)\n`);

    // ステップ3: イベントマッチング実行
    console.log('🎯 ステップ3: LocationFujiEventマッチング実行中...');
    const matchingStartTime = Date.now();
    const matchingResult = await locationFujiEventService.matchAllLocations(year);
    const matchingTime = Date.now() - matchingStartTime;

    if (!matchingResult.success) {
      throw new Error('イベントマッチングに失敗しました');
    }

    console.log(`🎯 イベントマッチング完了: ${matchingResult.totalEvents}件 (${Math.floor(matchingTime/1000)}秒)\n`);

    // 完了レポート
    const totalTime = Date.now() - overallStartTime;
    const totalMinutes = Math.floor(totalTime / 60000);
    const totalSeconds = Math.floor((totalTime % 60000) / 1000);

    console.log('🎉 初期データセットアップ完了！');
    console.log('');
    console.log('📊 セットアップ結果:');
    console.log(`  📍 地点データ: ${locations.length}件修正`);
    console.log(`  🌟 天体データ: ${celestialResult.totalDataPoints.toLocaleString()}件生成`);
    console.log(`  🎯 富士イベント: ${matchingResult.totalEvents}件マッチング`);
    console.log(`    - ダイヤモンド富士: ${matchingResult.diamondEvents}件`);
    console.log(`    - パール富士: ${matchingResult.pearlEvents}件`);
    console.log(`  ⏱️  総処理時間: ${totalMinutes}分${totalSeconds}秒`);
    console.log(`  ⏰ 完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('');
    console.log('✅ 富士カレンダーシステムの準備が完了しました！');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 初期データセットアップ中にエラーが発生しました:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n⚠️  処理が中断されました');
  process.exit(130);
});

// メイン実行
setupInitialData().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error);
  process.exit(1);
});