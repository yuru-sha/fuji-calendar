// 修正座標での10/23 16:45検証
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

async function testCorrectedCoordinates() {
  console.log('修正座標での10/23ダイヤモンド富士検証');
  console.log('座標: 35.623181, 139.883224, 標高3m');
  console.log('期待時刻: 16:45 JST\n');
  
  const testDates = ['2025-10-22', '2025-10-23', '2025-10-24'];
  
  for (const date of testDates) {
    console.log(`===== ${date} =====`);
    
    try {
      const response = await fetchEvents(date);
      
      if (response.success && response.data && response.data.events) {
        const correctedLocationEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸修正' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        if (correctedLocationEvents.length > 0) {
          correctedLocationEvents.forEach(event => {
            const time = new Date(event.time);
            const jstTime = time.toLocaleString('ja-JP', { 
              timeZone: 'Asia/Tokyo',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            console.log(`✅ ダイヤモンド富士検出`);
            console.log(`   時刻: ${jstTime} JST`);
            console.log(`   方位角: ${event.azimuth.toFixed(4)}度`);
            console.log(`   仰角: ${event.elevation.toFixed(4)}度`);
            
            // 期待値16:45との比較
            const expectedTime = new Date(date + 'T16:45:00+09:00');
            const diffMinutes = (time.getTime() - expectedTime.getTime()) / (1000 * 60);
            console.log(`   16:45からの差: ${diffMinutes.toFixed(1)}分`);
            
            if (Math.abs(diffMinutes) <= 5) {
              console.log(`   ✅ 期待値に近い時刻です！`);
            } else {
              console.log(`   ⚠️  期待値から${Math.abs(diffMinutes).toFixed(1)}分離れています`);
            }
          });
        } else {
          console.log(`❌ この日は修正座標でダイヤモンド富士は検出されませんでした`);
        }
        
        // 元の座標との比較
        const originalEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        if (originalEvents.length > 0) {
          const originalTime = new Date(originalEvents[0].time);
          const originalJstTime = originalTime.toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`   (参考) 元座標: ${originalJstTime} JST`);
        }
        
      } else {
        console.log(`❌ API応答エラー`);
      }
    } catch (error) {
      console.error(`❌ ${date} エラー:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('===== 座標比較 =====');
  console.log('元座標: 35.6225, 139.8853');
  console.log('修正座標: 35.623181, 139.883224');
  console.log('緯度差: ' + (35.623181 - 35.6225).toFixed(6) + '度');
  console.log('経度差: ' + (139.883224 - 139.8853).toFixed(6) + '度');
  console.log('');
  console.log('期待される効果:');
  console.log('- わずかな座標変更により時刻が16:43→16:45に調整されるか確認');
}

testCorrectedCoordinates();