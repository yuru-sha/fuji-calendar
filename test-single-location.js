/**
 * 単一地点での富士現象イベント計算テスト
 * プロセスが落ちないよう小規模でテスト
 */

const { PrismaClientManager } = require('./src/server/database/prisma');

async function testSingleLocation() {
  console.log('🧪 単一地点での富士現象イベント計算テスト');
  
  try {
    const prisma = PrismaClientManager.getInstance();
    
    // 海ほたるPA北岸付近のデータを取得
    const location = await prisma.location.findFirst({
      where: {
        name: {
          contains: '海ほたるPA北岸'
        }
      }
    });
    
    if (!location) {
      console.log('❌ 海ほたるPA北岸付近の地点が見つかりません');
      return;
    }
    
    console.log('📍 テスト地点:', location.name);
    console.log('   座標:', `${location.latitude}, ${location.longitude}`);
    console.log('   標高:', `${location.elevation}m`);
    console.log('   富士山方位角:', `${location.fujiAzimuth}°`);
    console.log('   富士山仰角:', `${location.fujiElevation}°`);
    console.log('   富士山距離:', `${location.fujiDistance}km`);
    console.log('');
    
    // 2025年2月15日の天体データを確認（1日分のみ）
    const testDate = new Date('2025-02-15');
    const nextDate = new Date('2025-02-16');
    
    console.log('🔍 天体データ検索条件:');
    console.log('   日付:', testDate.toISOString().split('T')[0]);
    console.log('   方位角範囲:', `${location.fujiAzimuth - 10}° ～ ${location.fujiAzimuth + 10}°`);
    console.log('   仰角範囲:', `${location.fujiElevation - 5}° ～ ${location.fujiElevation + 5}°`);
    console.log('');
    
    // 天体データを検索
    const celestialData = await prisma.celestialOrbitData.findMany({
      where: {
        date: { gte: testDate, lt: nextDate },
        azimuth: {
          gte: location.fujiAzimuth - 10.0,
          lte: location.fujiAzimuth + 10.0
        },
        elevation: {
          gte: location.fujiElevation - 5.0,
          lte: location.fujiElevation + 5.0
        },
        visible: true
      },
      orderBy: [{ time: 'asc' }],
      take: 20 // 最大20件に制限
    });
    
    console.log(`📊 候補天体データ: ${celestialData.length}件`);
    
    if (celestialData.length === 0) {
      console.log('❌ 条件に合う天体データが見つかりません');
      
      // visible=trueのデータ総数を確認
      const visibleCount = await prisma.celestialOrbitData.count({
        where: { visible: true }
      });
      console.log(`   visible=trueのデータ総数: ${visibleCount}件`);
      
      // 該当日のデータ総数を確認
      const dayCount = await prisma.celestialOrbitData.count({
        where: {
          date: { gte: testDate, lt: nextDate }
        }
      });
      console.log(`   該当日のデータ総数: ${dayCount}件`);
      
      return;
    }
    
    // 候補データの詳細を表示
    console.log('');
    console.log('📋 候補データ詳細:');
    celestialData.forEach((data, index) => {
      const jstTime = new Date(data.time.getTime() + 9 * 60 * 60 * 1000);
      const azimuthDiff = Math.abs(data.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(data.elevation - location.fujiElevation);
      
      console.log(`${index + 1}. ${data.celestialType} ${jstTime.getHours()}:${jstTime.getMinutes().toString().padStart(2, '0')}`);
      console.log(`   方位角: ${data.azimuth.toFixed(2)}° (差: ${azimuthDiff.toFixed(2)}°)`);
      console.log(`   仰角: ${data.elevation.toFixed(2)}° (差: ${elevationDiff.toFixed(2)}°)`);
      console.log(`   visible: ${data.visible}`);
    });
    
    // ダイヤモンド富士の判定テスト
    console.log('');
    console.log('🔍 ダイヤモンド富士判定テスト:');
    const diamondCandidates = celestialData.filter(data => {
      if (data.celestialType !== 'sun') return false;
      
      const hour = new Date(data.time.getTime() + 9 * 60 * 60 * 1000).getHours();
      const isMorning = (hour >= 4 && hour < 12);
      const isEvening = (hour >= 12 && hour < 20);
      
      if (!isMorning && !isEvening) return false;
      
      const azimuthDiff = Math.abs(data.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(data.elevation - location.fujiElevation);
      
      const azimuthTolerance = location.fujiDistance <= 50 ? 0.25 : 
                              location.fujiDistance <= 100 ? 0.4 : 0.6;
      
      return azimuthDiff <= azimuthTolerance && elevationDiff <= 0.25;
    });
    
    console.log(`   ダイヤモンド富士候補: ${diamondCandidates.length}件`);
    diamondCandidates.forEach(data => {
      const jstTime = new Date(data.time.getTime() + 9 * 60 * 60 * 1000);
      console.log(`   ✅ ${jstTime.getHours()}:${jstTime.getMinutes().toString().padStart(2, '0')} 方位角${data.azimuth.toFixed(2)}° 仰角${data.elevation.toFixed(2)}°`);
    });
    
    // パール富士の判定テスト
    console.log('');
    console.log('🌙 パール富士判定テスト:');
    const pearlCandidates = celestialData.filter(data => {
      if (data.celestialType !== 'moon') return false;
      
      const azimuthDiff = Math.abs(data.azimuth - location.fujiAzimuth);
      const elevationDiff = Math.abs(data.elevation - location.fujiElevation);
      
      const azimuthTolerance = location.fujiDistance <= 50 ? 1.0 : 
                              location.fujiDistance <= 100 ? 2.0 : 3.0;
      
      return azimuthDiff <= azimuthTolerance && 
             elevationDiff <= 4.0 &&
             (data.moonIllumination >= 0.5 || data.moonIllumination === null);
    });
    
    console.log(`   パール富士候補: ${pearlCandidates.length}件`);
    pearlCandidates.forEach(data => {
      const jstTime = new Date(data.time.getTime() + 9 * 60 * 60 * 1000);
      console.log(`   ✅ ${jstTime.getHours()}:${jstTime.getMinutes().toString().padStart(2, '0')} 方位角${data.azimuth.toFixed(2)}° 仰角${data.elevation.toFixed(2)}° 照度${data.moonIllumination?.toFixed(2) || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await PrismaClientManager.disconnect();
  }
}

testSingleLocation();