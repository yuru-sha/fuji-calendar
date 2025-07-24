#!/usr/bin/env node

/**
 * 富士現象イベント直接生成スクリプト
 * 中間テーブルを使わずにcelestial_orbit_dataから直接location_fuji_eventsを生成
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

async function main() {
  console.log('🚀 富士現象イベント直接生成開始 - 2025年データ');
  console.log('📊 celestial_orbit_dataから直接location_fuji_eventsを生成します');
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
    
    // 既存の現象データをクリア
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    console.log('🗑️  既存データをクリア中...');
    const deleteResult = await prisma.locationFujiEvent.deleteMany({
      where: {
        eventDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });
    console.log(`✅ ${deleteResult.count}件の既存データを削除しました`);
    
    // 富士山データが設定された全地点を取得
    console.log('📍 撮影地点を取得中...');
    const locations = await prisma.location.findMany({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      }
    });
    
    if (locations.length === 0) {
      throw new Error('富士山データが設定された地点が見つかりません');
    }
    
    console.log(`✅ ${locations.length}地点を取得しました`);
    
    let totalEvents = 0;
    let diamondEvents = 0;
    let pearlEvents = 0;
    
    // 各地点で富士現象を計算
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      console.log(`\n📍 地点 ${i + 1}/${locations.length}: ${location.name}`);
      
      // ダイヤモンド富士候補を取得（太陽データ、方位角が近い）
      const diamondCandidates = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: startDate, lt: endDate },
          celestialType: 'sun',
          azimuth: {
            gte: location.fujiAzimuth - 1.5,
            lte: location.fujiAzimuth + 1.5
          },
          elevation: {
            gte: location.fujiElevation - 1.0,
            lte: location.fujiElevation + 1.0
          },
          visible: true
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });
      
      // パール富士候補を取得（月データ、方位角が近い、満月前後）
      const pearlCandidates = await prisma.celestialOrbitData.findMany({
        where: {
          date: { gte: startDate, lt: endDate },
          celestialType: 'moon',
          azimuth: {
            gte: location.fujiAzimuth - 2.0,
            lte: location.fujiAzimuth + 2.0
          },
          elevation: {
            gte: location.fujiElevation - 1.5,
            lte: location.fujiElevation + 1.5
          },
          moonIllumination: { gte: 0.7 },
          visible: true
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });
      
      console.log(`   ダイヤモンド富士候補: ${diamondCandidates.length}件`);
      console.log(`   パール富士候補: ${pearlCandidates.length}件`);
      
      // ダイヤモンド富士イベントを作成
      for (const candidate of diamondCandidates) {
        const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
        const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
        const qualityScore = Math.max(0, 1.0 - (azimuthDiff * 0.5 + elevationDiff * 0.3));
        
        let accuracy = 'poor';
        if (azimuthDiff <= 0.3 && elevationDiff <= 0.2) accuracy = 'perfect';
        else if (azimuthDiff <= 0.5 && elevationDiff <= 0.3) accuracy = 'excellent';
        else if (azimuthDiff <= 1.0 && elevationDiff <= 0.5) accuracy = 'good';
        else if (azimuthDiff <= 1.5 && elevationDiff <= 1.0) accuracy = 'fair';
        
        const eventType = candidate.hour < 12 ? 'diamond_sunrise' : 'diamond_sunset';
        
        await prisma.locationFujiEvent.create({
          data: {
            locationId: location.id,
            eventDate: candidate.date,
            eventTime: candidate.time,
            eventType,
            azimuth: candidate.azimuth,
            altitude: candidate.elevation,
            qualityScore,
            accuracy,
            calculationYear: year
          }
        });
        
        totalEvents++;
        diamondEvents++;
      }
      
      // パール富士イベントを作成
      for (const candidate of pearlCandidates) {
        const azimuthDiff = Math.abs(candidate.azimuth - location.fujiAzimuth);
        const elevationDiff = Math.abs(candidate.elevation - location.fujiElevation);
        const qualityScore = Math.max(0, 1.0 - (azimuthDiff * 0.3 + elevationDiff * 0.2));
        
        let accuracy = 'poor';
        if (azimuthDiff <= 0.5 && elevationDiff <= 0.3) accuracy = 'perfect';
        else if (azimuthDiff <= 1.0 && elevationDiff <= 0.5) accuracy = 'excellent';
        else if (azimuthDiff <= 1.5 && elevationDiff <= 0.8) accuracy = 'good';
        else if (azimuthDiff <= 2.0 && elevationDiff <= 1.5) accuracy = 'fair';
        
        // 月の出入り判定（高度変化の傾向で判定）
        const eventType = 'pearl_moonrise'; // 簡易実装
        
        await prisma.locationFujiEvent.create({
          data: {
            locationId: location.id,
            eventDate: candidate.date,
            eventTime: candidate.time,
            eventType,
            azimuth: candidate.azimuth,
            altitude: candidate.elevation,
            qualityScore,
            accuracy,
            moonPhase: candidate.moonPhase,
            moonIllumination: candidate.moonIllumination,
            calculationYear: year
          }
        });
        
        totalEvents++;
        pearlEvents++;
      }
      
      console.log(`   ✅ イベント生成完了: ${diamondCandidates.length + pearlCandidates.length}件`);
    }
    
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.log('\n🎉 富士現象イベント生成完了！');
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
    
    console.error('\n💥 富士現象イベント生成中にエラーが発生しました');
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
console.log('📊 celestial_orbit_dataから直接富士現象候補を抽出・生成します');
console.log('🚀 自動開始...');
console.log('');

main();