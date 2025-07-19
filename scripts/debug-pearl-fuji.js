#!/usr/bin/env node

/**
 * パール富士のアイコン/詳細情報の不一致問題をデバッグ
 * 
 * 使用方法:
 * node scripts/debug-pearl-fuji.js [date]
 * 例: node scripts/debug-pearl-fuji.js 2025-12-26
 */

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:8000';

class PearlFujiDebugger {
  constructor() {
    this.testDate = process.argv[2] || '2025-12-26';
    this.year = parseInt(this.testDate.split('-')[0]);
    this.month = parseInt(this.testDate.split('-')[1]);
  }

  async debug() {
    console.log('🌙 パール富士アイコン/詳細情報の不一致デバッグ');
    console.log('=' .repeat(60));
    console.log(`対象日: ${this.testDate}`);
    console.log('');

    try {
      // 1. 月間カレンダーAPIで該当日のアイコン状態を確認
      await this.checkMonthlyCalendarIcon();
      
      // 2. 日別詳細APIで実際のイベント情報を確認
      await this.checkDayEventDetails();
      
      // 3. 両者の差分を分析
      await this.analyzeDiscrepancy();

    } catch (error) {
      console.error('❌ デバッグ実行エラー:', error.message);
    }
  }

  async checkMonthlyCalendarIcon() {
    console.log('📅 月間カレンダーAPIでのアイコン確認');
    
    try {
      const response = await fetch(`${BASE_URL}/api/calendar/${this.year}/${this.month}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // 該当日のイベントを検索
      const targetEvent = data.data.events.find(event => event.date === this.testDate);
      
      if (targetEvent) {
        console.log(`✅ ${this.testDate}のカレンダーイベント発見:`);
        console.log(`  イベントタイプ: ${targetEvent.type}`);
        console.log(`  イベント数: ${targetEvent.events.length}`);
        
        const pearlEvents = targetEvent.events.filter(e => e.type === 'pearl');
        if (pearlEvents.length > 0) {
          console.log(`  🌙 パール富士イベント: ${pearlEvents.length}個`);
          pearlEvents.forEach((event, index) => {
            console.log(`    ${index + 1}. ${event.location.name} - ${event.time} (${event.subType})`);
          });
        } else {
          console.log('  ⚠️  パール富士イベントなし（アイコンが付いているのに不一致の可能性）');
        }
      } else {
        console.log(`❌ ${this.testDate}のカレンダーイベントが見つかりません`);
      }
      
      console.log('');
    } catch (error) {
      console.error('月間カレンダーAPI呼び出しエラー:', error.message);
    }
  }

  async checkDayEventDetails() {
    console.log('📋 日別詳細APIでのイベント確認');
    
    try {
      const response = await fetch(`${BASE_URL}/api/events/${this.testDate}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`✅ ${this.testDate}の詳細イベント:`);
      console.log(`  総イベント数: ${data.data.events.length}`);
      
      const pearlEvents = data.data.events.filter(e => e.type === 'pearl');
      if (pearlEvents.length > 0) {
        console.log(`  🌙 パール富士詳細: ${pearlEvents.length}個`);
        pearlEvents.forEach((event, index) => {
          console.log(`    ${index + 1}. ${event.location.name} - ${event.time} (${event.subType})`);
        });
      } else {
        console.log('  ⚠️  パール富士詳細なし（アイコンが付いているのに詳細がない問題）');
      }
      
      // ダイヤモンド富士も確認
      const diamondEvents = data.data.events.filter(e => e.type === 'diamond');
      if (diamondEvents.length > 0) {
        console.log(`  💎 ダイヤモンド富士詳細: ${diamondEvents.length}個`);
        diamondEvents.forEach((event, index) => {
          console.log(`    ${index + 1}. ${event.location.name} - ${event.time} (${event.subType})`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('日別詳細API呼び出しエラー:', error.message);
    }
  }

  async analyzeDiscrepancy() {
    console.log('🔍 不一致原因の分析');
    
    try {
      // 月間カレンダーと日別詳細を並行取得
      const [monthlyResponse, dailyResponse] = await Promise.all([
        fetch(`${BASE_URL}/api/calendar/${this.year}/${this.month}`),
        fetch(`${BASE_URL}/api/events/${this.testDate}`)
      ]);

      if (!monthlyResponse.ok || !dailyResponse.ok) {
        throw new Error('APIレスポンスエラー');
      }

      const monthlyData = await monthlyResponse.json();
      const dailyData = await dailyResponse.json();

      // 月間カレンダーの該当日イベント
      const monthlyEvent = monthlyData.data.events.find(event => event.date === this.testDate);
      const monthlyPearl = monthlyEvent ? monthlyEvent.events.filter(e => e.type === 'pearl') : [];
      
      // 日別詳細のパール富士イベント
      const dailyPearl = dailyData.data.events.filter(e => e.type === 'pearl');

      console.log('比較結果:');
      console.log(`  月間カレンダーのパール富士: ${monthlyPearl.length}個`);
      console.log(`  日別詳細のパール富士: ${dailyPearl.length}個`);

      if (monthlyPearl.length !== dailyPearl.length) {
        console.log('❌ 不一致発見! 数が異なります');
        
        if (monthlyPearl.length > dailyPearl.length) {
          console.log('  → 月間カレンダーにあるが日別詳細にないイベント:');
          monthlyPearl.forEach(event => {
            const found = dailyPearl.find(d => d.location.id === event.location.id && d.subType === event.subType);
            if (!found) {
              console.log(`    - ${event.location.name} (${event.subType}) ${event.time}`);
            }
          });
        }
        
        if (dailyPearl.length > monthlyPearl.length) {
          console.log('  → 日別詳細にあるが月間カレンダーにないイベント:');
          dailyPearl.forEach(event => {
            const found = monthlyPearl.find(m => m.location.id === event.location.id && m.subType === event.subType);
            if (!found) {
              console.log(`    - ${event.location.name} (${event.subType}) ${event.time}`);
            }
          });
        }
      } else if (monthlyPearl.length === 0 && dailyPearl.length === 0) {
        console.log('⚠️  両方ともパール富士なし（アイコンが誤表示されている可能性）');
      } else {
        console.log('✅ イベント数は一致しています');
        
        // 詳細な時刻比較
        for (let i = 0; i < monthlyPearl.length; i++) {
          if (monthlyPearl[i] && dailyPearl[i]) {
            const monthlyTime = new Date(monthlyPearl[i].time);
            const dailyTime = new Date(dailyPearl[i].time);
            const timeDiff = Math.abs(monthlyTime.getTime() - dailyTime.getTime());
            
            if (timeDiff > 60000) { // 1分以上の差
              console.log(`⚠️  時刻の差異 (${monthlyPearl[i].location.name}): ${timeDiff}ms`);
              console.log(`    月間: ${monthlyPearl[i].time}`);
              console.log(`    日別: ${dailyPearl[i].time}`);
            }
          }
        }
      }

      // キャッシュ状態の確認
      console.log('\nキャッシュ情報:');
      if (monthlyData.meta?.cacheHit !== undefined) {
        console.log(`  月間カレンダー: ${monthlyData.meta.cacheHit ? 'キャッシュヒット' : 'キャッシュミス'} (${monthlyData.meta.responseTimeMs}ms)`);
      }
      if (dailyData.meta?.cacheHit !== undefined) {
        console.log(`  日別詳細: ${dailyData.meta.cacheHit ? 'キャッシュヒット' : 'キャッシュミス'} (${dailyData.meta.responseTimeMs}ms)`);
      }

      // 推奨対処法
      console.log('\n💡 推奨対処法:');
      if (monthlyPearl.length !== dailyPearl.length) {
        console.log('  1. キャッシュを一度クリアして再計算');
        console.log('  2. 月間カレンダーと日別詳細の計算ロジックの統一性確認');
        console.log('  3. パール富士計算の時間ウィンドウ設定の確認');
      } else {
        console.log('  データは一致しているため、フロントエンドの表示ロジックを確認');
      }

    } catch (error) {
      console.error('分析中エラー:', error.message);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🔚 デバッグ完了');
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const debugger = new PearlFujiDebugger();
  debugger.debug().catch(console.error);
}

export default PearlFujiDebugger;