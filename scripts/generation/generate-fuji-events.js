#!/usr/bin/env node

/**
 * ダイヤモンド富士イベント生成スクリプト
 * location_fuji_eventsテーブルにダイヤモンド富士データを生成
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

const { astronomicalDataService } = require('../../server/services/AstronomicalDataService');
const { locationFujiEventService } = require('../../server/services/LocationFujiEventService');

async function main() {
  console.log('🚀 富士現象イベント生成開始 - 2025年データ');
  console.log('📊 天体データから富士現象候補を抽出し、地点とマッチングします');
  console.log('⏰ 処理時間: 5-10分程度かかります');
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
    
    // Step 1: 富士現象候補抽出（ダイヤモンド＋パール）
    console.log('\n📊 Step 1: 富士現象候補抽出');
    const candidateResult = await astronomicalDataService.generateYearlyCandidates(year);
    
    if (!candidateResult.success) {
      throw new Error('富士現象候補抽出に失敗しました');
    }
    
    console.log(`✅ 候補抽出完了: ${candidateResult.totalCandidates.toLocaleString()}件`);
    console.log(`   ダイヤモンド富士: ${candidateResult.diamondCandidates.toLocaleString()}件`);
    console.log(`   パール富士: ${candidateResult.pearlCandidates.toLocaleString()}件`);
    
    // Step 2: 地点とのマッチング
    console.log('\n📍 Step 2: 撮影地点とのマッチング');
    const matchingResult = await locationFujiEventService.matchAllLocations(year);
    
    if (!matchingResult.success) {
      throw new Error('地点マッチングに失敗しました');
    }
    
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.log('\n🎉 富士現象イベント生成完了！');
    console.log('═══════════════════════════════════════');
    console.log(`年度: ${year}`);
    console.log(`総実行時間: ${totalMinutes}分`);
    console.log(`候補数: ${candidateResult.totalCandidates.toLocaleString()}件`);
    console.log(`最終イベント数: ${matchingResult.totalEvents.toLocaleString()}件`);
    console.log(`ダイヤモンド富士: ${matchingResult.diamondEvents.toLocaleString()}件`);
    console.log(`パール富士: ${matchingResult.pearlEvents.toLocaleString()}件`);
    console.log(`マッチング率: ${Math.round(matchingResult.totalEvents / candidateResult.totalCandidates * 100)}%`);
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

console.log('⚠️  注意: この処理は5-10分程度時間がかかります');
console.log('📊 天体データから富士現象候補を抽出・マッチングします');
console.log('🚀 自動開始...');
console.log('');

main();