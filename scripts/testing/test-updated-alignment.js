#!/usr/bin/env node

// 修正された FujiAlignmentCalculator をテスト

// TypeScript ファイルを動的に require するためのセットアップ
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    skipLibCheck: true
  }
});

const { FujiAlignmentCalculator } = require('./apps/server/src/services/astronomical/FujiAlignmentCalculator.ts');

const tenjogatakeLocation = {
  id: 6,
  name: '天子山地・天子ヶ岳山頂付近',
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319,
  fujiAzimuth: 78.728,
  fujiElevation: 3.61,
  fujiDistance: 17700,
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testUpdatedAlignment() {
  console.log('=== 修正版 FujiAlignmentCalculator テスト ===');
  
  const calculator = new FujiAlignmentCalculator();
  const date = new Date('2025-01-16T00:00:00+09:00');
  
  console.log(`テスト日: ${date.toISOString()}`);
  console.log(`天子ヶ岳: ${tenjogatakeLocation.latitude}, ${tenjogatakeLocation.longitude}, ${tenjogatakeLocation.elevation}m`);
  
  try {
    console.log('\n=== パール富士検索実行中... ===');
    const pearlEvents = await calculator.findPearlFuji(date, tenjogatakeLocation);
    
    console.log(`検出されたパール富士イベント数: ${pearlEvents.length}`);
    
    if (pearlEvents.length > 0) {
      pearlEvents.forEach((event, index) => {
        const jstTime = new Date(event.time.getTime() + 9 * 60 * 60 * 1000);
        console.log(`\n イベント${index + 1}:`);
        console.log(`  時刻: ${jstTime.toLocaleString('ja-JP')}`);
        console.log(`  タイプ: ${event.type} - ${event.subType}`);
        console.log(`  方位角: ${event.azimuth?.toFixed(3)}°`);
        console.log(`  高度: ${event.elevation?.toFixed(3)}°`);
        console.log(`  精度: ${event.accuracy}`);
        console.log(`  品質スコア: ${event.qualityScore}`);
        if (event.moonPhase) {
          console.log(`  月相: ${event.moonPhase.toFixed(3)}`);
        }
        if (event.moonIllumination) {
          console.log(`  月照度: ${(event.moonIllumination * 100).toFixed(1)}%`);
        }
      });
      
      console.log('\n✅ 修正版で正常にパール富士が検出されました！');
    } else {
      console.log('❌ パール富士イベントが検出されませんでした');
    }
    
  } catch (error) {
    console.error('FujiAlignmentCalculator テストエラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  // 他の日付でもテスト
  console.log('\n=== 他の日付でのテスト ===');
  const testDates = [
    '2025-01-15',
    '2025-01-17',
    '2025-02-15'
  ];
  
  for (const testDateStr of testDates) {
    try {
      const testDate = new Date(`${testDateStr}T00:00:00+09:00`);
      const events = await calculator.findPearlFuji(testDate, tenjogatakeLocation);
      console.log(`${testDateStr}: ${events.length}件のパール富士イベント`);
      
      if (events.length > 0) {
        const bestEvent = events[0];
        const jstTime = new Date(bestEvent.time.getTime() + 9 * 60 * 60 * 1000);
        console.log(`  最良: ${jstTime.toLocaleTimeString('ja-JP')} (精度: ${bestEvent.accuracy})`);
      }
    } catch (error) {
      console.log(`${testDateStr}: エラー - ${error.message}`);
    }
  }
}

testUpdatedAlignment();