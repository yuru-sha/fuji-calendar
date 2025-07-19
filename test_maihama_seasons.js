// 舞浜海岸の2つのダイヤモンド富士シーズンをテスト
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

async function testMaihama() {
  console.log('舞浜海岸のダイヤモンド富士検証\n');
  
  const testDates = [
    { date: '2025-02-18', expected: '17:15', season: '冬季' },
    { date: '2025-10-23', expected: '16:40', season: '秋季' }
  ];
  
  for (const test of testDates) {
    console.log(`===== ${test.date} (${test.season}) =====`);
    console.log(`期待時刻: ${test.expected} JST`);
    
    try {
      const response = await fetchEvents(test.date);
      
      if (response.success && response.data && response.data.events) {
        const maihamaEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        if (maihamaEvents.length > 0) {
          const event = maihamaEvents[0];
          const time = new Date(event.time);
          const jstTime = time.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`✅ ダイヤモンド富士発見！`);
          console.log(`   実際時刻: ${jstTime} JST`);
          console.log(`   方位角: ${event.azimuth.toFixed(2)}度`);
          console.log(`   仰角: ${event.elevation.toFixed(2)}度`);
          
          // 期待時刻との比較
          const [expectedHour, expectedMinute] = test.expected.split(':').map(Number);
          const expectedTime = new Date(test.date + 'T' + test.expected + ':00+09:00');
          const diffMinutes = Math.abs(time.getTime() - expectedTime.getTime()) / (1000 * 60);
          
          console.log(`   期待時刻との差: ${diffMinutes.toFixed(1)}分`);
          
          if (diffMinutes <= 10) {
            console.log(`   ✅ 期待値に近い時刻で検出されました！`);
          } else {
            console.log(`   ⚠️  期待値から${diffMinutes.toFixed(1)}分離れています`);
          }
        } else {
          console.log(`❌ この日はダイヤモンド富士は検出されませんでした`);
        }
      } else {
        console.log(`❌ APIエラーまたはデータなし`);
      }
    } catch (error) {
      console.error(`❌ ${test.date} のデータ取得エラー:`, error.message);
    }
    
    console.log('');
  }
}

testMaihama();