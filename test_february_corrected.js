// 修正座標での2月のダイヤモンド富士検証
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

async function testFebruaryCorrected() {
  console.log('修正座標での2月のダイヤモンド富士検証');
  console.log('座標: 35.623181, 139.883224, 標高3m\n');
  
  const testDates = ['2025-02-16', '2025-02-17', '2025-02-18', '2025-02-19', '2025-02-20'];
  
  for (const date of testDates) {
    console.log(`===== ${date} =====`);
    
    try {
      const response = await fetchEvents(date);
      
      if (response.success && response.data && response.data.events) {
        // 修正座標のイベント
        const correctedLocationEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸修正' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        // 元座標のイベント
        const originalEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        // 修正座標の結果
        if (correctedLocationEvents.length > 0) {
          const event = correctedLocationEvents[0];
          const time = new Date(event.time);
          const jstTime = time.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`修正座標: ✅ ${jstTime} JST`);
          console.log(`   方位角: ${event.azimuth.toFixed(4)}度, 仰角: ${event.elevation.toFixed(4)}度`);
        } else {
          console.log(`修正座標: ❌ 検出なし`);
        }
        
        // 元座標の結果
        if (originalEvents.length > 0) {
          const event = originalEvents[0];
          const time = new Date(event.time);
          const jstTime = time.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`元座標:   ✅ ${jstTime} JST`);
          console.log(`   方位角: ${event.azimuth.toFixed(4)}度, 仰角: ${event.elevation.toFixed(4)}度`);
        } else {
          console.log(`元座標:   ❌ 検出なし`);
        }
        
        // 時刻差の計算
        if (correctedLocationEvents.length > 0 && originalEvents.length > 0) {
          const correctedTime = new Date(correctedLocationEvents[0].time);
          const originalTime = new Date(originalEvents[0].time);
          const diffMinutes = (correctedTime.getTime() - originalTime.getTime()) / (1000 * 60);
          console.log(`   時刻差: ${diffMinutes > 0 ? '+' : ''}${diffMinutes.toFixed(1)}分`);
        }
        
      } else {
        console.log(`❌ API応答エラー`);
      }
    } catch (error) {
      console.error(`❌ ${date} エラー:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('===== 期待値との比較 =====');
  console.log('2/18の期待時刻: 17:15 JST');
  
  try {
    const response = await fetchEvents('2025-02-18');
    if (response.success && response.data && response.data.events) {
      const correctedEvent = response.data.events.find(event => 
        event.location && event.location.name === '舞浜海岸修正' && 
        event.type === 'diamond' && event.subType === 'sunset'
      );
      
      if (correctedEvent) {
        const time = new Date(correctedEvent.time);
        const expectedTime = new Date('2025-02-18T17:15:00+09:00');
        const diffMinutes = (time.getTime() - expectedTime.getTime()) / (1000 * 60);
        
        const jstTime = time.toLocaleString('ja-JP', { 
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`修正座標での2/18: ${jstTime} JST`);
        console.log(`期待値17:15からの差: ${diffMinutes > 0 ? '+' : ''}${diffMinutes.toFixed(1)}分`);
        
        if (Math.abs(diffMinutes) <= 3) {
          console.log('✅ 期待値に非常に近い精度です！');
        } else {
          console.log('⚠️  期待値からやや離れています');
        }
      }
    }
  } catch (error) {
    console.error('期待値比較エラー:', error.message);
  }
}

testFebruaryCorrected();