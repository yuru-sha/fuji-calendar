// APIの直接テスト
const http = require('http');

function testAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'GET',
      timeout: 30000 // 30秒のタイムアウト
    };

    console.log(`テスト開始: GET http://localhost:8000${path}`);
    const startTime = Date.now();

    const req = http.request(options, (res) => {
      console.log(`レスポンス: ${res.statusCode} ${res.statusMessage}`);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`完了時間: ${duration}ms`);
        
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.log('JSONパースエラー');
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.error('リクエストエラー:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('リクエストタイムアウト (30秒)');
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  try {
    // 1. ヘルスチェック
    console.log('\n=== 1. ヘルスチェック ===');
    const health = await testAPI('/api/health');
    console.log('結果:', health);

    // 2. ロケーション取得
    console.log('\n=== 2. ロケーション取得 ===');
    const locations = await testAPI('/api/locations');
    console.log('地点数:', locations.data?.locations?.length || 0);

    // 3. 特定日のイベント（10/23）
    console.log('\n=== 3. 2025年10月23日のイベント ===');
    const dayEvents = await testAPI('/api/events/2025-10-23');
    console.log('イベント数:', dayEvents.events?.length || 0);
    
    if (dayEvents.events && dayEvents.events.length > 0) {
      console.log('イベント詳細:');
      dayEvents.events.forEach(event => {
        console.log(`  ${event.subType} ${event.type} at ${event.location.name}`);
        console.log(`  時刻: ${event.time}`);
        console.log(`  方位角: ${event.azimuth.toFixed(2)}°, 高度: ${event.elevation.toFixed(2)}°`);
      });
    }

    // 4. 軽量なカレンダー（今月）
    console.log('\n=== 4. 今月のカレンダー (軽量版) ===');
    try {
      const calendar = await testAPI('/api/calendar/2025/7');
      console.log('カレンダー取得成功:', {
        year: calendar.year,
        month: calendar.month,
        eventCount: calendar.events?.length || 0
      });
    } catch (error) {
      console.log('カレンダー取得失敗:', error.message);
    }

  } catch (error) {
    console.error('テスト失敗:', error.message);
  }
}

runTests();