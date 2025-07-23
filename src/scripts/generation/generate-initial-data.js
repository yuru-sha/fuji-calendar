#!/usr/bin/env node

/**
 * 初回データ生成スクリプト
 * 2025年の富士現象データを生成（3段階処理）
 */

const path = require('path');
require('ts-node').register({
  project: path.join(__dirname, '../tsconfig.server.json')
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n⚠️  処理を中断しています...');
  try {
    const { PrismaClientManager } = require('../src/server/database/prisma');
    await PrismaClientManager.disconnect();
    console.log('✅ データベース接続をクリーンアップしました');
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error.message);
  }
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  未処理のPromise拒否:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('💥 予期しないエラー:', error);
  process.exit(1);
});

const { fujiSystemOrchestrator } = require('../src/server/services/FujiSystemOrchestrator');

async function main() {
  console.log('🚀 初回データ生成開始 - 2025年富士現象データ');
  console.log('📊 3段階処理: 天体データ → 候補抽出 → 地点マッチング');
  
  const startTime = Date.now();
  const year = 2025;
  
  try {
    console.log(`\n⏰ ${new Date().toLocaleString('ja-JP')} - 計算開始`);
    
    // データベース接続テスト
    console.log('🔍 データベース接続をテスト中...');
    const { PrismaClientManager } = require('../src/server/database/prisma');
    const isConnected = await PrismaClientManager.testConnection();
    if (!isConnected) {
      throw new Error('データベースに接続できません');
    }
    console.log('✅ データベース接続OK');
    
    // メモリ使用量の監視開始
    const memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      const rss = Math.round(usage.rss / 1024 / 1024);
      const heapUsed = Math.round(usage.heapUsed / 1024 / 1024);
      console.log(`📊 メモリ使用量: RSS ${rss}MB, Heap ${heapUsed}MB`);
      
      // メモリ使用量が1GBを超えた場合の警告
      if (rss > 1024) {
        console.warn('⚠️  メモリ使用量が1GBを超えています');
      }
    }, 30000); // 30秒間隔
    
    // 年間富士現象計算の完全実行
    const result = await fujiSystemOrchestrator.executeFullYearlyCalculation(year);
    
    // メモリ監視停止
    clearInterval(memoryMonitor);
    
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    if (result.success) {
      console.log('\n🎉 初回データ生成完了！');
      console.log('═══════════════════════════════════════');
      
      console.log(`\n📊 実行結果サマリー:`);
      console.log(`   年度: ${year}`);
      console.log(`   総実行時間: ${totalMinutes}分`);
      console.log(`   総イベント数: ${result.finalStats?.totalEvents || 0}件`);
      console.log(`   地点カバレッジ: ${result.finalStats?.locationCount || 0}地点`);
      
      console.log(`\n⚡ 各段階の実行時間:`);
      console.log(`   Stage 1 (天体データ): ${Math.round(result.stages.celestialData.timeMs / 1000)}秒`);
      console.log(`   Stage 2 (候補抽出): ${Math.round(result.stages.candidates.timeMs / 1000)}秒`);
      console.log(`   Stage 3 (地点マッチング): ${Math.round(result.stages.matching.timeMs / 1000)}秒`);
      
      console.log(`\n📈 データ生成量:`);
      console.log(`   天体軌道データ: ${result.stages.celestialData.dataPoints.toLocaleString()}件`);
      console.log(`   富士現象候補: ${result.stages.candidates.totalCandidates.toLocaleString()}件`);
      console.log(`   - ダイヤモンド富士: ${result.stages.candidates.diamondCandidates.toLocaleString()}件`);
      console.log(`   - パール富士: ${result.stages.candidates.pearlCandidates.toLocaleString()}件`);
      console.log(`   最終イベント: ${result.stages.matching.totalEvents.toLocaleString()}件`);
      console.log(`   - ダイヤモンド富士: ${result.stages.matching.diamondEvents.toLocaleString()}件`);
      console.log(`   - パール富士: ${result.stages.matching.pearlEvents.toLocaleString()}件`);
      
      if (result.finalStats) {
        console.log(`\n🎯 精度分布:`);
        const accuracy = result.finalStats.accuracyDistribution;
        if (accuracy) {
          console.log(`   Perfect: ${accuracy.perfect || 0}件`);
          console.log(`   Excellent: ${accuracy.excellent || 0}件`);
          console.log(`   Good: ${accuracy.good || 0}件`);
          console.log(`   Fair: ${accuracy.fair || 0}件`);
        }
        
        console.log(`\n📍 平均イベント数/地点: ${result.finalStats.avgEventsPerLocation || 0}件`);
      }
      
      console.log('\n✅ データベースの準備が完了しました！');
      console.log('🌐 カレンダーAPIが高速データ取得可能になりました');
      
    } else {
      console.error('\n❌ 初回データ生成に失敗しました');
      console.error(`実行時間: ${totalMinutes}分`);
      process.exit(1);
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.error('\n💥 初回データ生成中にエラーが発生しました');
    console.error(`実行時間: ${totalMinutes}分`);
    console.error('エラー詳細:', error.message);
    
    // 詳細なエラー情報を出力
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    if (error.errno) {
      console.error('システムエラー番号:', error.errno);
    }
    if (error.syscall) {
      console.error('システムコール:', error.syscall);
    }
    
    console.error('\nスタックトレース:');
    console.error(error.stack);
    
    // データベース接続のクリーンアップ
    try {
      const { PrismaClientManager } = require('../src/server/database/prisma');
      await PrismaClientManager.disconnect();
      console.log('✅ データベース接続をクリーンアップしました');
    } catch (cleanupError) {
      console.error('❌ クリーンアップエラー:', cleanupError.message);
    }
    
    process.exit(1);
  } finally {
    // 最終クリーンアップ
    try {
      const { PrismaClientManager } = require('../src/server/database/prisma');
      await PrismaClientManager.disconnect();
    } catch (error) {
      // 無視
    }
  }
}

// スクリプト実行時の確認
console.log('⚠️  注意: この処理は10-20分程度時間がかかります');
console.log('📊 約210,000件の天体データと数千件の富士現象を計算します');
console.log('🚀 自動開始...');
console.log('');

// 自動実行（入力待ちを削除）
main();