#!/usr/bin/env node

// 2024 年 12 月と 2025 年 1 月のデータを再生成して年境界の問題を修正

import { EventCacheService } from './apps/server/src/services/EventCacheService';

async function regenerateYearBoundary() {
  const eventCacheService = new EventCacheService();
  
  try {
    console.log('=== 年境界データ再生成開始 ===');
    
    console.log('\n1. 2024 年 12 月の再生成...');
    const result2024Dec = await eventCacheService.generateMonthlyCache(2024, 12);
    console.log(`2024 年 12 月: ${result2024Dec.success ? '成功' : '失敗'}, ${result2024Dec.totalEvents}件, ${result2024Dec.timeMs}ms`);
    if (!result2024Dec.success && result2024Dec.error) {
      console.error('2024 年 12 月エラー:', result2024Dec.error.message);
    }
    
    console.log('\n2. 2025 年 1 月の再生成...');
    const result2025Jan = await eventCacheService.generateMonthlyCache(2025, 1);
    console.log(`2025 年 1 月: ${result2025Jan.success ? '成功' : '失敗'}, ${result2025Jan.totalEvents}件, ${result2025Jan.timeMs}ms`);
    if (!result2025Jan.success && result2025Jan.error) {
      console.error('2025 年 1 月エラー:', result2025Jan.error.message);
    }
    
    console.log('\n=== 修正後の確認 ===');
    
    // 再生成後のデータ確認用のスクリプトを実行
    console.log('修正されたかの確認は debug-missing-dates-simple.js を実行してください');
    
  } catch (error) {
    console.error('処理中にエラー:', error);
  }
}

regenerateYearBoundary().catch(console.error);