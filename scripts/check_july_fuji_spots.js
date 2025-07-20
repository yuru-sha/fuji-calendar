const Astronomy = require('astronomy-engine');

// 7月にダイヤモンド富士・パール富士が見える可能性のある地点
const julyLocations = [
  // 富士山より北側の地点（夏至前後に太陽が北寄りになる）
  {
    name: "山中湖",
    prefecture: "山梨県",
    latitude: 35.4167,
    longitude: 138.8667,
    elevation: 980,
    description: "富士五湖で最も標高が高い。夏季のダイヤモンド富士で有名"
  },
  {
    name: "河口湖",
    prefecture: "山梨県",
    latitude: 35.5056,
    longitude: 138.7644,
    elevation: 833,
    description: "富士五湖の代表。夏季の早朝ダイヤモンド富士"
  },
  {
    name: "精進湖",
    prefecture: "山梨県",
    latitude: 35.4833,
    longitude: 138.6167,
    elevation: 900,
    description: "子抱き富士で有名。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "本栖湖",
    prefecture: "山梨県",
    latitude: 35.4667,
    longitude: 138.5833,
    elevation: 900,
    description: "千円札の富士山。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "西湖",
    prefecture: "山梨県",
    latitude: 35.4833,
    longitude: 138.7167,
    elevation: 900,
    description: "富士五湖の一つ。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "朝霧高原",
    prefecture: "静岡県",
    latitude: 35.4000,
    longitude: 138.5500,
    elevation: 700,
    description: "富士山の絶景スポット。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "田貫湖",
    prefecture: "静岡県",
    latitude: 35.3333,
    longitude: 138.6167,
    elevation: 650,
    description: "ダイヤモンド富士の超有名地。春と秋が有名だが夏も可能性"
  },
  {
    name: "富士宮市街",
    prefecture: "静岡県",
    latitude: 35.2167,
    longitude: 138.6167,
    elevation: 100,
    description: "富士山南麓の市街地。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "御殿場市街",
    prefecture: "静岡県",
    latitude: 35.3000,
    longitude: 138.9333,
    elevation: 450,
    description: "富士山東麓の市街地。夏季の日の出ダイヤモンド富士"
  },
  {
    name: "忍野八海",
    prefecture: "山梨県",
    latitude: 35.4500,
    longitude: 138.8333,
    elevation: 940,
    description: "富士山の湧水群。夏季の日の出ダイヤモンド富士"
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
 * 太陽位置を計算
 */
function calculateSunPosition(time, location) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  
  return {
    azimuth: horizontal.azimuth,
    elevation: horizontal.altitude
  };
}

/**
 * 7月のダイヤモンド富士・パール富士をチェック
 */
function checkJulyFujiEvents() {
  console.log('=== 7月のダイヤモンド富士・パール富士チェック ===\n');
  
  // 7月の代表的な日付
  const julyDates = [
    new Date(2025, 6, 1),   // 7月1日
    new Date(2025, 6, 10),  // 7月10日
    new Date(2025, 6, 20),  // 7月20日
    new Date(2025, 6, 31)   // 7月31日
  ];
  
  const results = [];
  
  for (const location of julyLocations) {
    const fujiAzimuth = calculateBearingToFuji(location);
    const fujiElevation = calculateElevationToFuji(location);
    const fujiDistance = calculateDistance(location);
    
    console.log(`--- ${location.name} (${location.prefecture}) ---`);
    console.log(`富士山方位角: ${fujiAzimuth.toFixed(1)}°`);
    console.log(`富士山仰角: ${fujiElevation.toFixed(1)}°`);
    console.log(`富士山距離: ${fujiDistance.toFixed(1)}km`);
    
    const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
    
    let bestMatches = [];
    
    for (const date of julyDates) {
      try {
        // 日の出・日の入り時刻を取得
        const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, date, 1);
        const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 1);
        
        // 日の出をチェック
        if (sunrise) {
          const sunrisePos = calculateSunPosition(sunrise.date, location);
          const azimuthDiff = Math.abs(sunrisePos.azimuth - fujiAzimuth);
          const elevationDiff = Math.abs(sunrisePos.elevation - fujiElevation);
          
          if (azimuthDiff <= 5 && elevationDiff <= 3) {
            bestMatches.push({
              date: date,
              type: 'sunrise',
              time: sunrise.date,
              sunAzimuth: sunrisePos.azimuth,
              sunElevation: sunrisePos.elevation,
              azimuthDiff: azimuthDiff,
              elevationDiff: elevationDiff,
              score: azimuthDiff + elevationDiff
            });
          }
        }
        
        // 日の入りをチェック
        if (sunset) {
          const sunsetPos = calculateSunPosition(sunset.date, location);
          const azimuthDiff = Math.abs(sunsetPos.azimuth - fujiAzimuth);
          const elevationDiff = Math.abs(sunsetPos.elevation - fujiElevation);
          
          if (azimuthDiff <= 5 && elevationDiff <= 3) {
            bestMatches.push({
              date: date,
              type: 'sunset',
              time: sunset.date,
              sunAzimuth: sunsetPos.azimuth,
              sunElevation: sunsetPos.elevation,
              azimuthDiff: azimuthDiff,
              elevationDiff: elevationDiff,
              score: azimuthDiff + elevationDiff
            });
          }
        }
      } catch (error) {
        // エラーは無視
      }
    }
    
    if (bestMatches.length > 0) {
      bestMatches.sort((a, b) => a.score - b.score);
      const bestMatch = bestMatches[0];
      
      console.log('✅ ダイヤモンド富士の可能性あり!');
      console.log(`最適日時: ${bestMatch.date.toLocaleDateString('ja-JP')} ${bestMatch.time.toLocaleTimeString('ja-JP')}`);
      console.log(`タイプ: ${bestMatch.type === 'sunrise' ? '日の出' : '日の入り'}`);
      console.log(`太陽方位角: ${bestMatch.sunAzimuth.toFixed(1)}°`);
      console.log(`太陽仰角: ${bestMatch.sunElevation.toFixed(1)}°`);
      console.log(`方位角差: ${bestMatch.azimuthDiff.toFixed(1)}°`);
      console.log(`仰角差: ${bestMatch.elevationDiff.toFixed(1)}°`);
      console.log(`スコア: ${bestMatch.score.toFixed(2)}`);
      
      results.push({
        location: location.name,
        prefecture: location.prefecture,
        bestMatch: bestMatch,
        fujiDistance: fujiDistance
      });
    } else {
      console.log('❌ 7月のダイヤモンド富士は困難');
    }
    
    console.log('');
  }
  
  // 結果をスコア順にソート
  results.sort((a, b) => a.bestMatch.score - b.bestMatch.score);
  
  console.log('=== 7月のダイヤモンド富士ランキング ===\n');
  
  if (results.length === 0) {
    console.log('7月にダイヤモンド富士が見える地点は見つかりませんでした。');
    console.log('夏季は太陽の軌道が北寄りになるため、富士山より南側の地点では困難です。');
  } else {
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.location} (${result.prefecture})`);
      console.log(`   日時: ${result.bestMatch.date.toLocaleDateString('ja-JP')} ${result.bestMatch.time.toLocaleTimeString('ja-JP')}`);
      console.log(`   タイプ: ${result.bestMatch.type === 'sunrise' ? '日の出' : '日の入り'}`);
      console.log(`   スコア: ${result.bestMatch.score.toFixed(2)}`);
      console.log(`   距離: ${result.fujiDistance.toFixed(1)}km`);
      console.log('');
    });
  }
  
  // 7月の太陽軌道の特徴を説明
  console.log('=== 7月の太陽軌道の特徴 ===\n');
  console.log('夏至（6月21日頃）前後の7月は、太陽の軌道が最も北寄りになります。');
  console.log('そのため、以下の特徴があります：');
  console.log('');
  console.log('1. 日の出方位角: 約60-70°（北東）');
  console.log('2. 日の入り方位角: 約290-300°（北西）');
  console.log('3. 富士山より北側の地点でダイヤモンド富士が見やすい');
  console.log('4. 富士五湖エリアが最も有望');
  console.log('5. パール富士は月の軌道により変動するため、個別計算が必要');
  
  // 実際の7月の太陽軌道を山中湖で確認
  console.log('\n=== 山中湖での7月の太陽軌道 ===\n');
  const yamanakako = julyLocations.find(l => l.name === "山中湖");
  const yamanakako_observer = new Astronomy.Observer(yamanakako.latitude, yamanakako.longitude, yamanakako.elevation);
  
  for (const date of julyDates) {
    try {
      const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, yamanakako_observer, 1, date, 1);
      const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, yamanakako_observer, -1, date, 1);
      
      if (sunrise && sunset) {
        const sunrisePos = calculateSunPosition(sunrise.date, yamanakako);
        const sunsetPos = calculateSunPosition(sunset.date, yamanakako);
        
        console.log(`${date.toLocaleDateString('ja-JP')}:`);
        console.log(`  日の出: ${sunrise.date.toLocaleTimeString('ja-JP')} 方位角${sunrisePos.azimuth.toFixed(1)}°`);
        console.log(`  日の入り: ${sunset.date.toLocaleTimeString('ja-JP')} 方位角${sunsetPos.azimuth.toFixed(1)}°`);
      }
    } catch (error) {
      // エラーは無視
    }
  }
}

// 実行
checkJulyFujiEvents();