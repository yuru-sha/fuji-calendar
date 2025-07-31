#!/usr/bin/env node

// 12 月 31 日の埼玉県越谷市周辺でのダイヤモンド富士計算を詳細調査

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

const { PrismaClientManager } = require('./apps/server/src/database/prisma.ts');
const { AstronomicalCalculatorImpl } = require('./apps/server/src/services/AstronomicalCalculator.ts');

async function debugKoshigayaDiamond() {
  const prisma = PrismaClientManager.getInstance();
  const astroCalc = new AstronomicalCalculatorImpl();
  
  try {
    console.log('=== 12 月 31 日 埼玉県越谷市周辺でのダイヤモンド富士調査 ===');
    
    // 越谷市の概算座標
    const koshigayaLocation = {
      id: 999,
      name: '埼玉県越谷市（テスト）',
      prefecture: '埼玉県',
      latitude: 35.8917, // 越谷市役所付近
      longitude: 139.7908,
      elevation: 10, // 平均標高
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`テスト地点: ${koshigayaLocation.name}`);
    console.log(`座標: ${koshigayaLocation.latitude}°N, ${koshigayaLocation.longitude}°E`);
    console.log(`標高: ${koshigayaLocation.elevation}m`);
    
    // 12 月 31 日のダイヤモンド富士を計算
    const targetDate = new Date('2024-12-31');
    console.log(`\n 対象日: ${targetDate.toDateString()}`);
    
    // 既存地点で埼玉県があるか確認
    const saitamaLocations = await prisma.location.findMany({
      where: {
        prefecture: '埼玉県'
      }
    });
    
    console.log(`\n 既存の埼玉県地点数: ${saitamaLocations.length}`);
    saitamaLocations.forEach(loc => {
      console.log(`  ID${loc.id}: ${loc.name} (${loc.latitude}, ${loc.longitude})`);
    });
    
    // テスト地点でダイヤモンド富士計算
    console.log('\n=== テスト地点でのダイヤモンド富士計算 ===');
    
    try {
      const diamondEvents = await astroCalc.calculateDiamondFuji(targetDate, [koshigayaLocation]);
      console.log(`計算結果: ${diamondEvents.length}件のダイヤモンド富士イベント`);
      
      if (diamondEvents.length > 0) {
        diamondEvents.forEach((event, index) => {
          console.log(`\n イベント${index + 1}:`);
          console.log(`  時刻: ${event.time.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
          console.log(`  方位角: ${event.azimuth?.toFixed(3)}°`);
          console.log(`  高度: ${event.elevation?.toFixed(3)}°`);
          console.log(`  サブタイプ: ${event.subType}`);
          console.log(`  精度: ${event.accuracy || 'N/A'}`);
        });
      } else {
        console.log('❌ ダイヤモンド富士イベントが検出されませんでした');
        
        // 詳細デバッグ情報
        console.log('\n=== デバッグ情報 ===');
        
        // 富士山への方位角を計算
        const { CoordinateCalculator } = require('./apps/server/src/services/astronomical/CoordinateCalculator.ts');
        const coordCalc = new CoordinateCalculator();
        const fujiAzimuth = coordCalc.calculateAzimuthToFuji(koshigayaLocation);
        console.log(`富士山への方位角: ${fujiAzimuth.toFixed(3)}°`);
        
        // 12 月 31 日の太陽位置を確認
        const { CelestialPositionCalculator } = require('./apps/server/src/services/astronomical/CelestialPositionCalculator.ts');
        const celestialCalc = new CelestialPositionCalculator();
        
        // 日の出・日の入り時刻付近の太陽位置をチェック
        const checkTimes = [
          new Date('2024-12-31T06:00:00+09:00'), // 日の出前
          new Date('2024-12-31T07:00:00+09:00'), // 日の出頃
          new Date('2024-12-31T16:00:00+09:00'), // 日の入り前
          new Date('2024-12-31T17:00:00+09:00'), // 日の入り頃
        ];
        
        console.log('\n 太陽位置チェック:');
        checkTimes.forEach(time => {
          const sunPos = celestialCalc.calculateSunPosition(time, koshigayaLocation);
          if (sunPos) {
            const azimuthDiff = Math.abs(sunPos.azimuth - fujiAzimuth);
            console.log(`  ${time.toLocaleTimeString('ja-JP')}: 方位角${sunPos.azimuth.toFixed(1)}° 高度${sunPos.elevation.toFixed(1)}° (差分${azimuthDiff.toFixed(1)}°)`);
          }
        });
        
        // シーズン判定
        const { SeasonCalculator } = require('./apps/server/src/services/astronomical/SeasonCalculator.ts');
        const seasonCalc = new SeasonCalculator();
        const isDiamondSeason = seasonCalc.isDiamondFujiSeason(targetDate, koshigayaLocation);
        console.log(`\n ダイヤモンド富士シーズン: ${isDiamondSeason}`);
      }
      
    } catch (calcError) {
      console.error('計算エラー:', calcError);
    }
    
  } catch (error) {
    console.error('処理エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugKoshigayaDiamond().catch(console.error);