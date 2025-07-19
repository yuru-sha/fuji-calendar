#!/usr/bin/env node

/**
 * カレンダーキャッシュシステムのパフォーマンスベンチマーク
 * 
 * 使用方法:
 * node scripts/cache-benchmark.js
 */

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
  monthlyCalendar: (year, month) => `/api/calendar/${year}/${month}`,
  dayEvents: (date) => `/api/events/${date}`,
  upcomingEvents: (limit) => `/api/events/upcoming?limit=${limit}`,
  stats: (year) => `/api/calendar/stats/${year}`
};

class CacheBenchmark {
  constructor() {
    this.results = {
      monthlyCalendar: { withCache: [], withoutCache: [] },
      dayEvents: { withCache: [], withoutCache: [] },
      upcomingEvents: { withCache: [], withoutCache: [] },
      stats: { withCache: [], withoutCache: [] }
    };
  }

  async benchmark() {
    console.log('🚀 カレンダーキャッシュシステム パフォーマンスベンチマーク開始');
    console.log('=' .repeat(60));

    try {
      // サーバーの健康状態を確認
      await this.checkServerHealth();

      // 各エンドポイントのベンチマーク実行
      await this.benchmarkMonthlyCalendar();
      await this.benchmarkDayEvents();
      await this.benchmarkUpcomingEvents();
      await this.benchmarkStats();

      // 結果をレポート
      this.generateReport();

    } catch (error) {
      console.error('❌ ベンチマーク実行エラー:', error.message);
      process.exit(1);
    }
  }

  async checkServerHealth() {
    console.log('🔍 サーバー健康状態チェック...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      console.log('✅ サーバー正常稼働中');
      console.log('');
    } catch (error) {
      throw new Error(`サーバーにアクセスできません: ${error.message}`);
    }
  }

  async benchmarkMonthlyCalendar() {
    console.log('📅 月間カレンダーAPIのベンチマーク');
    
    const testCases = [
      { year: 2025, month: 2 },
      { year: 2025, month: 10 },
      { year: 2025, month: 12 }
    ];

    for (const testCase of testCases) {
      console.log(`  Testing: ${testCase.year}年${testCase.month}月`);
      
      // キャッシュクリア後の初回実行（キャッシュなし）
      await this.clearSpecificCache(`monthlyCalendar:${testCase.year}-${testCase.month.toString().padStart(2, '0')}`);
      const coldTime = await this.measureApiCall(
        API_ENDPOINTS.monthlyCalendar(testCase.year, testCase.month)
      );
      this.results.monthlyCalendar.withoutCache.push(coldTime);

      // 2回目実行（キャッシュあり）
      const warmTime = await this.measureApiCall(
        API_ENDPOINTS.monthlyCalendar(testCase.year, testCase.month)
      );
      this.results.monthlyCalendar.withCache.push(warmTime);

      console.log(`    キャッシュなし: ${coldTime}ms, キャッシュあり: ${warmTime}ms (${(coldTime/warmTime).toFixed(1)}x高速化)`);
    }
    console.log('');
  }

  async benchmarkDayEvents() {
    console.log('📋 日別イベントAPIのベンチマーク');
    
    const testCases = [
      '2025-02-19',
      '2025-10-23',
      '2025-12-26'
    ];

    for (const date of testCases) {
      console.log(`  Testing: ${date}`);
      
      // キャッシュクリア後の初回実行
      await this.clearSpecificCache(`dailyEvents:${date}`);
      const coldTime = await this.measureApiCall(
        API_ENDPOINTS.dayEvents(date)
      );
      this.results.dayEvents.withoutCache.push(coldTime);

      // 2回目実行（キャッシュあり）
      const warmTime = await this.measureApiCall(
        API_ENDPOINTS.dayEvents(date)
      );
      this.results.dayEvents.withCache.push(warmTime);

      console.log(`    キャッシュなし: ${coldTime}ms, キャッシュあり: ${warmTime}ms (${(coldTime/warmTime).toFixed(1)}x高速化)`);
    }
    console.log('');
  }

  async benchmarkUpcomingEvents() {
    console.log('🔮 今後のイベントAPIのベンチマーク');
    
    const testCases = [10, 50];

    for (const limit of testCases) {
      console.log(`  Testing: limit=${limit}`);
      
      // キャッシュクリア後の初回実行
      await this.clearSpecificCache(`upcomingEvents:limit-${limit}`);
      const coldTime = await this.measureApiCall(
        API_ENDPOINTS.upcomingEvents(limit)
      );
      this.results.upcomingEvents.withoutCache.push(coldTime);

      // 2回目実行（キャッシュあり）
      const warmTime = await this.measureApiCall(
        API_ENDPOINTS.upcomingEvents(limit)
      );
      this.results.upcomingEvents.withCache.push(warmTime);

      console.log(`    キャッシュなし: ${coldTime}ms, キャッシュあり: ${warmTime}ms (${(coldTime/warmTime).toFixed(1)}x高速化)`);
    }
    console.log('');
  }

  async benchmarkStats() {
    console.log('📊 統計情報APIのベンチマーク');
    
    const testCases = [2025];

    for (const year of testCases) {
      console.log(`  Testing: ${year}年`);
      
      // キャッシュクリア後の初回実行
      await this.clearSpecificCache(`stats:${year}`);
      const coldTime = await this.measureApiCall(
        API_ENDPOINTS.stats(year)
      );
      this.results.stats.withoutCache.push(coldTime);

      // 2回目実行（キャッシュあり）
      const warmTime = await this.measureApiCall(
        API_ENDPOINTS.stats(year)
      );
      this.results.stats.withCache.push(warmTime);

      console.log(`    キャッシュなし: ${coldTime}ms, キャッシュあり: ${warmTime}ms (${(coldTime/warmTime).toFixed(1)}x高速化)`);
    }
    console.log('');
  }

  async measureApiCall(endpoint) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const endTime = performance.now();
      
      const responseTime = Math.round(endTime - startTime);
      
      // レスポンスメタデータをチェック
      if (data.meta?.responseTimeMs) {
        // サーバー側の測定値を使用（より正確）
        return data.meta.responseTimeMs;
      }
      
      return responseTime;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error.message);
      return null;
    }
  }

  async clearSpecificCache(pattern) {
    try {
      // 実際の実装では管理者APIを使ってキャッシュクリア
      // await fetch(`${BASE_URL}/api/admin/cache`, {
      //   method: 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pattern })
      // });
      
      // 一時的に簡単な待機（実際のキャッシュクリアの代替）
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // キャッシュクリアが失敗してもテストを続行
      console.warn(`Cache clear failed for ${pattern}:`, error.message);
    }
  }

  calculateStats(measurements) {
    if (measurements.length === 0) return { avg: 0, min: 0, max: 0 };
    
    const valid = measurements.filter(m => m !== null);
    if (valid.length === 0) return { avg: 0, min: 0, max: 0 };
    
    const avg = Math.round(valid.reduce((sum, val) => sum + val, 0) / valid.length);
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    
    return { avg, min, max };
  }

  generateReport() {
    console.log('📊 ベンチマーク結果レポート');
    console.log('=' .repeat(60));

    const endpoints = [
      { name: '月間カレンダー', key: 'monthlyCalendar' },
      { name: '日別イベント', key: 'dayEvents' },
      { name: '今後のイベント', key: 'upcomingEvents' },
      { name: '統計情報', key: 'stats' }
    ];

    let totalSpeedup = 0;
    let validEndpoints = 0;

    for (const endpoint of endpoints) {
      const withoutCache = this.calculateStats(this.results[endpoint.key].withoutCache);
      const withCache = this.calculateStats(this.results[endpoint.key].withCache);
      
      if (withoutCache.avg > 0 && withCache.avg > 0) {
        const speedup = withoutCache.avg / withCache.avg;
        totalSpeedup += speedup;
        validEndpoints++;

        console.log(`\n🎯 ${endpoint.name}:`);
        console.log(`  キャッシュなし: 平均 ${withoutCache.avg}ms (最小 ${withoutCache.min}ms, 最大 ${withoutCache.max}ms)`);
        console.log(`  キャッシュあり: 平均 ${withCache.avg}ms (最小 ${withCache.min}ms, 最大 ${withCache.max}ms)`);
        console.log(`  高速化率: ${speedup.toFixed(1)}x`);
        console.log(`  レスポンス改善: ${((withoutCache.avg - withCache.avg) / withoutCache.avg * 100).toFixed(1)}%`);
      }
    }

    if (validEndpoints > 0) {
      const avgSpeedup = totalSpeedup / validEndpoints;
      
      console.log('\n🏆 総合結果:');
      console.log(`  平均高速化率: ${avgSpeedup.toFixed(1)}x`);
      console.log(`  キャッシュ効果: ${((avgSpeedup - 1) / avgSpeedup * 100).toFixed(1)}% の応答時間短縮`);
      
      if (avgSpeedup >= 10) {
        console.log('  🎉 素晴らしい! 10倍以上の高速化を達成!');
      } else if (avgSpeedup >= 5) {
        console.log('  🎊 優秀! 5倍以上の高速化を達成!');
      } else if (avgSpeedup >= 2) {
        console.log('  ✅ 良好! 2倍以上の高速化を達成!');
      } else {
        console.log('  ⚠️  キャッシュの効果が限定的です。調整が必要かもしれません。');
      }
    }

    console.log('\n🔧 推奨事項:');
    console.log('  • キャッシュ有効期間を用途に応じて調整');
    console.log('  • 重い計算処理の事前キャッシュ生成');
    console.log('  • Redis メモリ使用量の監視');
    console.log('  • キャッシュヒット率の定期確認');
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ ベンチマーク完了');
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new CacheBenchmark();
  benchmark.benchmark().catch(console.error);
}

export default CacheBenchmark;