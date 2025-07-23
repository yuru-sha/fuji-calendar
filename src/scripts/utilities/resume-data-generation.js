#!/usr/bin/env node

/**
 * 中断された初回データ生成の再開スクリプト
 * 既存データを確認して、不足している月から再開
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

async function checkExistingData(year) {
  console.log('📊 既存データをチェック中...');
  
  try {
    const { PrismaClientManager } = require('../src/server/database/prisma');
    const prisma = PrismaClientManager.getInstance();
    
    // 2週間ごとのデータ数をチェック（より細かく状況把握）
    const periodData = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 0);
    let currentPeriodStart = new Date(startDate);
    let periodCount = 0;
    
    while (currentPeriodStart < endDate) {
      periodCount++;
      
      // 2週間後の日付を計算
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 13); // 14日間
      if (currentPeriodEnd > endDate) {
        currentPeriodEnd.setTime(endDate.getTime());
      }
      
      const count = await prisma.celestialOrbitData.count({
        where: {
          date: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd
          }
        }
      });
      
      // 期間の日数を計算
      const daysDiff = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const expectedCount = daysDiff * 288; // 1日288データポイント
      
      periodData.push({
        period: periodCount,
        startDate: currentPeriodStart.toISOString().split('T')[0],
        endDate: currentPeriodEnd.toISOString().split('T')[0],
        count,
        expected: expectedCount,
        complete: count >= expectedCount * 0.9 // 90%以上あれば完了とみなす
      });
      
      // 次の期間へ
      currentPeriodStart = new Date(currentPeriodEnd);
      currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
    }
    
    return periodData;
  } catch (error) {
    console.error('❌ データチェック中にエラー:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔄 中断されたデータ生成の再開スクリプト');
  console.log('================================================');
  
  const startTime = Date.now();
  const year = 2025;
  
  try {
    // データベース接続テスト
    console.log('🔍 データベース接続をテスト中...');
    const { PrismaClientManager } = require('../src/server/database/prisma');
    const isConnected = await PrismaClientManager.testConnection();
    if (!isConnected) {
      throw new Error('データベースに接続できません');
    }
    console.log('✅ データベース接続OK');
    
    // 既存データの確認
    const periodData = await checkExistingData(year);
    
    console.log('\n📈 2週間期間別データ状況:');
    console.log('期間 | 期間 | データ数 | 状態');
    console.log('----|------|---------|------');
    
    let completedPeriods = 0;
    for (const data of periodData) {
      const status = data.complete ? '✅ 完了' : '❌ 未完了';
      const percentage = data.count > 0 ? Math.round((data.count / data.expected) * 100) : 0;
      const periodRange = `${data.startDate}～${data.endDate}`;
      console.log(`${data.period.toString().padStart(2)} | ${periodRange} | ${data.count.toLocaleString().padStart(8)} | ${status} (${percentage}%)`);
      if (data.complete) completedPeriods++;
    }
    
    console.log(`\n📊 進捗サマリー: ${completedPeriods}/${periodData.length}期間完了 (${Math.round(completedPeriods/periodData.length*100)}%)`);
    
    if (completedPeriods === periodData.length) {
      console.log('🎉 全ての期間のデータが既に存在します！');
      console.log('次のステップ（Stage 2: 候補抽出）に進みますか？');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Stage 2に進む場合は y を入力してください (y/N): ', async (answer) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('\n🚀 Stage 2以降を実行します...');
            rl.close();
            
            // Stage 2以降のみ実行
            const result = await fujiSystemOrchestrator.executeFromStage2(year);
            
            if (result.success) {
              console.log('\n🎉 残りのステージが完了しました！');
            } else {
              console.error('\n❌ Stage 2以降の実行に失敗しました');
            }
          } else {
            console.log('処理をキャンセルしました');
            rl.close();
          }
          resolve();
        });
      });
    } else {
      console.log(`\n🚀 不足している期間のデータを生成します (${periodData.length - completedPeriods}期間)`);
      
      // 完全な年間計算を実行（既存データは保持される）
      const result = await fujiSystemOrchestrator.executeFullYearlyCalculation(year);
      
      const totalTime = Date.now() - startTime;
      const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
      
      if (result.success) {
        console.log('\n🎉 データ生成の再開が完了しました！');
        console.log(`⏱️  実行時間: ${totalMinutes}分`);
      } else {
        console.error('\n❌ データ生成の再開に失敗しました');
        console.error(`実行時間: ${totalMinutes}分`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const totalMinutes = Math.round(totalTime / 1000 / 60 * 10) / 10;
    
    console.error('\n💥 再開処理中にエラーが発生しました');
    console.error(`実行時間: ${totalMinutes}分`);
    console.error('エラー詳細:', error.message);
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

// 実行確認
console.log('⚠️  この処理は既存データをチェックして、不足分のみ生成します');
console.log('💡 初回実行から再開する場合は、このスクリプトをお使いください');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('続行しますか？ (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    rl.close();
    main();
  } else {
    console.log('処理をキャンセルしました');
    rl.close();
  }
});