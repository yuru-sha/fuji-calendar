#!/usr/bin/env node

// 天子ヶ岳（location_id=6）の 2025-01-16 パール富士イベントを手動生成

const { PrismaClient } = require('@prisma/client');
const Astronomy = require('astronomy-engine');

const tenjogatakeLocation = {
  id: 6,
  name: '天子山地・天子ヶ岳山頂付近',
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319,
  fujiAzimuth: 78.728,
  fujiElevation: 3.61,  // 修正済み
  fujiDistance: 17700
};

const FUJI_AZIMUTH = 78.728;

// 方位角差計算
function getAzimuthDifference(azimuth1, azimuth2) {
  let diff = Math.abs(azimuth1 - azimuth2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

// 精度レベル判定
function getAccuracyLevel(azimuthDiff) {
  if (azimuthDiff <= 0.3) return 'perfect';
  if (azimuthDiff <= 0.7) return 'excellent';
  if (azimuthDiff <= 1.0) return 'good';
  return 'fair';
}

// 品質スコア計算
function calculateQualityScore(azimuthDiff, elevation) {
  const azimuthScore = Math.max(0, 50 - (azimuthDiff / 1.5) * 50);
  const elevationScore = Math.min(30, Math.max(0, elevation + 2) * 15);
  const visibilityScore = Math.min(20, Math.max(0, elevation) * 2);
  return Math.round(azimuthScore + elevationScore + visibilityScore);
}

async function generateTenjogatakeEvents() {
  console.log('=== 天子ヶ岳 2025-01-16 パール富士イベント生成 ===');
  
  const prisma = new PrismaClient();
  const date = new Date('2025-01-16T00:00:00+09:00');
  const observer = new Astronomy.Observer(
    tenjogatakeLocation.latitude,
    tenjogatakeLocation.longitude,
    tenjogatakeLocation.elevation
  );
  
  try {
    // 4:45-5:10 の範囲で 1 分間隔で検索（デバッグ結果より）
    const candidates = [];
    
    for (let minute = 4 * 60 + 45; minute <= 5 * 60 + 10; minute++) {
      const testTime = new Date(date);
      testTime.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const utcTime = new Date(testTime.getTime() - 9 * 60 * 60 * 1000);
      
      try {
        const moonEquator = Astronomy.Equator(Astronomy.Body.Moon, utcTime, observer, true, true);
        const moonPosition = Astronomy.Horizon(utcTime, observer, moonEquator.ra, moonEquator.dec, 'normal');
        const moonPhase = Astronomy.MoonPhase(utcTime);
        const moonIllumination = Astronomy.Illumination('Moon', utcTime);
        
        const azimuthDiff = getAzimuthDifference(moonPosition.azimuth, FUJI_AZIMUTH);
        
        if (azimuthDiff <= 1.5 && moonPosition.altitude > -2) {
          candidates.push({
            time: testTime,
            utcTime: utcTime,
            azimuth: moonPosition.azimuth,
            altitude: moonPosition.altitude,
            azimuthDiff: azimuthDiff,
            moonPhase: moonPhase,
            moonIllumination: moonIllumination.fraction,
            accuracy: getAccuracyLevel(azimuthDiff),
            qualityScore: calculateQualityScore(azimuthDiff, moonPosition.altitude)
          });
        }
      } catch (error) {
        // エラーはスキップ
      }
    }
    
    console.log(`検出された候補: ${candidates.length}件`);
    
    if (candidates.length > 0) {
      // 最良候補を選択（方位角差が最小）
      const bestCandidate = candidates.reduce((best, current) => 
        current.azimuthDiff < best.azimuthDiff ? current : best
      );
      
      console.log('\n 最良候補:');
      console.log(`時刻: ${bestCandidate.time.toLocaleString('ja-JP')}`);
      console.log(`方位角: ${bestCandidate.azimuth.toFixed(3)}° (差分: ${bestCandidate.azimuthDiff.toFixed(3)}°)`);
      console.log(`高度: ${bestCandidate.altitude.toFixed(3)}°`);
      console.log(`精度: ${bestCandidate.accuracy}`);
      console.log(`品質スコア: ${bestCandidate.qualityScore}`);
      
      // データベースに保存
      console.log('\n✅ データベースに保存中...');
      
      // event_date を UTC 基準の日付にする（既存の修正済み方式）
      const eventDateUtc = new Date(Date.UTC(2025, 0, 16, 0, 0, 0, 0));
      eventDateUtc.setUTCHours(eventDateUtc.getUTCHours() - 9); // JST→UTC 変換
      
      const savedEvent = await prisma.locationEvent.create({
        data: {
          locationId: tenjogatakeLocation.id,
          eventDate: eventDateUtc,
          eventTime: bestCandidate.utcTime,
          azimuth: bestCandidate.azimuth,
          altitude: bestCandidate.altitude,
          qualityScore: bestCandidate.qualityScore,
          moonPhase: bestCandidate.moonPhase,
          moonIllumination: bestCandidate.moonIllumination,
          calculationYear: 2025,
          eventType: 'pearl_moonrise',
          accuracy: bestCandidate.accuracy
        }
      });
      
      console.log('✅ イベント保存完了！');
      console.log(`イベント ID: ${savedEvent.id}`);
      
      // 保存確認
      const savedEvents = await prisma.locationEvent.findMany({
        where: {
          locationId: 6,
          eventDate: eventDateUtc
        }
      });
      
      console.log(`\n 確認: location_id=6 の 2025-01-16 イベント数: ${savedEvents.length}件`);
      
    } else {
      console.log('❌ 条件を満たすパール富士イベントが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('イベント生成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTenjogatakeEvents();