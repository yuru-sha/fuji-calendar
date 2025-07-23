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

/**
 * 2点間の距離を計算（Haversine formula）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球の半径（メートル）
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
  return (azimuth + 360) % 360; // 0-360度に正規化
}

/**
 * 富士山山頂の見かけの角度幅を計算
 */
function calculateFujiApparentWidth(distanceToFuji) {
  const angleRad = 2 * Math.atan(FUJI_SUMMIT_WIDTH / (2 * distanceToFuji));
  return angleRad * 180 / Math.PI;
}

/**
 * 月の視直径（約0.5度、距離により変動）
 */
const MOON_DIAMETER = 0.5;

/**
 * パール富士の判定（山頂幅を考慮）
 */
function judgePearlFuji(moonAzimuth, fujiAzimuth, fujiApparentWidth, moonIllumination) {
  const azimuthDiff = Math.abs(moonAzimuth - fujiAzimuth);
  const normalizedDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  
  // 富士山の山頂範囲（中心±幅の半分）
  const fujiHalfWidth = fujiApparentWidth / 2;
  
  // 月の半径
  const moonRadius = MOON_DIAMETER / 2;
  
  // 月が山頂に接触する条件
  const isContact = normalizedDiff <= (fujiHalfWidth + moonRadius);
  
  // 完全に重なる条件
  const isPerfect = normalizedDiff <= fujiHalfWidth;
  
  // 照明度による品質調整（満月に近いほど良い）
  const illuminationFactor = moonIllumination || 0;
  
  let quality = 'none';
  let score = 0;
  
  if (isPerfect && illuminationFactor >= 0.8) {
    const centerRatio = normalizedDiff / fujiHalfWidth;
    score = (1.0 - (centerRatio * 0.2)) * illuminationFactor;
    quality = centerRatio < 0.3 ? 'perfect' : 'excellent';
  } else if (isContact && illuminationFactor >= 0.5) {
    const overlapRatio = 1 - ((normalizedDiff - fujiHalfWidth) / moonRadius);
    score = (0.6 + (overlapRatio * 0.2)) * illuminationFactor;
    quality = overlapRatio > 0.5 ? 'good' : 'fair';
  } else if (isContact && illuminationFactor >= 0.3) {
    score = 0.4 * illuminationFactor;
    quality = 'fair';
  }
  
  return {
    isValid: isContact && illuminationFactor >= 0.3,
    quality,
    score,
    azimuthDiff: normalizedDiff,
    details: {
      fujiWidth: fujiApparentWidth,
      moonPosition: normalizedDiff <= fujiHalfWidth ? 'center' : 'edge',
      overlap: isContact ? Math.min(100, ((moonRadius + fujiHalfWidth - normalizedDiff) / moonRadius) * 100) : 0,
      illumination: illuminationFactor
    }
  };
}

/**
 * 品質評価
 */
function evaluateQuality(judgment, elevation) {
  let score = judgment.score;
  let accuracy = judgment.quality;
  
  // 高度でさらに調整
  if (elevation < -1) {
    score *= 0.9;
  } else if (elevation > 10) {
    score *= 0.95; // 高すぎても少し減点
  }
  
  return { score, accuracy };
}

// メイン処理
async function generatePearlFujiEvents() {
  console.log('パール富士イベントの生成を開始します（山頂幅考慮版）...');
  
  try {
    // 既存のパール富士データをクリア
    await prisma.locationFujiEvent.deleteMany({
      where: {
        eventType: {
          in: ['pearl_moonrise', 'pearl_moonset']
        }
      }
    });
    
    // 全地点を取得
    const locations = await prisma.location.findMany();
    console.log(`${locations.length}地点のデータを処理します`);
    
    // 各地点について処理
    for (const location of locations) {
      console.log(`\n処理中: ${location.name} (ID: ${location.id})`);
      
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
      
      // 富士山山頂の見かけの幅を計算
      const fujiApparentWidth = calculateFujiApparentWidth(distanceToFuji);
      
      console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(1)}度`);
      console.log(`  富士山までの距離: ${(distanceToFuji / 1000).toFixed(1)}km`);
      console.log(`  富士山山頂の見かけの幅: ${fujiApparentWidth.toFixed(2)}度`);
      
      // 検索範囲を山頂幅と月直径を考慮して設定
      const searchRange = fujiApparentWidth + MOON_DIAMETER + 0.5; // 余裕を持たせる
      const minAzimuth = (fujiAzimuth - searchRange + 360) % 360;
      const maxAzimuth = (fujiAzimuth + searchRange) % 360;
      
      // 年間の月データを取得（2025年）
      const whereCondition = {
        date: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        },
        celestialType: 'moon',
        visible: true,
        elevation: {
          gte: -2,
          lte: 15
        },
        moonIllumination: {
          gte: 0.3 // 30%以上の明るさ
        }
      };
      
      // 方位角の条件を追加
      if (minAzimuth < maxAzimuth) {
        whereCondition.azimuth = {
          gte: minAzimuth,
          lte: maxAzimuth
        };
      } else {
        // 0度をまたぐ場合
        whereCondition.OR = [
          { azimuth: { gte: minAzimuth } },
          { azimuth: { lte: maxAzimuth } }
        ];
      }
      
      const celestialData = await prisma.celestialOrbitData.findMany({
        where: whereCondition,
        orderBy: [
          { date: 'asc' },
          { time: 'asc' }
        ]
      });
      
      console.log(`  候補データ: ${celestialData.length}件`);
      
      const events = [];
      const processedDates = new Map();
      
      // 時系列順にソートして月の高度変化を確認できるようにする
      const sortedData = celestialData.sort((a, b) => new Date(a.time) - new Date(b.time));
      
      // 各日のベストタイムを探す
      for (let i = 0; i < sortedData.length; i++) {
        const data = sortedData[i];
        
        // パール富士の判定（山頂幅考慮）
        const judgment = judgePearlFuji(
          data.azimuth, 
          fujiAzimuth, 
          fujiApparentWidth, 
          data.moonIllumination
        );
        
        if (!judgment.isValid) continue;
        
        // 月の出入り判定：前後の時刻と高度を比較
        let eventType = 'pearl_moonset'; // デフォルト
        
        // 前後30分のデータと比較して高度変化を確認
        const prevData = sortedData.find((d, idx) => 
          idx < i && 
          Math.abs(new Date(d.time) - new Date(data.time)) <= 30 * 60 * 1000 &&
          d.date.toISOString() === data.date.toISOString()
        );
        
        const nextData = sortedData.find((d, idx) => 
          idx > i && 
          Math.abs(new Date(d.time) - new Date(data.time)) <= 30 * 60 * 1000 &&
          d.date.toISOString() === data.date.toISOString()
        );
        
        // 高度変化による判定
        if (prevData && nextData) {
          const elevationTrend = nextData.elevation - prevData.elevation;
          eventType = elevationTrend > 0 ? 'pearl_moonrise' : 'pearl_moonset';
        } else if (prevData) {
          const elevationTrend = data.elevation - prevData.elevation;
          eventType = elevationTrend > 0 ? 'pearl_moonrise' : 'pearl_moonset';
        } else if (nextData) {
          const elevationTrend = nextData.elevation - data.elevation;
          eventType = elevationTrend < 0 ? 'pearl_moonrise' : 'pearl_moonset';
        } else {
          // フォールバック：時刻による判定（満月の特性を考慮）
          // 満月期（照度80%以上）は夕方月の出、朝月の入り
          if (data.moonIllumination >= 0.8) {
            eventType = data.hour < 12 ? 'pearl_moonset' : 'pearl_moonrise';
          } else {
            eventType = data.hour < 12 ? 'pearl_moonrise' : 'pearl_moonset';
          }
        }
        
        const dateKey = `${data.date.toISOString().split('T')[0]}-${eventType}`;
        
        // 既存のデータと比較（スコアが高い方を採用）
        const existing = processedDates.get(dateKey);
        if (!existing || judgment.score > existing.score) {
          const { score, accuracy } = evaluateQuality(judgment, data.elevation);
          
          processedDates.set(dateKey, {
            locationId: location.id,
            eventDate: data.date,
            eventTime: data.time,
            eventType,
            azimuth: data.azimuth,
            altitude: data.elevation,
            qualityScore: score,
            accuracy,
            moonPhase: data.moonPhase,
            moonIllumination: data.moonIllumination,
            calculationYear: 2025,
            score: judgment.score,
            details: judgment.details
          });
        }
      }
      
      // MapからArrayに変換（内部用フィールドは除外）
      events.push(...Array.from(processedDates.values()).map(({ score, details, ...event }) => event));
      
      // イベントを挿入
      if (events.length > 0) {
        await prisma.locationFujiEvent.createMany({
          data: events
        });
        console.log(`  → ${events.length}件のパール富士イベントを登録`);
        
        // 詳細情報を表示
        const excellentEvents = Array.from(processedDates.values()).filter(e => e.qualityScore >= 0.7);
        if (excellentEvents.length > 0) {
          console.log(`    うち高品質（スコア0.7以上）: ${excellentEvents.length}件`);
        }
      } else {
        console.log(`  → パール富士イベントなし`);
      }
    }
    
    // 統計情報  
    const stats = await prisma.locationFujiEvent.groupBy({
      by: ['eventType'],
      where: {
        eventType: {
          in: ['pearl_moonrise', 'pearl_moonset']
        }
      },
      _count: true
    });
    
    console.log('\n=== 生成結果 ===');
    stats.forEach(stat => {
      console.log(`${stat.eventType}: ${stat._count}件`);
    });
    
    // 品質別統計
    const qualityStats = await prisma.locationFujiEvent.groupBy({
      by: ['accuracy'],
      where: {
        eventType: {
          in: ['pearl_moonrise', 'pearl_moonset']
        }
      },
      _count: true
    });
    
    console.log('\n=== 品質別統計 ===');
    qualityStats.forEach(stat => {
      console.log(`${stat.accuracy || 'その他'}: ${stat._count}件`);
    });
    
    const total = await prisma.locationFujiEvent.count({
      where: {
        eventType: {
          in: ['pearl_moonrise', 'pearl_moonset']
        }
      }
    });
    console.log(`\n合計: ${total}件のパール富士イベントを生成しました`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
generatePearlFujiEvents().catch(console.error);