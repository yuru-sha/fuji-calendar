// 2月17日〜19日の3日間をテスト
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

async function test3Days() {
  const dates = ['2025-02-17', '2025-02-18', '2025-02-19'];
  
  console.log('舞浜海岸のダイヤモンド富士（2月17日〜19日）\n');
  
  for (const date of dates) {
    try {
      const response = await fetchEvents(date);
      
      if (response.success && response.data && response.data.events) {
        const maihamaEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸'
        );
        
        console.log(`===== ${date} =====`);
        if (maihamaEvents.length > 0) {
          maihamaEvents.forEach(event => {
            const time = new Date(event.time);
            const jstTime = time.toLocaleString('ja-JP', { 
              timeZone: 'Asia/Tokyo',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            console.log(`✅ ダイヤモンド富士発見！`);
            console.log(`   時刻: ${jstTime} JST`);
            console.log(`   タイプ: ${event.subType === 'sunset' ? '沈むダイヤモンド富士' : '昇るダイヤモンド富士'}`);
            console.log(`   方位角: ${event.azimuth}度`);
            console.log(`   仰角: ${event.elevation}度`);
          });
        } else {
          console.log('❌ この日はダイヤモンド富士は発生しません');
        }
        console.log('');
      }
    } catch (error) {
      console.error(`${date} のデータ取得エラー:`, error.message);
    }
  }
  
  // 2/18 17:15との比較
  console.log('===== 2/18 17:15との比較 =====');
  try {
    const feb18Response = await fetchEvents('2025-02-18');
    if (feb18Response.success && feb18Response.data && feb18Response.data.events) {
      const maihamaEvents = feb18Response.data.events.filter(event => 
        event.location && event.location.name === '舞浜海岸'
      );
      
      if (maihamaEvents.length > 0) {
        const event = maihamaEvents[0];
        const eventTime = new Date(event.time);
        const expected = new Date('2025-02-18T17:15:00+09:00');
        const diffMinutes = Math.abs(eventTime.getTime() - expected.getTime()) / (1000 * 60);
        
        const jstTime = eventTime.toLocaleString('ja-JP', { 
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`期待時刻: 17:15 JST`);
        console.log(`計算時刻: ${jstTime} JST`);
        console.log(`時刻差: ${diffMinutes.toFixed(1)}分`);
        
        if (diffMinutes <= 5) {
          console.log('✅ 2/18 17:15のダイヤモンド富士が正しく検出されました！');
        } else {
          console.log('⚠️  期待値との差が5分を超えています');
        }
      }
    }
  } catch (error) {
    console.error('比較エラー:', error.message);
  }
}

test3Days();