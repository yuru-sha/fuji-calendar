// 単一のAPIをテストするためのスクリプト
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

    console.log(`リクエスト: GET http://localhost:8000${path}`);

    const req = http.request(options, (res) => {
      console.log(`レスポンス: ${res.statusCode} ${res.statusMessage}`);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.log('JSONパースエラー、生データを返します');
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.error('リクエストエラー:', err);
      reject(err);
    });

    req.setTimeout(10000, () => {
      console.error('リクエストタイムアウト');
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testSingleAPI() {
  const path = process.argv[2] || '/api/calendar/2025/10';
  
  console.log(`=== API テスト: ${path} ===\n`);

  try {
    const result = await makeRequest(path);
    console.log('\n=== レスポンス ===');
    if (typeof result === 'object') {
      // 10月23日のイベントを特別に表示
      if (path.includes('/calendar/2025/10')) {
        console.log('年:', result.year);
        console.log('月:', result.month);
        console.log('イベント数:', result.events?.length || 0);
        
        const oct23Events = result.events?.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getDate() === 23;
        });
        
        if (oct23Events && oct23Events.length > 0) {
          console.log('\n=== 10月23日のダイヤモンド富士 ===');
          oct23Events.forEach(event => {
            console.log(`タイプ: ${event.type}`);
            console.log(`日付: ${event.date}`);
            console.log(`イベント数: ${event.events.length}`);
            event.events.forEach(e => {
              console.log(`  ${e.subType} ${e.type}:`);
              console.log(`    時刻: ${e.time}`);
              console.log(`    場所: ${e.location.name}`);
              console.log(`    方位角: ${e.azimuth.toFixed(2)}°`);
              console.log(`    高度: ${e.elevation.toFixed(2)}°`);
            });
          });
        } else {
          console.log('10月23日にはダイヤモンド富士イベントがありません');
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } else {
      console.log(result);
    }
  } catch (error) {
    console.error('APIテストエラー:', error.message);
  }
}

testSingleAPI();