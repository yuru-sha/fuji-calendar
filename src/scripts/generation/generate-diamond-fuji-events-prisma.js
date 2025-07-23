import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 富士山の座標
const FUJI_COORDS = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776
};

/**
 * 2点間の方位角を計算（球面三角法）
 * @param {number} lat1 始点の緯度（度）
 * @param {number} lon1 始点の経度（度）
 * @param {number} lat2 終点の緯度（度）
 * @param {number} lon2 終点の経度（度）
 * @returns {number} 方位角（度、北を0度として時計回り）
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
 * 品質スコアの計算
 * @param {number} azimuthDiff 方位角の差
 * @param {number} elevation 太陽の高度
 * @returns {Object} 品質スコアと精度
 */
function evaluateQuality(azimuthDiff, elevation) {
  let score = 1.0;
  let accuracy = 'excellent';
  
  // 方位角の差でスコア減算
  if (azimuthDiff <= 0.3) {
    score = 1.0;
    accuracy = 'perfect';
  } else if (azimuthDiff <= 0.5) {
    score = 0.9;
    accuracy = 'excellent';
  } else if (azimuthDiff <= 1.0) {
    score = 0.8;
    accuracy = 'good';
  } else {
    score = 0.6;
    accuracy = 'fair';
  }
  
  // 高度でさらに調整
  if (elevation < -1) {
    score *= 0.9;
  }
  
  return { score, accuracy };
}

// メイン処理
async function generateDiamondFujiEvents() {
  console.log('ダイヤモンド富士イベントの生成を開始します...');
  
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
    console.log(`${locations.length}地点のデータを処理します`);
    
    // 各地点について処理
    for (const location of locations) {
      console.log(`\n処理中: ${location.name} (ID: ${location.id})`);
      
      // 富士山への方位角を計算
      const fujiAzimuth = calculateAzimuth(
        location.latitude, 
        location.longitude,
        FUJI_COORDS.latitude, 
        FUJI_COORDS.longitude
      );
      
      console.log(`  富士山への方位角: ${fujiAzimuth.toFixed(1)}度`);
      
      // 方位角の範囲を設定（±5度）
      const minAzimuth = (fujiAzimuth - 5 + 360) % 360;
      const maxAzimuth = (fujiAzimuth + 5) % 360;
      
      // 年間の太陽データを取得（2025年）
      const whereCondition = {
        date: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        },
        celestialType: 'sun',
        visible: true,
        elevation: {
          gte: -2,
          lte: 10
        },
        OR: [
          {
            hour: { gte: 4, lt: 10 }  // 朝の時間帯
          },
          {
            hour: { gte: 14, lt: 20 } // 夕方の時間帯
          }
        ]
      };
      
      // 方位角の条件を追加
      if (minAzimuth < maxAzimuth) {
        whereCondition.azimuth = {
          gte: minAzimuth,
          lte: maxAzimuth
        };
      } else {
        // 0度をまたぐ場合
        whereCondition.OR.push(
          { azimuth: { gte: minAzimuth } },
          { azimuth: { lte: maxAzimuth } }
        );
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
      
      // 各日のベストタイムを探す
      for (const data of celestialData) {
        const dateKey = `${data.date.toISOString().split('T')[0]}-${data.hour < 12 ? 'morning' : 'afternoon'}`;
        
        const azimuthDiff = Math.abs(data.azimuth - fujiAzimuth);
        const normalizedDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
        
        // 方位角差が1.5度以内のみ採用
        if (normalizedDiff > 1.5) continue;
        
        // 既存のデータと比較
        const existing = processedDates.get(dateKey);
        if (!existing || normalizedDiff < existing.azimuthDiff) {
          const eventType = data.hour < 12 ? 'diamond_sunrise' : 'diamond_sunset';
          const { score, accuracy } = evaluateQuality(normalizedDiff, data.elevation);
          
          processedDates.set(dateKey, {
            locationId: location.id,
            eventDate: data.date,
            eventTime: data.time,
            eventType,
            azimuth: data.azimuth,
            altitude: data.elevation,
            qualityScore: score,
            accuracy,
            calculationYear: 2025,
            azimuthDiff: normalizedDiff
          });
        }
      }
      
      // MapからArrayに変換（azimuthDiffは除外）
      events.push(...Array.from(processedDates.values()).map(({ azimuthDiff, ...event }) => event));
      
      // イベントを挿入
      if (events.length > 0) {
        await prisma.locationFujiEvent.createMany({
          data: events
        });
        console.log(`  → ${events.length}件のダイヤモンド富士イベントを登録`);
      } else {
        console.log(`  → ダイヤモンド富士イベントなし`);
      }
    }
    
    // 統計情報
    const stats = await prisma.locationFujiEvent.groupBy({
      by: ['eventType'],
      where: {
        eventType: {
          in: ['diamond_sunrise', 'diamond_sunset']
        }
      },
      _count: true
    });
    
    console.log('\n=== 生成結果 ===');
    stats.forEach(stat => {
      console.log(`${stat.eventType}: ${stat._count}件`);
    });
    
    const total = await prisma.locationFujiEvent.count({
      where: {
        eventType: {
          in: ['diamond_sunrise', 'diamond_sunset']
        }
      }
    });
    console.log(`\n合計: ${total}件のダイヤモンド富士イベントを生成しました`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
generateDiamondFujiEvents().catch(console.error);