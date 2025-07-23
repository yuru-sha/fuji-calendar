import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 富士山の座標とパラメータ（北緯35度21分38秒 東経138度43分39秒）
const FUJI_COORDS = {
  latitude: 35 + 21/60 + 38/3600,   // 35.360556度
  longitude: 138 + 43/60 + 39/3600, // 138.727500度
  elevation: 3776
};

// 富士山山頂の物理的な幅（約800m）
const FUJI_SUMMIT_WIDTH = 800; // メートル

// アイレベル（目線の高さ）
const EYE_LEVEL = 1.7; // メートル

// 太陽の視半径（約0.265度）
const SUN_RADIUS = 0.265;

/**
 * 2点間の距離を計算（Haversine formula）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * 2点間の方位角を計算（球面三角法）
 */
function calculateAzimuth(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;
  
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let azimuth = toDeg(Math.atan2(y, x));
  return (azimuth + 360) % 360;
}

/**
 * Gemini提供の高精度仰角計算
 * 地球の丸みと大気差を考慮した理論的に正確な計算
 */
function calculatePreciseElevationAngle(
  targetElevation,      // ターゲット標高（メートル）
  observerElevation,    // 観測者標高（メートル）
  observerEyeLevel,     // 観測者アイレベル（メートル）
  distance             // 観測者からターゲットまでの距離（メートル）
) {
  // 定数
  const earthRadius = 6371000; // 地球平均半径（メートル）
  const refractionCoefficient = 0.13; // 大気屈折率（k値）

  // 1. 観測者の実効的な高さ（地面からの目の高さ）
  const observerEffectiveHeight = observerElevation + observerEyeLevel;

  // 2. 富士山山頂と観測者の目の高さの標高差
  const heightDifference = targetElevation - observerEffectiveHeight;

  // 3. 地球の丸みによる見かけの低下（メートル）
  const curvatureDrop = Math.pow(distance, 2) / (2 * earthRadius);

  // 4. 大気差による見かけの持ち上げ（低下の相殺）（メートル）
  const refractionLift = refractionCoefficient * curvatureDrop;

  // 5. 正味の見かけの低下（メートル）
  const netApparentDrop = curvatureDrop - refractionLift;

  // 6. 最終的な見かけの垂直距離
  const apparentVerticalDistance = heightDifference - netApparentDrop;

  // 7. 仰角の計算（ラジアン→度）
  const angleRad = Math.atan2(apparentVerticalDistance, distance);
  
  return {
    angle: angleRad * (180 / Math.PI),
    debugInfo: {
      observerEffectiveHeight,
      heightDifference,
      curvatureDrop: curvatureDrop.toFixed(3),
      refractionLift: refractionLift.toFixed(3),
      netApparentDrop: netApparentDrop.toFixed(3),
      apparentVerticalDistance: apparentVerticalDistance.toFixed(3)
    }
  };
}

/**
 * 富士山山頂の見かけの角度幅を計算
 */
function calculateFujiApparentWidth(distanceToFuji) {
  const angleRad = 2 * Math.atan(FUJI_SUMMIT_WIDTH / (2 * distanceToFuji));
  return angleRad * 180 / Math.PI;
}

/**
 * 高精度ダイヤモンド富士検出
 * Geminiの理論計算 + スーパー地形実測値 + astronomy-engineデータを統合
 */
function findEnhancedDiamondFuji(celestialData, fujiAzimuth, theoreticalElevation, location) {
  const fujiApparentWidth = calculateFujiApparentWidth(
    calculateDistance(location.latitude, location.longitude, FUJI_COORDS.latitude, FUJI_COORDS.longitude)
  );
  
  const azimuthTolerance = (fujiApparentWidth / 2) + SUN_RADIUS; // 方位角許容範囲

  // 検出基準
  let targetElevation;
  let detectionName;
  let qualityBase;

  if (location.fujiElevation) {
    // スーパー地形実測値がある場合：実測値を優先
    targetElevation = location.fujiElevation;
    detectionName = 'super_terrain_measured';
    qualityBase = 0.95; // 実測値ベースの高品質
  } else {
    // 実測値がない場合：Geminiの理論計算を使用
    targetElevation = theoreticalElevation;
    detectionName = 'gemini_theoretical';
    qualityBase = 0.85; // 理論値ベースの標準品質
  }

  // 太陽下端が富士山山頂に接触する理想的オフセット
  const IDEAL_OFFSET = 0.594; // 3月10日17:33観測に基づく実測値
  const OFFSET_TOLERANCE = 0.12; // 許容範囲（±0.12度）

  console.log(`  検出基準:`);
  console.log(`    使用仰角: ${targetElevation.toFixed(3)}度 (${detectionName})`);
  console.log(`    方位角許容範囲: ±${azimuthTolerance.toFixed(3)}度`);
  console.log(`    理想オフセット: +${IDEAL_OFFSET}度`);
  console.log(`    オフセット許容範囲: ±${OFFSET_TOLERANCE}度`);

  // 時刻順にソート
  const sortedData = celestialData.sort((a, b) => new Date(a.time) - new Date(b.time));
  
  let bestMatch = null;
  let minOffsetDiff = Infinity;
  
  for (const data of sortedData) {
    // 方位角チェック
    const azimuthDiff = Math.abs(data.azimuth - fujiAzimuth);
    const normalizedAzimuthDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
    
    if (normalizedAzimuthDiff > azimuthTolerance) continue;
    
    // 太陽下端の仰角を計算
    const sunBottomElevation = data.elevation - SUN_RADIUS;
    const actualOffset = sunBottomElevation - targetElevation;
    const offsetDiff = Math.abs(actualOffset - IDEAL_OFFSET);
    
    // 理想オフセットとの比較
    if (offsetDiff <= OFFSET_TOLERANCE && offsetDiff < minOffsetDiff) {
      minOffsetDiff = offsetDiff;
      
      // 品質スコア計算
      let qualityScore = qualityBase;
      
      // オフセット精度による調整
      if (offsetDiff <= 0.05) qualityScore += 0.05; // 優秀
      else if (offsetDiff <= 0.08) qualityScore += 0.02; // 良好
      else if (offsetDiff > 0.10) qualityScore -= 0.05; // 標準以下
      
      // 方位角精度による調整
      if (normalizedAzimuthDiff <= azimuthTolerance * 0.5) {
        qualityScore += 0.03; // 方位角が非常に正確な場合のボーナス
      }
      
      // スコア範囲制限
      qualityScore = Math.max(0.5, Math.min(1.0, qualityScore));
      
      bestMatch = {
        data,
        sunBottomElevation,
        actualOffset,
        offsetDiff,
        azimuthDiff: normalizedAzimuthDiff,
        detectionMethod: detectionName,
        qualityScore,
        accuracy: offsetDiff <= 0.05 ? 'excellent' : 
                 offsetDiff <= 0.08 ? 'good' : 
                 offsetDiff <= 0.12 ? 'fair' : 'acceptable'
      };
      
      console.log(`    時刻: ${new Date(data.time).toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
      console.log(`      太陽下端仰角: ${sunBottomElevation.toFixed(3)}度`);
      console.log(`      実際オフセット: ${actualOffset > 0 ? '+' : ''}${actualOffset.toFixed(3)}度`);
      console.log(`      理想との差: ${offsetDiff.toFixed(3)}度`);
      console.log(`      品質スコア: ${qualityScore.toFixed(3)} (${bestMatch.accuracy})`);
      console.log(`      ★ ベストマッチ更新 (${detectionName})`);
    }
  }
  
  return bestMatch;
}

// メイン処理
async function generateEnhancedDiamondFuji() {
  console.log('=== 高精度ダイヤモンド富士検出システム ===');
  console.log('統合技術: Gemini理論計算 + スーパー地形実測 + astronomy-engine');
  console.log('');
  
  try {
    // 既存のダイヤモンド富士データをクリア
    await prisma.locationFujiEvent.deleteMany({
      where: {
        eventType: {
          in: ['diamond_sunrise', 'diamond_sunset']
        }
      }
    });
    
    // 全地点を取得
    const locations = await prisma.location.findMany();
    console.log(`処理対象: ${locations.length}地点`);
    
    const totalEvents = [];
    
    // 各地点について処理
    for (const location of locations) {
      console.log(`\\n=== ${location.name} (ID: ${location.id}) ===`);
      
      // 富士山への方位角と距離を計算
      const fujiAzimuth = calculateAzimuth(
        location.latitude, 
        location.longitude,
        FUJI_COORDS.latitude, 
        FUJI_COORDS.longitude
      );
      
      const distanceToFuji = calculateDistance(
        location.latitude, 
        location.longitude,
        FUJI_COORDS.latitude, 
        FUJI_COORDS.longitude
      );
      
      console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(3)}度`);
      console.log(`  富士山までの距離: ${(distanceToFuji / 1000).toFixed(3)}km`);
      
      // Geminiの高精度理論計算
      const theoreticalResult = calculatePreciseElevationAngle(
        FUJI_COORDS.elevation,
        location.elevation,
        EYE_LEVEL,
        distanceToFuji
      );
      
      console.log(`  Gemini理論仰角: ${theoreticalResult.angle.toFixed(6)}度`);
      console.log(`    地球曲率低下: ${theoreticalResult.debugInfo.curvatureDrop}m`);
      console.log(`    大気屈折持上: ${theoreticalResult.debugInfo.refractionLift}m`);
      console.log(`    正味補正: ${theoreticalResult.debugInfo.netApparentDrop}m`);
      
      if (location.fujiElevation) {
        console.log(`  スーパー地形実測: ${location.fujiElevation.toFixed(3)}度`);
        console.log(`  理論値との差: ${Math.abs(theoreticalResult.angle - location.fujiElevation).toFixed(3)}度`);
      }
      
      // 検索範囲を設定
      const searchElevation = location.fujiElevation || theoreticalResult.angle;
      const margin = 2.0; // 安全マージン
      const minElevation = searchElevation - margin;
      const maxElevation = searchElevation + margin;
      
      // 富士山への方位角によって朝・夕の観測可能性を判定
      const canObserveMorning = fujiAzimuth >= 60 && fujiAzimuth <= 120; // 東方向
      const canObserveEvening = fujiAzimuth >= 240 && fujiAzimuth <= 300; // 西方向
      
      console.log(`  朝ダイヤモンド富士: ${canObserveMorning ? '観測可能' : '観測不可'}`);
      console.log(`  夕ダイヤモンド富士: ${canObserveEvening ? '観測可能' : '観測不可'}`);
      
      const azimuthRange = 15; // ±15度の方位角範囲
      const minAzimuth = (fujiAzimuth - azimuthRange + 360) % 360;
      const maxAzimuth = (fujiAzimuth + azimuthRange) % 360;
      
      // 基本の検索条件
      let whereConditions = [];
      
      // 朝の日の出ダイヤモンド富士（富士山が東側にある場合）
      if (canObserveMorning) {
        const morningCondition = {
          date: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          },
          celestialType: 'sun',
          visible: true,
          elevation: {
            gte: minElevation,
            lte: maxElevation
          },
          hour: { gte: 4, lt: 10 } // 朝の時間帯
        };
        
        // 方位角の条件を追加
        if (minAzimuth < maxAzimuth) {
          morningCondition.azimuth = { gte: minAzimuth, lte: maxAzimuth };
        } else {
          morningCondition.OR = [
            { azimuth: { gte: minAzimuth } },
            { azimuth: { lte: maxAzimuth } }
          ];
        }
        
        whereConditions.push(morningCondition);
      }
      
      // 夕方の日の入りダイヤモンド富士（富士山が西側にある場合）  
      if (canObserveEvening) {
        const eveningCondition = {
          date: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          },
          celestialType: 'sun',
          visible: true,
          elevation: {
            gte: minElevation,
            lte: maxElevation
          },
          hour: { gte: 14, lt: 20 } // 夕方の時間帯
        };
        
        // 方位角の条件を追加
        if (minAzimuth < maxAzimuth) {
          eveningCondition.azimuth = { gte: minAzimuth, lte: maxAzimuth };
        } else {
          eveningCondition.OR = [
            { azimuth: { gte: minAzimuth } },
            { azimuth: { lte: maxAzimuth } }
          ];
        }
        
        whereConditions.push(eveningCondition);
      }
      
      if (whereConditions.length === 0) {
        console.log(`  → この地点からはダイヤモンド富士観測不可（方位角: ${fujiAzimuth.toFixed(1)}度）`);
        continue;
      }
      
      // 複数の条件でデータを取得
      let celestialData = [];
      for (const condition of whereConditions) {
        const data = await prisma.celestialOrbitData.findMany({
          where: condition,
          orderBy: [{ date: 'asc' }, { time: 'asc' }]
        });
        celestialData.push(...data);
      }
      
      console.log(`  候補データ: ${celestialData.length}件`);
      
      if (celestialData.length === 0) {
        console.log(`  → 検出条件に合致するデータなし`);
        continue;
      }
      
      const events = [];
      
      // 日付ごとにグループ分けして処理
      const dataByDate = new Map();
      for (const data of celestialData) {
        const dateKey = data.date.toISOString().split('T')[0];
        if (!dataByDate.has(dateKey)) {
          dataByDate.set(dateKey, { morning: [], evening: [] });
        }
        
        if (data.hour < 12) {
          dataByDate.get(dateKey).morning.push(data);
        } else {
          dataByDate.get(dateKey).evening.push(data);
        }
      }
      
      // 各日のベストタイムを探す
      for (const [dateKey, dayData] of dataByDate) {
        console.log(`\\n  ${dateKey}:`);
        
        // 朝のダイヤモンド富士（日の出）
        if (dayData.morning.length > 0) {
          console.log(`    朝の候補: ${dayData.morning.length}件`);
          const morningMatch = findEnhancedDiamondFuji(
            dayData.morning, fujiAzimuth, theoreticalResult.angle, location
          );
          
          if (morningMatch) {
            events.push({
              locationId: location.id,
              eventDate: morningMatch.data.date,
              eventTime: morningMatch.data.time,
              eventType: 'diamond_sunrise',
              azimuth: morningMatch.data.azimuth,
              altitude: morningMatch.data.elevation,
              qualityScore: morningMatch.qualityScore,
              accuracy: morningMatch.accuracy,
              calculationYear: 2025
            });
            
            console.log(`    → 朝のダイヤモンド富士: ${morningMatch.accuracy} (${morningMatch.qualityScore.toFixed(3)})`);
          }
        }
        
        // 夕方のダイヤモンド富士（日没）
        if (dayData.evening.length > 0) {
          console.log(`    夕方の候補: ${dayData.evening.length}件`);
          const eveningMatch = findEnhancedDiamondFuji(
            dayData.evening, fujiAzimuth, theoreticalResult.angle, location
          );
          
          if (eveningMatch) {
            events.push({
              locationId: location.id,
              eventDate: eveningMatch.data.date,
              eventTime: eveningMatch.data.time,
              eventType: 'diamond_sunset',
              azimuth: eveningMatch.data.azimuth,
              altitude: eveningMatch.data.elevation,
              qualityScore: eveningMatch.qualityScore,
              accuracy: eveningMatch.accuracy,
              calculationYear: 2025
            });
            
            console.log(`    → 夕方のダイヤモンド富士: ${eveningMatch.accuracy} (${eveningMatch.qualityScore.toFixed(3)})`);
          }
        }
      }
      
      // イベントを挿入
      if (events.length > 0) {
        await prisma.locationFujiEvent.createMany({
          data: events
        });
        
        const excellentEvents = events.filter(e => e.qualityScore >= 0.9);
        const goodEvents = events.filter(e => e.qualityScore >= 0.8 && e.qualityScore < 0.9);
        
        console.log(`\\n  登録完了: ${events.length}件`);
        console.log(`    優秀 (0.9+): ${excellentEvents.length}件`);
        console.log(`    良好 (0.8+): ${goodEvents.length}件`);
        
        totalEvents.push(...events);
      } else {
        console.log(`\\n  → 検出条件を満たすイベントなし`);
      }
    }
    
    // 統計情報
    const stats = await prisma.locationFujiEvent.groupBy({
      by: ['eventType'],
      where: {
        eventType: { in: ['diamond_sunrise', 'diamond_sunset'] }
      },
      _count: true
    });
    
    console.log('\\n=== 高精度検出結果 ===');
    stats.forEach(stat => {
      console.log(`${stat.eventType}: ${stat._count}件`);
    });
    
    const qualityStats = {
      excellent: totalEvents.filter(e => e.qualityScore >= 0.9).length,
      good: totalEvents.filter(e => e.qualityScore >= 0.8 && e.qualityScore < 0.9).length,
      fair: totalEvents.filter(e => e.qualityScore >= 0.7 && e.qualityScore < 0.8).length,
      acceptable: totalEvents.filter(e => e.qualityScore < 0.7).length
    };
    
    console.log('\\n品質分布:');
    console.log(`  優秀 (0.9+): ${qualityStats.excellent}件`);
    console.log(`  良好 (0.8+): ${qualityStats.good}件`);
    console.log(`  標準 (0.7+): ${qualityStats.fair}件`);
    console.log(`  許容範囲: ${qualityStats.acceptable}件`);
    console.log(`\\n合計: ${totalEvents.length}件の高精度ダイヤモンド富士イベントを生成`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
generateEnhancedDiamondFuji().catch(console.error);