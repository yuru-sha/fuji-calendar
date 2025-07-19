// 10月のダイヤモンド富士検出をデバッグ
const http = require('http');

function fetchEvents(date) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8001,
      path: `/api/events/${date}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function debugOctober() {
  console.log('10月のダイヤモンド富士検出状況（舞浜海岸）\n');
  
  // 10月15日〜31日をテスト
  for (let day = 15; day <= 31; day++) {
    const date = `2025-10-${day.toString().padStart(2, '0')}`;
    
    try {
      const response = await fetchEvents(date);
      
      if (response.success && response.data && response.data.events) {
        const maihamaEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸' && event.type === 'diamond'
        );
        
        if (maihamaEvents.length > 0) {
          const event = maihamaEvents[0];
          const time = new Date(event.time);
          const jstTime = time.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`10月${day}日: ✅ ${jstTime} JST (${event.subType})`);
        } else {
          console.log(`10月${day}日: -`);
        }
      } else {
        console.log(`10月${day}日: エラー`);
      }
    } catch (error) {
      console.error(`10月${day}日: API エラー`);
    }
  }
}

debugOctober();