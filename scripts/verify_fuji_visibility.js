// 富士山の可視性を地理的に検証

const locations = [
  { name: "東京スカイツリー", lat: 35.7101, lon: 139.8107, elevation: 350 },
  { name: "東京タワー", lat: 35.6586, lon: 139.7454, elevation: 250 },
  { name: "六本木ヒルズ森タワー", lat: 35.6606, lon: 139.7298, elevation: 270 },
  { name: "新宿都庁展望室", lat: 35.6896, lon: 139.6917, elevation: 202 },
  { name: "江ノ島", lat: 35.2989, lon: 139.4803, elevation: 60 },
  { name: "鎌倉高校前踏切", lat: 35.3067, lon: 139.5014, elevation: 12 },
  { name: "横浜ランドマークタワー", lat: 35.4546, lon: 139.6317, elevation: 296 },
  { name: "箱根・芦ノ湖", lat: 35.2000, lon: 139.0167, elevation: 723 },
  { name: "千葉ポートタワー", lat: 35.6006, lon: 140.1069, elevation: 125 },
  { name: "犬吠埼灯台", lat: 35.7069, lon: 140.8694, elevation: 52 },
  { name: "田貫湖", lat: 35.3333, lon: 138.6167, elevation: 650 },
  { name: "三保松原", lat: 34.9833, lon: 138.5167, elevation: 2 },
  { name: "日本平", lat: 34.9667, lon: 138.3833, elevation: 300 },
  { name: "河口湖", lat: 35.5056, lon: 138.7644, elevation: 833 },
  { name: "山中湖", lat: 35.4167, lon: 138.8667, elevation: 980 },
  { name: "精進湖", lat: 35.4833, lon: 138.6167, elevation: 900 },
  { name: "秩父・美の山公園", lat: 36.0167, lon: 139.0833, elevation: 586 } // 問題の地点
];

const FUJI_LAT = 35.3606;
const FUJI_LON = 138.7274;

/**
 * 富士山への方位角を計算
 */
function calculateBearingToFuji(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;
  
  const lat1 = toRadians(location.lat);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLon = toRadians(FUJI_LON - location.lon);
  
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * 距離を計算
 */
function calculateDistance(location) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  
  const earthRadius = 6371; // km
  const lat1 = toRadians(location.lat);
  const lat2 = toRadians(FUJI_LAT);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(FUJI_LON - location.lon);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
}

/**
 * 地理的な可視性をチェック
 */
function checkGeographicalVisibility() {
  console.log('=== 富士山可視性の地理的検証 ===\n');
  
  const problematicLocations = [];
  
  locations.forEach(location => {
    const bearing = calculateBearingToFuji(location);
    const distance = calculateDistance(location);
    
    let issues = [];
    let visibility = '✅ 可視';
    
    // 地理的な問題をチェック
    
    // 1. 秩父地域（山に遮られる）
    if (location.lat > 35.9 && location.lon < 139.2) {
      issues.push('秩父山地に遮られる可能性');
      visibility = '❌ 不可視';
    }
    
    // 2. 房総半島南部（距離が遠すぎる + 地球の曲率）
    if (location.lat < 35.0 && location.lon > 140.0 && distance > 150) {
      issues.push('距離が遠すぎる（150km超）');
      visibility = '⚠️ 困難';
    }
    
    // 3. 富士山より北で西側（地形的に困難）
    if (location.lat > 35.5 && location.lon < 138.5) {
      issues.push('富士山より北西の位置で地形的に困難');
      visibility = '⚠️ 困難';
    }
    
    // 4. 極端に遠い地点（200km超）
    if (distance > 200) {
      issues.push('極端に遠距離（200km超）');
      visibility = '⚠️ 困難';
    }
    
    // 5. 富士山の真北（丹沢山地に遮られる可能性）
    if (bearing > 350 || bearing < 10) {
      issues.push('富士山の真北方向（丹沢山地に遮られる可能性）');
      visibility = '⚠️ 困難';
    }
    
    console.log(`${location.name}:`);
    console.log(`  座標: ${location.lat}, ${location.lon}`);
    console.log(`  方位角: ${bearing.toFixed(1)}°`);
    console.log(`  距離: ${distance.toFixed(1)}km`);
    console.log(`  可視性: ${visibility}`);
    
    if (issues.length > 0) {
      console.log(`  問題点:`);
      issues.forEach(issue => console.log(`    - ${issue}`));
      problematicLocations.push({
        name: location.name,
        issues: issues,
        visibility: visibility
      });
    }
    
    console.log('');
  });
  
  console.log('=== 問題のある地点まとめ ===\n');
  
  if (problematicLocations.length === 0) {
    console.log('すべての地点で富士山が見える可能性があります。');
  } else {
    problematicLocations.forEach(location => {
      console.log(`${location.name} (${location.visibility}):`);
      location.issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('');
    });
  }
  
  // 推奨する代替地点
  console.log('=== 推奨代替地点 ===\n');
  
  const alternatives = [
    {
      name: "奥多摩湖",
      prefecture: "東京都",
      lat: 35.7833,
      lon: 139.0167,
      elevation: 530,
      description: "東京都内で富士山が見える数少ない山間部"
    },
    {
      name: "高尾山",
      prefecture: "東京都", 
      lat: 35.6256,
      lon: 139.2431,
      elevation: 599,
      description: "東京都内の定番富士山撮影地"
    },
    {
      name: "陣馬山",
      prefecture: "東京都",
      lat: 35.6333,
      lon: 139.1667,
      elevation: 855,
      description: "高尾山より高く、富士山の眺望が良い"
    },
    {
      name: "筑波山",
      prefecture: "茨城県",
      lat: 36.2167,
      lon: 140.1000,
      elevation: 877,
      description: "関東平野から富士山を望む"
    }
  ];
  
  alternatives.forEach(alt => {
    const bearing = calculateBearingToFuji(alt);
    const distance = calculateDistance(alt);
    
    console.log(`${alt.name} (${alt.prefecture}):`);
    console.log(`  座標: ${alt.lat}, ${alt.lon}`);
    console.log(`  標高: ${alt.elevation}m`);
    console.log(`  方位角: ${bearing.toFixed(1)}°`);
    console.log(`  距離: ${distance.toFixed(1)}km`);
    console.log(`  説明: ${alt.description}`);
    console.log('');
  });
}

// 実行
checkGeographicalVisibility();