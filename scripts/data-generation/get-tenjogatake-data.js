#!/usr/bin/env node

// 天子ヶ岳の正確な座標をデータベースから取得するスクリプト

const { PrismaClient } = require('@prisma/client');

async function getTenjogatakeData() {
  const prisma = new PrismaClient();
  
  try {
    const location = await prisma.location.findUnique({
      where: { id: 6 }
    });
    
    if (location) {
      console.log('天子ヶ岳（location_id=6）の正確なデータ:');
      console.log(`名前: ${location.name}`);
      console.log(`緯度: ${location.latitude}`);
      console.log(`経度: ${location.longitude}`);  
      console.log(`標高: ${location.elevation}m`);
      console.log(`富士山への方位角: ${location.fujiAzimuth}°`);
      console.log(`富士山頂への仰角: ${location.fujiElevation}°`);
      console.log(`富士山までの距離: ${location.fujiDistance ? (location.fujiDistance / 1000).toFixed(1) + 'km' : '未計算'}`);
      
      // 富士山頂への仰角を手動計算して検証
      const FUJI_COORDINATES = {
        latitude: 35.3606,
        longitude: 138.7274,
        elevation: 3776
      };
      
      // 地球の半径（メートル）
      const EARTH_RADIUS = 6371000;
      
      // Haversine 公式で距離計算
      const lat1Rad = location.latitude * Math.PI / 180;
      const lat2Rad = FUJI_COORDINATES.latitude * Math.PI / 180;
      const deltaLatRad = (FUJI_COORDINATES.latitude - location.latitude) * Math.PI / 180;
      const deltaLonRad = (FUJI_COORDINATES.longitude - location.longitude) * Math.PI / 180;
      
      const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = EARTH_RADIUS * c;
      
      // 高度差
      const heightDiff = FUJI_COORDINATES.elevation - location.elevation;
      
      // 仰角計算（地球曲率・大気屈折補正なし）
      const elevationAngleRad = Math.atan(heightDiff / distance);
      const elevationAngleDeg = elevationAngleRad * 180 / Math.PI;
      
      console.log('\n=== 手動計算結果 ===');
      console.log(`距離: ${(distance / 1000).toFixed(1)}km`);
      console.log(`高度差: ${heightDiff}m`);
      console.log(`仰角（地球曲率補正なし）: ${elevationAngleDeg.toFixed(3)}°`);
      
      // 地球曲率補正あり仰角計算
      const earthRadius = 6371000;
      const apparentHeightDiff = heightDiff - (distance * distance) / (2 * earthRadius);
      const correctedElevationRad = Math.atan(apparentHeightDiff / distance);
      const correctedElevationDeg = correctedElevationRad * 180 / Math.PI;
      
      console.log(`仰角（地球曲率補正あり）: ${correctedElevationDeg.toFixed(3)}°`);
      
      if (Math.abs(correctedElevationDeg - 3.61) < 0.1) {
        console.log('✅ 仰角 3.61 度と一致します');
      } else {
        console.log(`❌ 仰角 3.61 度と一致しません（差分: ${Math.abs(correctedElevationDeg - 3.61).toFixed(3)}°）`);
      }
      
    } else {
      console.log('天子ヶ岳のデータが見つかりませんでした');
    }
    
    // 2025-01-16 のイベントデータも確認
    const events = await prisma.locationEvent.findMany({
      where: {
        locationId: 6,
        eventDate: new Date('2025-01-16')
      },
      orderBy: { eventTime: 'asc' }
    });
    
    console.log(`\n=== 2025-01-16 のイベント数: ${events.length} ===`);
    events.forEach(event => {
      const jstTime = new Date(event.eventTime.getTime() + 9 * 60 * 60 * 1000);
      console.log(`${event.eventType}: ${jstTime.toLocaleTimeString('ja-JP')} ` +
        `方位角${event.azimuth.toFixed(1)}° 高度${event.altitude.toFixed(1)}° ` +
        `品質${event.qualityScore.toFixed(1)}`);
    });
    
  } catch (error) {
    console.error('データ取得エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTenjogatakeData();