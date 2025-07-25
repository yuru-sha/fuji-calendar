/**
 * キューシステムの動作テスト
 * 基本的な機能をテストしてシステムが正常に動作することを確認する
 */

import { queueService } from './src/server/services/QueueService.js';
import { batchCalculationService } from './src/server/services/BatchCalculationService.js';

async function testQueueSystem() {
  console.log('🚀 キューシステム動作テスト開始...\n');

  try {
    // 1. BatchCalculationServiceの健康チェック
    console.log('1. BatchCalculationService健康チェック');
    const healthCheck = await batchCalculationService.healthCheck();
    console.log('健康状態:', healthCheck.healthy ? '✅ 正常' : '❌ 異常');
    if (!healthCheck.healthy) {
      console.log('推奨事項:', healthCheck.recommendations);
    }
    console.log('');

    // 2. 計算統計の取得テスト
    console.log('2. 計算統計取得テスト');
    try {
      const stats = await batchCalculationService.getCalculationStats();
      console.log('総地点数:', stats.totalLocations);
      console.log('対象年:', stats.currentYear);
      console.log('システム負荷:', stats.systemLoad);
      console.log('月別進捗:', stats.monthlyProgress.slice(0, 3).map(m => 
        `${m.month}月: ${m.completed ? '完了' : '未完了'} (${m.eventCount}件)`
      ).join(', '));
    } catch (error) {
      console.log('統計取得エラー:', error instanceof Error ? error.message : 'Unknown error');
    }
    console.log('');

    // 3. キューの状態確認
    console.log('3. キューの状態確認');
    try {
      const queueStats = await queueService.getQueueStats();
      console.log('地点計算キュー:', queueStats.location);
      console.log('月間計算キュー:', queueStats.monthly);
      console.log('日別計算キュー:', queueStats.daily);
      console.log('過去データキュー:', queueStats.historical);
    } catch (error) {
      console.log('キュー状態取得エラー:', error instanceof Error ? error.message : 'Unknown error');
    }
    console.log('');

    // 4. テスト用ジョブの投入（地点ID 1が存在する場合のみ）
    console.log('4. テストジョブ投入');
    try {
      const currentYear = new Date().getFullYear();
      
      // 月間計算ジョブをテスト投入
      const jobId = await queueService.scheduleMonthlyCalculation(
        1, // テスト用地点ID
        currentYear,
        new Date().getMonth() + 1, // 現在の月
        'low', // 低優先度
        'test-queue-system'
      );
      
      console.log('✅ テストジョブを投入しました');
      console.log('ジョブID:', jobId);
      console.log('地点ID: 1');
      console.log('対象:', `${currentYear}年${new Date().getMonth() + 1}月`);
      
      // 5秒後にジョブの進捗を確認
      setTimeout(async () => {
        try {
          const progress = await queueService.getJobProgress(jobId, 'monthly');
          if (progress) {
            console.log('\n5. ジョブ進捗確認');
            console.log('ジョブ状態:', progress.state);
            console.log('進捗:', progress.progress);
            console.log('作成時刻:', new Date(progress.createdAt).toLocaleString('ja-JP'));
            if (progress.processedAt) {
              console.log('処理開始時刻:', new Date(progress.processedAt).toLocaleString('ja-JP'));
            }
            if (progress.finishedAt) {
              console.log('完了時刻:', new Date(progress.finishedAt).toLocaleString('ja-JP'));
            }
            if (progress.failedReason) {
              console.log('失敗理由:', progress.failedReason);
            }
          } else {
            console.log('\n5. ジョブが見つかりませんでした');
          }
        } catch (error) {
          console.log('\n5. ジョブ進捗確認エラー:', error instanceof Error ? error.message : 'Unknown error');
        }
        
        // テスト完了
        console.log('\n🎉 キューシステムテスト完了');
        console.log('ワーカープロセスを起動してジョブを処理してください:');
        console.log('npm run dev:worker');
        
        // 終了処理
        await queueService.shutdown();
        process.exit(0);
      }, 5000);
      
    } catch (error) {
      console.log('❌ テストジョブ投入エラー:', error instanceof Error ? error.message : 'Unknown error');
    }

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  testQueueSystem().catch(console.error);
}

export default testQueueSystem;