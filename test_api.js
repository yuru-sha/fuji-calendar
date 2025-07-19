// APIテスト用スクリプト
const http = require('http');

// 2月18日のイベントを取得
const options = {
  hostname: 'localhost',
  port: 8001,
  path: '/api/events/2025-02-18',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      // 舞浜海岸のイベントを探す
      if (json.events && Array.isArray(json.events)) {
        const maihamaEvents = json.events.filter(event => 
          event.location && event.location.name === '舞浜海岸'
        );
        
        if (maihamaEvents.length > 0) {
          console.log('\n舞浜海岸のダイヤモンド富士:');
          maihamaEvents.forEach(event => {
            console.log(`  時刻: ${event.time}`);
            console.log(`  タイプ: ${event.subType === 'sunset' ? '沈むダイヤモンド富士' : '昇るダイヤモンド富士'}`);
          });
        } else {
          console.log('\n舞浜海岸のイベントは見つかりませんでした');
        }
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();