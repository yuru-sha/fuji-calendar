#!/usr/bin/env node

// FujiAlignmentCalculator をテストして 4:56 のパール富士が検出されない理由を調査

const fs = require('fs');
const path = require('path');

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

// TypeScript ファイルをインポート
const { FujiAlignmentCalculator } = require('./apps/server/src/services/astronomical/FujiAlignmentCalculator.ts');

const tenjogatakeLocation = {
  id: 6,
  name: '天子山地・天子ヶ岳山頂付近',
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319,
  fujiAzimuth: 78.728,
  fujiElevation: 7.822066766368505,
  fujiDistance: 17700,
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testFujiAlignment() {
  console.log('=== FujiAlignmentCalculator テスト ===');
  
  const calculator = new FujiAlignmentCalculator();
  const date = new Date('2025-01-16T00:00:00+09:00');
  
  console.log(`テスト日: ${date.toISOString()}`);
  console.log(`天子ヶ岳: ${tenjogatakeLocation.latitude}, ${tenjogatakeLocation.longitude}, ${tenjogatakeLocation.elevation}m`);
  
  try {
    const pearlEvents = await calculator.findPearlFuji(date, tenjogatakeLocation);
    
    console.log(`\n 検出されたパール富士イベント数: ${pearlEvents.length}`);
    
    if (pearlEvents.length > 0) {
      pearlEvents.forEach((event, index) => {
        const jstTime = new Date(event.time.getTime() + 9 * 60 * 60 * 1000);
        console.log(`イベント${index + 1}:`);
        console.log(`  時刻: ${jstTime.toLocaleString('ja-JP')}`);
        console.log(`  タイプ: ${event.type} - ${event.subType}`);
        console.log(`  方位角: ${event.azimuth?.toFixed(3)}°`);
        console.log(`  高度: ${event.elevation?.toFixed(3)}°`);
        console.log(`  精度: ${event.accuracy}`);
        console.log(`  品質スコア: ${event.qualityScore}`);
      });
    } else {
      console.log('❌ パール富士イベントが検出されませんでした');
      
      // デバッグ用: 手動で 4:56 の時刻をチェック
      console.log('\n=== 手動デバッグ: 4:56 の月位置チェック ===');
      
      const testTime = new Date('2025-01-16T04:56:00+09:00');
      const utcTime = new Date(testTime.getTime() - 9 * 60 * 60 * 1000);
      
      console.log(`テスト時刻 (JST): ${testTime.toLocaleString('ja-JP')}`);
      console.log(`テスト時刻 (UTC): ${utcTime.toISOString()}`);
      
      // CelestialPositionCalculator のテストが必要
      console.log('CelestialPositionCalculator の直接テストが必要です');
    }
    
  } catch (error) {
    console.error('FujiAlignmentCalculator テストエラー:', error);
    console.error('スタックトレース:', error.stack);
  }
}

testFujiAlignment();