// APIをテストするためのスクリプト
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testDiamondFuji() {
  console.log('=== 富士山カレンダーアプリ API テスト ===\n');

  try {
    // 1. ヘルスチェック
    console.log('1. ヘルスチェック:');
    const health = await makeRequest('/api/health');
    console.log(JSON.stringify(health, null, 2));
    console.log('');

    // 2. 撮影地点一覧の取得
    console.log('2. 撮影地点一覧:');
    const locations = await makeRequest('/api/locations');
    console.log('撮影地点数:', locations.data?.locations?.length || 0);
    
    // 舞浜海岸を探す
    const maihamaLocation = locations.data?.locations?.find(loc => loc.name.includes('舞浜'));
    if (maihamaLocation) {
      console.log('舞浜海岸:', {
        id: maihamaLocation.id,
        name: maihamaLocation.name,
        prefecture: maihamaLocation.prefecture,
        latitude: maihamaLocation.latitude,
        longitude: maihamaLocation.longitude,
        elevation: maihamaLocation.elevation
      });
    } else {
      console.log('舞浜海岸が見つかりませんでした');
    }
    console.log('');

    // 3. 2025年10月のカレンダー取得
    console.log('3. 2025年10月のカレンダー:');
    const calendar = await makeRequest('/api/calendar/2025/10');
    console.log('イベント数:', calendar.events?.length || 0);
    
    // 10月23日のイベントを探す
    const oct23Events = calendar.events?.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === 23;
    });
    
    if (oct23Events && oct23Events.length > 0) {
      console.log('10月23日のイベント:');
      oct23Events.forEach(event => {
        console.log(`  - タイプ: ${event.type}`);
        console.log(`  - 日付: ${event.date}`);
        console.log(`  - イベント数: ${event.events.length}`);
        event.events.forEach(e => {
          console.log(`    * ${e.subType} ${e.type}: ${e.time} at ${e.location.name}`);
          console.log(`      方位角: ${e.azimuth.toFixed(2)}°, 高度: ${e.elevation.toFixed(2)}°`);
        });
      });
    } else {
      console.log('10月23日にはイベントがありません');
    }
    console.log('');

    // 4. 特定日（10月23日）のイベント詳細
    console.log('4. 2025年10月23日の詳細イベント:');
    const dayEvents = await makeRequest('/api/events/2025-10-23');
    console.log('詳細イベント数:', dayEvents.events?.length || 0);
    
    if (dayEvents.events && dayEvents.events.length > 0) {
      dayEvents.events.forEach(event => {
        console.log(`  - ${event.subType} ${event.type} at ${event.location.name}`);
        console.log(`    時刻: ${event.time}`);
        console.log(`    方位角: ${event.azimuth.toFixed(2)}°`);
        console.log(`    高度: ${event.elevation.toFixed(2)}°`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('APIテストエラー:', error.message);
  }
}

testDiamondFuji();