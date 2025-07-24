const path = require('path');
require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.server.json')
});

const { CelestialOrbitDataService } = require('./src/server/services/CelestialOrbitDataService');

async function generate1231() {
  console.log('12/31のデータを追加生成します...');
  
  try {
    const service = new CelestialOrbitDataService();
    
    // 12/31の1日分だけ生成
    const dec31Date = new Date(2025, 11, 31); // 12/31
    
    // private methodなのでアクセスできないため、一時的に別の方法で生成
    // CelestialOrbitDataServiceのgenerateDailyDataを直接呼び出せないので
    // 簡単な実装で12/31データを生成
    
    const { PrismaClient } = require('@prisma/client');
    const { astronomicalCalculator } = require('./src/server/services/AstronomicalCalculatorAstronomyEngine');
    
    const prisma = new PrismaClient();
    const dataPoints = [];
    
    const year = 2025;
    const month = 11; // 12月（0-based）
    const dayOfMonth = 31;
    
    const dateOnly = new Date(Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0));
    
    console.log('12/31の1440件のデータを生成中...');
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        const utcTime = new Date(Date.UTC(year, month, dayOfMonth, hour - 9, minute, 0));
        const jstTime = new Date(year, month, dayOfMonth, hour, minute, 0);
        
        const fujiLocation = { latitude: 35.3606, longitude: 138.7274, elevation: 3776, name: '富士山' };
        
        try {
          // 太陽データ
          const sunPosition = await astronomicalCalculator.calculateSunPositionPrecise(utcTime, fujiLocation);
          const sunVisible = sunPosition.elevation > -6;
          
          dataPoints.push({
            date: dateOnly,
            time: jstTime,
            hour,
            minute,
            celestialType: 'sun',
            azimuth: sunPosition.azimuth,
            elevation: sunPosition.elevation,
            visible: sunVisible,
            season: 'winter',
            timeOfDay: hour >= 5 && hour < 12 ? 'morning' : 
                      hour >= 12 && hour < 17 ? 'afternoon' :
                      hour >= 17 && hour < 21 ? 'evening' : 'night'
          });
          
          // 月データ
          const moonPosition = await astronomicalCalculator.calculateMoonPositionPrecise(utcTime, fujiLocation);
          const moonVisible = moonPosition.elevation > 0;
          
          if (moonVisible) {
            dataPoints.push({
              date: dateOnly,
              time: jstTime,
              hour,
              minute,
              celestialType: 'moon',
              azimuth: moonPosition.azimuth,
              elevation: moonPosition.elevation,
              visible: true,
              moonPhase: moonPosition.moonPhase,
              moonIllumination: moonPosition.moonIllumination,
              season: 'winter',
              timeOfDay: hour >= 5 && hour < 12 ? 'morning' : 
                        hour >= 12 && hour < 17 ? 'afternoon' :
                        hour >= 17 && hour < 21 ? 'evening' : 'night'
            });
          }
        } catch (error) {
          console.error(`計算エラー ${hour}:${minute}:`, error.message);
        }
      }
      
      if (hour % 6 === 0) {
        console.log(`進捗: ${hour}/24時間完了`);
      }
    }
    
    console.log(`生成データ数: ${dataPoints.length}件`);
    console.log('データベースに保存中...');
    
    // バッチで保存
    const batchSize = 200;
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize);
      await prisma.celestialOrbitData.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
    
    console.log('✅ 12/31のデータ生成完了！');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

generate1231();