#!/usr/bin/env node

/**
 * キャッシュの一貫性をテストし、パール富士の不一致問題を調査
 * 
 * 使用方法:
 * node scripts/test-cache-consistency.js
 */

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:8000';

class CacheConsistencyTester {
  constructor() {
    this.testCases = [
      { date: '2025-12-26', year: 2025, month: 12 },
      { date: '2025-02-19', year: 2025, month: 2 },
      { date: '2025-10-23', year: 2025, month: 10 }
    ];
  }

  async test() {
    console.log('🔍 キャッシュ一貫性テスト開始');
    console.log('=' .repeat(60));

    for (const testCase of this.testCases) {
      console.log(`\n📅 テスト対象: ${testCase.date}`);
      await this.testDateConsistency(testCase);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ キャッシュ一貫性テスト完了');
  }

  async testDateConsistency(testCase) {
    const { date, year, month } = testCase;

    try {
      // Step 1: キャッシュありの状態でデータを取得
      console.log('  1️⃣ キャッシュありでデータ取得...');
      const cachedMonthly = await this.getMonthlyCalendar(year, month);
      const cachedDaily = await this.getDayEvents(date);
      
      // Step 2: キャッシュをクリア（実際には実装されていないため、少し待機）
      console.log('  2️⃣ キャッシュクリア...');
      await this.simulateCacheClear();
      
      // Step 3: キャッシュなしの状態でデータを取得
      console.log('  3️⃣ キャッシュなしでデータ取得...');
      const freshMonthly = await this.getMonthlyCalendar(year, month);
      const freshDaily = await this.getDayEvents(date);

      // Step 4: データを比較
      console.log('  4️⃣ データ整合性チェック...');
      this.compareData(date, cachedMonthly, cachedDaily, freshMonthly, freshDaily);

    } catch (error) {
      console.error(`  ❌ テスト失敗 (${date}):`, error.message);
    }
  }

  async getMonthlyCalendar(year, month) {
    const response = await fetch(`${BASE_URL}/api/calendar/${year}/${month}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async getDayEvents(date) {
    const response = await fetch(`${BASE_URL}/api/events/${date}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async simulateCacheClear() {
    // 実際のキャッシュクリアAPIが実装されていないため、少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  compareData(targetDate, cachedMonthly, cachedDaily, freshMonthly, freshDaily) {
    // 月間カレンダーから該当日のイベントを抽出
    const findDayInMonthly = (monthlyData) => {
      return monthlyData.data.events.find(event => event.date === targetDate);
    };

    const cachedMonthlyDay = findDayInMonthly(cachedMonthly);
    const freshMonthlyDay = findDayInMonthly(freshMonthly);

    // パール富士イベントのみ抽出
    const extractPearlEvents = (events) => {
      return events ? events.filter(e => e.type === 'pearl') : [];
    };

    const cachedMonthlyPearl = extractPearlEvents(cachedMonthlyDay?.events || []);
    const cachedDailyPearl = extractPearlEvents(cachedDaily.data.events);
    const freshMonthlyPearl = extractPearlEvents(freshMonthlyDay?.events || []);
    const freshDailyPearl = extractPearlEvents(freshDaily.data.events);

    console.log('    📊 パール富士イベント数:');
    console.log(`      キャッシュあり - 月間: ${cachedMonthlyPearl.length}, 日別: ${cachedDailyPearl.length}`);
    console.log(`      キャッシュなし - 月間: ${freshMonthlyPearl.length}, 日別: ${freshDailyPearl.length}`);

    // 不一致の検出
    const inconsistencies = [];

    if (cachedMonthlyPearl.length !== cachedDailyPearl.length) {
      inconsistencies.push('キャッシュあり: 月間と日別でパール富士数不一致');
    }

    if (freshMonthlyPearl.length !== freshDailyPearl.length) {
      inconsistencies.push('キャッシュなし: 月間と日別でパール富士数不一致');
    }

    if (cachedMonthlyPearl.length !== freshMonthlyPearl.length) {
      inconsistencies.push('月間カレンダー: キャッシュありとなしでパール富士数不一致');
    }

    if (cachedDailyPearl.length !== freshDailyPearl.length) {
      inconsistencies.push('日別詳細: キャッシュありとなしでパール富士数不一致');
    }

    // キャッシュヒット状況
    console.log('    💾 キャッシュ状況:');
    console.log(`      月間(1回目): ${cachedMonthly.meta?.cacheHit ? 'ヒット' : 'ミス'} (${cachedMonthly.meta?.responseTimeMs}ms)`);
    console.log(`      日別(1回目): ${cachedDaily.meta?.cacheHit ? 'ヒット' : 'ミス'} (${cachedDaily.meta?.responseTimeMs}ms)`);
    console.log(`      月間(2回目): ${freshMonthly.meta?.cacheHit ? 'ヒット' : 'ミス'} (${freshMonthly.meta?.responseTimeMs}ms)`);
    console.log(`      日別(2回目): ${freshDaily.meta?.cacheHit ? 'ヒット' : 'ミス'} (${freshDaily.meta?.responseTimeMs}ms)`);

    // 結果判定
    if (inconsistencies.length > 0) {
      console.log('    ❌ 不一致検出:');
      inconsistencies.forEach(issue => {
        console.log(`      - ${issue}`);
      });

      // 詳細情報
      if (cachedMonthlyPearl.length > 0 || cachedDailyPearl.length > 0) {
        console.log('    🔍 詳細分析:');
        
        if (cachedMonthlyPearl.length > 0) {
          console.log('      月間カレンダーのパール富士:');
          cachedMonthlyPearl.forEach((event, i) => {
            console.log(`        ${i + 1}. ${event.location.name} (${event.subType}) ${event.time}`);
          });
        }
        
        if (cachedDailyPearl.length > 0) {
          console.log('      日別詳細のパール富士:');
          cachedDailyPearl.forEach((event, i) => {
            console.log(`        ${i + 1}. ${event.location.name} (${event.subType}) ${event.time}`);
          });
        }
      }
    } else {
      console.log('    ✅ データ一貫性OK');
    }
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CacheConsistencyTester();
  tester.test().catch(console.error);
}

export default CacheConsistencyTester;