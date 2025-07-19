// 10/23の詳細な太陽位置計算をデバッグ
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

async function debugPreciseTiming() {
  console.log('10/22-24の詳細な検出状況\n');
  
  const testDates = ['2025-10-22', '2025-10-23', '2025-10-24'];
  
  for (const date of testDates) {
    console.log(`===== ${date} =====`);
    
    try {
      const response = await fetchEvents(date);
      
      if (response.success && response.data && response.data.events) {
        const maihamaEvents = response.data.events.filter(event => 
          event.location && event.location.name === '舞浜海岸' && 
          event.type === 'diamond' && event.subType === 'sunset'
        );
        
        if (maihamaEvents.length > 0) {
          maihamaEvents.forEach(event => {
            const time = new Date(event.time);
            const jstTime = time.toLocaleString('ja-JP', { 
              timeZone: 'Asia/Tokyo',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            console.log(`✅ ダイヤモンド富士検出`);
            console.log(`   時刻: ${jstTime} JST`);
            console.log(`   方位角: ${event.azimuth.toFixed(4)}度`);
            console.log(`   仰角: ${event.elevation.toFixed(4)}度`);
            
            // 期待値16:43との比較
            const expectedTime = new Date(date + 'T16:43:00+09:00');
            const diffMinutes = (time.getTime() - expectedTime.getTime()) / (1000 * 60);
            console.log(`   16:43からの差: ${diffMinutes.toFixed(1)}分`);
          });
        } else {
          console.log(`❌ この日はダイヤモンド富士は検出されませんでした`);
          
          // 計算されているかチェック
          if (response.data.events && response.data.events.length > 0) {
            console.log(`   他のイベント: ${response.data.events.length}件`);
            response.data.events.forEach(event => {
              if (event.location && event.location.name === '舞浜海岸') {
                console.log(`   - ${event.type} ${event.subType || ''}`);
              }
            });
          } else {
            console.log(`   イベント計算なし`);
          }
        }
      } else {
        console.log(`❌ API応答エラー`);
      }
    } catch (error) {
      console.error(`❌ ${date} エラー:`, error.message);
    }
    
    console.log('');
  }
  
  // 10/23 16:43の期待値について詳細分析
  console.log('===== 期待値分析 =====');
  console.log('期待: 10/23 16:43 舞浜海岸');
  console.log('検出: 10/24 16:42 舞浜海岸');
  console.log('差異: 23時間59分 (ほぼ1日早い検出)');
  console.log('');
  console.log('考慮すべき要因:');
  console.log('1. 太陽の南中時刻の年間変化');
  console.log('2. 方位角の日変化率');
  console.log('3. 計算基準時刻の設定');
  console.log('4. 許容誤差の設定');
}

debugPreciseTiming();