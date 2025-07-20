// 推奨代替地点のINSERT文生成

const alternativeLocations = [
  {
    name: "高尾山山頂",
    prefecture: "東京都",
    latitude: 35.6256,
    longitude: 139.2431,
    elevation: 599,
    description: "東京都内の定番富士山撮影地。山頂からの眺望が素晴らしい",
    accessInfo: "京王線高尾山口駅からケーブルカー・リフト利用、徒歩1時間",
    warnings: "登山装備推奨。冬季は積雪・凍結注意"
  },
  {
    name: "陣馬山山頂",
    prefecture: "東京都",
    latitude: 35.6333,
    longitude: 139.1667,
    elevation: 855,
    description: "高尾山より高く、富士山の眺望が良い。白馬の像で有名",
    accessInfo: "JR中央線高尾駅からバス、登山道徒歩2時間",
    warnings: "本格的な登山。天候急変に注意"
  },
  {
    name: "奥多摩湖",
    prefecture: "東京都",
    latitude: 35.7833,
    longitude: 139.0167,
    elevation: 530,
    description: "東京都内で富士山が見える数少ない山間部の湖",
    accessInfo: "JR青梅線奥多摩駅からバス15分",
    warnings: "山間部のため気温差大。アクセス道路は狭い"
  },
  {
    name: "筑波山山頂",
    prefecture: "茨城県",
    latitude: 36.2167,
    longitude: 140.1000,
    elevation: 877,
    description: "関東平野から富士山を望む。日本百名山の一つ",
    accessInfo: "つくばエクスプレスつくば駅からバス、ケーブルカー利用",
    warnings: "天候により富士山が見えない場合多い。早朝推奨"
  },
  {
    name: "大山山頂",
    prefecture: "神奈川県",
    latitude: 35.4333,
    longitude: 139.2500,
    elevation: 1252,
    description: "丹沢山地の名峰。富士山の眺望が素晴らしい",
    accessInfo: "小田急線伊勢原駅からバス、ケーブルカー・登山道",
    warnings: "本格的な登山。天候急変・滑落注意"
  },
  {
    name: "丹沢・塔ノ岳",
    prefecture: "神奈川県",
    latitude: 35.4500,
    longitude: 139.1667,
    elevation: 1491,
    description: "丹沢主脈の主峰。富士山の大パノラマが楽しめる",
    accessInfo: "小田急線渋沢駅からバス、登山道徒歩4時間",
    warnings: "上級者向け登山。装備・体力必要"
  },
  {
    name: "伊豆・大室山",
    prefecture: "静岡県",
    latitude: 34.9000,
    longitude: 139.0833,
    elevation: 580,
    description: "お椀型の美しい山。リフトで山頂へアクセス可能",
    accessInfo: "JR伊東線伊東駅からバス35分、リフト利用",
    warnings: "リフト運行時間に注意。強風時運休あり"
  },
  {
    name: "伊豆・城ヶ崎海岸",
    prefecture: "静岡県",
    latitude: 34.9167,
    longitude: 139.1333,
    elevation: 20,
    description: "断崖絶壁から望む富士山。門脇つり橋で有名",
    accessInfo: "JR伊東線伊東駅からバス35分",
    warnings: "断崖注意。強風・高波時は危険"
  }
];

const FUJI_LAT = 35.3606;
const FUJI_LON = 138.7274;
const FUJI_ELEVATION = 3776;

/**
 * 富士山への方位角を計算
 */
function calculateBearingToFuji(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * 富士山への仰角を計算
 */
function calculateElevationToFuji(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const waterDistance = earthRadius * c;
  
  const heightDifference = (FUJI_ELEVATION - location.elevation) / 1000;
  const elevation = toDegrees(Math.atan(heightDifference / waterDistance));
  
  return elevation;
}

/**
 * 距離を計算
 */
function calculateDistance(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLat / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
}

/**
 * 代替地点のINSERT文を生成
 */
function generateAlternativeInserts() {
  console.log('=== 推奨代替地点 ===\n');
  
  const processedLocations = alternativeLocations.map(location => {
    const fujiAzimuth = calculateBearingToFuji(location);
    const fujiElevation = calculateElevationToFuji(location);
    const fujiDistance = calculateDistance(location);
    
    return {
      ...location,
      fujiAzimuth: fujiAzimuth,
      fujiElevation: fujiElevation,
      fujiDistance: fujiDistance
    };
  });
  
  // 詳細情報を表示
  processedLocations.forEach(location => {
    console.log(`${location.name} (${location.prefecture})`);
    console.log(`  座標: ${location.latitude}, ${location.longitude}`);
    console.log(`  標高: ${location.elevation}m`);
    console.log(`  富士山方位角: ${location.fujiAzimuth.toFixed(1)}°`);
    console.log(`  富士山仰角: ${location.fujiElevation.toFixed(1)}°`);
    console.log(`  富士山距離: ${location.fujiDistance.toFixed(1)}km`);
    console.log(`  アクセス: ${location.accessInfo}`);
    console.log(`  注意事項: ${location.warnings}`);
    console.log('');
  });
  
  console.log('\n=== SQL INSERT文 ===\n');
  
  processedLocations.forEach(location => {
    const sql = `INSERT INTO locations (name, prefecture, latitude, longitude, elevation, description, accessInfo, warnings, fujiAzimuth, fujiElevation, fujiDistance) VALUES (
  '${location.name}',
  '${location.prefecture}',
  ${location.latitude},
  ${location.longitude},
  ${location.elevation},
  '${location.description}',
  '${location.accessInfo}',
  '${location.warnings}',
  ${location.fujiAzimuth},
  ${location.fujiElevation},
  ${location.fujiDistance}
);`;
    console.log(sql);
    console.log('');
  });
  
  // 仰角順ランキング
  console.log('=== 撮影難易度順ランキング ===\n');
  const sortedByElevation = [...processedLocations].sort((a, b) => a.fujiElevation - b.fujiElevation);
  
  sortedByElevation.forEach((location, index) => {
    const difficulty = location.fujiElevation < 2 ? '易' : location.fujiElevation < 5 ? '中' : '難';
    console.log(`${index + 1}. ${location.name} (${location.prefecture}) - 仰角${location.fujiElevation.toFixed(1)}° [${difficulty}]`);
  });
}

// 実行
generateAlternativeInserts();