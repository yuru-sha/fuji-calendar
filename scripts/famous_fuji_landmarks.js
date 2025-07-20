// ダイヤモンド富士・パール富士の有名撮影地点

const famousLandmarks = [
  // === 東京都 ===
  {
    name: "東京スカイツリー",
    prefecture: "東京都",
    latitude: 35.7101,
    longitude: 139.8107,
    elevation: 350, // 展望台
    description: "東京の新しいシンボル。展望台からの富士山撮影で有名",
    accessInfo: "東武スカイツリーライン とうきょうスカイツリー駅直結",
    warnings: "有料展望台。混雑時は事前予約推奨",
    category: "tower"
  },
  {
    name: "東京タワー",
    prefecture: "東京都",
    latitude: 35.6586,
    longitude: 139.7454,
    elevation: 250, // 展望台
    description: "東京のランドマーク。特別展望台からのダイヤモンド富士撮影",
    accessInfo: "JR山手線神谷町駅徒歩7分、都営地下鉄赤羽橋駅徒歩5分",
    warnings: "有料展望台。天候により富士山が見えない場合あり",
    category: "tower"
  },
  {
    name: "六本木ヒルズ森タワー",
    prefecture: "東京都",
    latitude: 35.6606,
    longitude: 139.7298,
    elevation: 270, // 展望台
    description: "都心からの富士山撮影の定番スポット",
    accessInfo: "東京メトロ日比谷線六本木駅直結",
    warnings: "有料展望台。混雑時は入場制限あり",
    category: "building"
  },
  {
    name: "新宿都庁展望室",
    prefecture: "東京都",
    latitude: 35.6896,
    longitude: 139.6917,
    elevation: 202, // 45階展望室
    description: "無料で楽しめる都心からの富士山撮影スポット",
    accessInfo: "JR新宿駅西口徒歩10分、都営地下鉄都庁前駅直結",
    warnings: "無料だが営業時間に注意。年末年始休業あり",
    category: "government"
  },

  // === 神奈川県 ===
  {
    name: "江ノ島",
    prefecture: "神奈川県",
    latitude: 35.2989,
    longitude: 139.4803,
    elevation: 60,
    description: "湘南の象徴。ダイヤモンド富士・パール富士の超有名撮影地",
    accessInfo: "小田急江ノ島線片瀬江ノ島駅徒歩15分",
    warnings: "混雑時は早めの場所取りが必要。潮位に注意",
    category: "island"
  },
  {
    name: "鎌倉高校前踏切",
    prefecture: "神奈川県",
    latitude: 35.3067,
    longitude: 139.5014,
    elevation: 12,
    description: "アニメ聖地としても有名。海越しの富士山撮影",
    accessInfo: "江ノ島電鉄鎌倉高校前駅徒歩1分",
    warnings: "踏切付近は交通安全に注意。撮影マナーを守る",
    category: "coast"
  },
  {
    name: "横浜ランドマークタワー",
    prefecture: "神奈川県",
    latitude: 35.4546,
    longitude: 139.6317,
    elevation: 296, // 69階展望台
    description: "横浜のシンボル。みなとみらいからの富士山撮影",
    accessInfo: "JRみなとみらい線みなとみらい駅直結",
    warnings: "有料展望台。天候により富士山が見えない場合あり",
    category: "tower"
  },
  {
    name: "箱根・芦ノ湖",
    prefecture: "神奈川県",
    latitude: 35.2000,
    longitude: 139.0167,
    elevation: 723,
    description: "富士山に最も近い撮影地の一つ。逆さ富士でも有名",
    accessInfo: "JR東海道線小田原駅からバス1時間",
    warnings: "標高が高く気温差に注意。湖畔は風が強い場合あり",
    category: "lake"
  },

  // === 千葉県 ===
  {
    name: "千葉ポートタワー",
    prefecture: "千葉県",
    latitude: 35.6006,
    longitude: 140.1069,
    elevation: 125, // 展望台
    description: "千葉港のシンボル。東京湾越しの富士山撮影",
    accessInfo: "JR京葉線千葉みなと駅徒歩12分",
    warnings: "営業時間内のみ利用可能。強風時は展望台閉鎖の場合あり",
    category: "tower"
  },
  {
    name: "犬吠埼灯台",
    prefecture: "千葉県",
    latitude: 35.7069,
    longitude: 140.8694,
    elevation: 52, // 灯台上部
    description: "本州最東端。日の出とダイヤモンド富士の組み合わせ",
    accessInfo: "JR総武本線銚子駅からバス20分",
    warnings: "灯台内部は有料。強風・悪天候時は登れない場合あり",
    category: "lighthouse"
  },

  // === 静岡県 ===
  {
    name: "田貫湖",
    prefecture: "静岡県",
    latitude: 35.3333,
    longitude: 138.6167,
    elevation: 650,
    description: "ダイヤモンド富士の超有名撮影地。逆さ富士も美しい",
    accessInfo: "JR身延線富士宮駅からバス50分",
    warnings: "早朝撮影が多く、駐車場は満車になりやすい",
    category: "lake"
  },
  {
    name: "三保松原",
    prefecture: "静岡県",
    latitude: 34.9833,
    longitude: 138.5167,
    elevation: 2,
    description: "世界文化遺産。松林越しの富士山撮影で有名",
    accessInfo: "JR東海道線清水駅からバス25分",
    warnings: "観光地のため混雑。駐車場有料",
    category: "coast"
  },
  {
    name: "日本平",
    prefecture: "静岡県",
    latitude: 34.9667,
    longitude: 138.3833,
    elevation: 300,
    description: "富士山の絶景スポット。ロープウェイでアクセス",
    accessInfo: "JR東海道線静岡駅からバス40分",
    warnings: "ロープウェイの運行時間に注意",
    category: "mountain"
  },

  // === 山梨県 ===
  {
    name: "河口湖",
    prefecture: "山梨県",
    latitude: 35.5056,
    longitude: 138.7644,
    elevation: 833,
    description: "富士五湖の代表。逆さ富士の撮影地として世界的に有名",
    accessInfo: "JR中央線大月駅から富士急行線河口湖駅",
    warnings: "観光シーズンは大変混雑。早朝撮影推奨",
    category: "lake"
  },
  {
    name: "山中湖",
    prefecture: "山梨県",
    latitude: 35.4167,
    longitude: 138.8667,
    elevation: 980,
    description: "富士五湖で最も標高が高い。ダイヤモンド富士の名所",
    accessInfo: "JR中央線大月駅から富士急行線富士山駅、バス25分",
    warnings: "標高が高く朝晩は冷え込む。防寒対策必要",
    category: "lake"
  },
  {
    name: "精進湖",
    prefecture: "山梨県",
    latitude: 35.4833,
    longitude: 138.6167,
    elevation: 900,
    description: "富士五湖で最も小さく静寂。子抱き富士で有名",
    accessInfo: "JR中央線大月駅から富士急行線河口湖駅、バス30分",
    warnings: "アクセスがやや不便。公共交通機関の本数少ない",
    category: "lake"
  },

  // === 埼玉県 ===
  {
    name: "秩父・美の山公園",
    prefecture: "埼玉県",
    latitude: 36.0167,
    longitude: 139.0833,
    elevation: 586,
    description: "関東平野を一望。雲海と富士山の組み合わせが美しい",
    accessInfo: "秩父鉄道皆野駅からバス、徒歩",
    warnings: "山道のため車でのアクセス推奨。冬季は路面凍結注意",
    category: "mountain"
  }
];

/**
 * 富士山への方位角を計算
 */
function calculateBearingToFuji(location) {
  const FUJI_LAT = 35.3606;
  const FUJI_LON = 138.7274;
  
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
  const FUJI_LAT = 35.3606;
  const FUJI_LON = 138.7274;
  const FUJI_ELEVATION = 3776;
  
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
  const FUJI_LAT = 35.3606;
  const FUJI_LON = 138.7274;
  
  const toRadians = (degrees) => degrees * Math.PI / 180;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.latitude);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
}

/**
 * 各地点の富士山データを計算して表示
 */
function generateLandmarkData() {
  console.log('=== ダイヤモンド富士・パール富士 有名撮影地点 ===\n');
  
  const processedLandmarks = famousLandmarks.map(location => {
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
  
  // カテゴリ別に整理
  const categories = {
    tower: '展望タワー',
    building: '高層ビル',
    coast: '海岸・湖岸',
    lake: '湖',
    mountain: '山・高原',
    island: '島',
    lighthouse: '灯台',
    government: '公共施設'
  };
  
  Object.entries(categories).forEach(([categoryKey, categoryName]) => {
    const categoryLandmarks = processedLandmarks.filter(l => l.category === categoryKey);
    if (categoryLandmarks.length > 0) {
      console.log(`--- ${categoryName} ---`);
      categoryLandmarks.forEach(location => {
        console.log(`${location.name} (${location.prefecture})`);
        console.log(`  座標: ${location.latitude}, ${location.longitude}`);
        console.log(`  標高: ${location.elevation}m`);
        console.log(`  富士山方位角: ${location.fujiAzimuth.toFixed(1)}°`);
        console.log(`  富士山仰角: ${location.fujiElevation.toFixed(1)}°`);
        console.log(`  富士山距離: ${location.fujiDistance.toFixed(1)}km`);
        console.log(`  アクセス: ${location.accessInfo}`);
        if (location.warnings) {
          console.log(`  注意事項: ${location.warnings}`);
        }
        console.log('');
      });
    }
  });
  
  // SQL INSERT文を生成
  console.log('\n=== SQL INSERT文 ===\n');
  
  processedLandmarks.forEach(location => {
    const sql = `INSERT INTO locations (name, prefecture, latitude, longitude, elevation, description, accessInfo, warnings, fujiAzimuth, fujiElevation, fujiDistance) VALUES (
  '${location.name}',
  '${location.prefecture}',
  ${location.latitude},
  ${location.longitude},
  ${location.elevation},
  '${location.description}',
  '${location.accessInfo}',
  ${location.warnings ? `'${location.warnings}'` : 'NULL'},
  ${location.fujiAzimuth},
  ${location.fujiElevation},
  ${location.fujiDistance}
);`;
    console.log(sql);
  });
  
  // 距離順ランキング
  console.log('\n=== 富士山からの距離順ランキング ===\n');
  const sortedByDistance = [...processedLandmarks].sort((a, b) => a.fujiDistance - b.fujiDistance);
  
  sortedByDistance.forEach((location, index) => {
    console.log(`${index + 1}. ${location.name} (${location.prefecture}) - ${location.fujiDistance.toFixed(1)}km`);
  });
  
  // 仰角順ランキング（低い順 = 遠くて撮影しやすい）
  console.log('\n=== 富士山仰角順ランキング（撮影難易度順） ===\n');
  const sortedByElevation = [...processedLandmarks].sort((a, b) => a.fujiElevation - b.fujiElevation);
  
  sortedByElevation.forEach((location, index) => {
    const difficulty = location.fujiElevation < 2 ? '易' : location.fujiElevation < 5 ? '中' : '難';
    console.log(`${index + 1}. ${location.name} (${location.prefecture}) - 仰角${location.fujiElevation.toFixed(1)}° [${difficulty}]`);
  });
}

// 実行
generateLandmarkData();