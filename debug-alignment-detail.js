#!/usr/bin/env node

// FujiAlignmentCalculator の searchCelestialAlignment メソッドを詳細デバッグ

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
const { CelestialPositionCalculator } = require('./apps/server/src/services/astronomical/CelestialPositionCalculator.ts');
const { CoordinateCalculator } = require('./apps/server/src/services/astronomical/CoordinateCalculator.ts');

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

async function debugAlignmentDetail() {
  console.log('=== FujiAlignmentCalculator 詳細デバッグ ===');
  
  const celestialCalc = new CelestialPositionCalculator();
  const coordinateCalc = new CoordinateCalculator();
  const fujiAzimuth = coordinateCalc.calculateAzimuthToFuji(tenjogatakeLocation);
  
  console.log(`富士山方位角: ${fujiAzimuth.toFixed(3)}°`);
  
  const date = new Date('2025-01-16T00:00:00+09:00');
  const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endTime = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  
  console.log(`検索範囲: ${baseDate.toLocaleString('ja-JP')} ～ ${endTime.toLocaleString('ja-JP')}`);
  
  let candidates = [];
  let totalChecked = 0;
  
  // 1 分間隔で 24 時間検索
  for (let time = new Date(baseDate); time <= endTime; time.setMinutes(time.getMinutes() + 1)) {
    totalChecked++;
    
    const position = celestialCalc.calculateMoonPosition(time, tenjogatakeLocation);
    
    if (!position) {
      continue;
    }
    
    const azimuthDiff = coordinateCalc.getAzimuthDifference(position.azimuth, fujiAzimuth);
    const isVisible = celestialCalc.isVisible(position.elevation);
    
    // 4:45-5:10 の範囲は詳細ログ
    const hour = time.getHours();
    const minute = time.getMinutes();
    if ((hour === 4 && minute >= 45) || (hour === 5 && minute <= 10)) {
      console.log(`${time.toLocaleTimeString('ja-JP')}: 方位角 ${position.azimuth.toFixed(3)}° (差分 ${azimuthDiff.toFixed(3)}°) 高度 ${position.elevation.toFixed(3)}° 可視 ${isVisible}`);
    }
    
    // 許容範囲内の候補をすべて記録
    if (azimuthDiff <= 1.5 && isVisible) {
      candidates.push({
        time: new Date(time),
        azimuth: position.azimuth,
        elevation: position.elevation,
        azimuthDiff: azimuthDiff,
        moonPhase: position.phase,
        moonIllumination: position.illumination
      });
    }
  }
  
  console.log(`\n 総チェック回数: ${totalChecked}`);
  console.log(`許容範囲内の候補: ${candidates.length}件`);
  
  if (candidates.length > 0) {
    console.log('\n=== 全候補 ===');
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}: ${candidate.time.toLocaleTimeString('ja-JP')} - 方位角差 ${candidate.azimuthDiff.toFixed(3)}° 高度 ${candidate.elevation.toFixed(3)}°`);
    });
    
    // 最良候補
    const bestCandidate = candidates.reduce((best, current) => 
      current.azimuthDiff < best.azimuthDiff ? current : best
    );
    
    console.log('\n=== 最良候補 ===');
    console.log(`時刻: ${bestCandidate.time.toLocaleString('ja-JP')}`);
    console.log(`方位角差: ${bestCandidate.azimuthDiff.toFixed(3)}°`);
    console.log(`高度: ${bestCandidate.elevation.toFixed(3)}°`);
    console.log(`月相: ${bestCandidate.moonPhase?.toFixed(3)}`);
    console.log(`月照度: ${bestCandidate.moonIllumination ? (bestCandidate.moonIllumination * 100).toFixed(1) + '%' : 'undefined'}`);
    
    // 月相チェック
    if (bestCandidate.moonIllumination !== undefined) {
      const isVisibleMoonPhase = celestialCalc.isVisibleMoonPhase(bestCandidate.moonIllumination);
      console.log(`月相可視性: ${isVisibleMoonPhase}`);
    }
    
  } else {
    console.log('\n❌ 許容範囲内の候補が見つかりませんでした');
    
    // 最も近い候補を探す
    console.log('\n=== 方位角差が最も小さい候補 ===');
    let closestCandidate = null;
    let minAzimuthDiff = Infinity;
    
    for (let time = new Date(baseDate); time <= endTime; time.setMinutes(time.getMinutes() + 1)) {
      const position = celestialCalc.calculateMoonPosition(time, tenjogatakeLocation);
      if (!position || !celestialCalc.isVisible(position.elevation)) continue;
      
      const azimuthDiff = coordinateCalc.getAzimuthDifference(position.azimuth, fujiAzimuth);
      if (azimuthDiff < minAzimuthDiff) {
        minAzimuthDiff = azimuthDiff;
        closestCandidate = {
          time: new Date(time),
          azimuth: position.azimuth,
          elevation: position.elevation,
          azimuthDiff: azimuthDiff
        };
      }
    }
    
    if (closestCandidate) {
      console.log(`最も近い候補: ${closestCandidate.time.toLocaleString('ja-JP')}`);
      console.log(`方位角差: ${closestCandidate.azimuthDiff.toFixed(3)}° (許容範囲: 1.5°)`);
      console.log(`高度: ${closestCandidate.elevation.toFixed(3)}°`);
    }
  }
}

debugAlignmentDetail().catch(console.error);