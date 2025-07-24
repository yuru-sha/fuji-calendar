#!/usr/bin/env node

/**
 * 天体軌道データ生成スクリプト
 * celestial_orbit_dataテーブルに2025年の太陽・月データを生成
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

const { CelestialOrbitDataService } = require('../../server/services/CelestialOrbitDataService');

async function main() {
  console.log('🚀 天体軌道データ生成開始 - 2025年1分間隔データ');
  console.log('📊 約210,000件の天体データを生成します');
  console.log('⏰ 処理時間: 10-20分程度かかります');
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
    
    const service = new CelestialOrbitDataService();
    
    console.log(`⏰ ${new Date().toLocaleString('ja-JP')} - 計算開始`);
    
    // 年間データ生成
    const result = await service.generateYearlyData(year);
    
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    if (result.success) {
      console.log('\n🎉 天体軌道データ生成完了！');
      console.log('═══════════════════════════════════════');
      console.log(`年度: ${year}`);
      console.log(`総実行時間: ${totalMinutes}分`);
      console.log(`総データ数: ${result.totalDataPoints.toLocaleString()}件`);
      console.log('\n✅ celestial_orbit_dataテーブルの準備が完了しました！');
    } else {
      console.error('\n❌ 天体軌道データ生成に失敗しました');
      console.error(`実行時間: ${totalMinutes}分`);
      process.exit(1);
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.error('\n💥 天体軌道データ生成中にエラーが発生しました');
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

console.log('⚠️  注意: この処理は10-20分程度時間がかかります');
console.log('📊 約210,000件の天体データを計算します');
console.log('🚀 自動開始...');
console.log('');

main();