// 2月の広範囲をテストして舞浜海岸のダイヤモンド富士を確認
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

async function testFebruaryRange() {
  console.log('舞浜海岸のダイヤモンド富士検出状況（2025年2月）\n');
  
  const detectedDays = [];
  
  // 2月1日から28日まで全日テスト
  for (let day = 1; day <= 28; day++) {
    const date = `2025-02-${day.toString().padStart(2, '0')}`;
    
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
          
          detectedDays.push({
            date: date,
            time: jstTime,
            azimuth: event.azimuth,
            elevation: event.elevation
          });
          
          console.log(`2月${day}日: ✅ ${jstTime} JST`);
        } else {
          console.log(`2月${day}日: -`);
        }
      }
    } catch (error) {
      console.error(`2月${day}日: エラー`);
    }
  }
  
  console.log('\n===== サマリー =====');
  console.log(`検出された日数: ${detectedDays.length}日`);
  
  if (detectedDays.length > 0) {
    console.log(`最初の日: ${detectedDays[0].date} (${detectedDays[0].time})`);
    console.log(`最後の日: ${detectedDays[detectedDays.length - 1].date} (${detectedDays[detectedDays.length - 1].time})`);
    console.log(`期間: ${detectedDays.length}日間`);
    
    // 2/17-19の期間をハイライト
    console.log('\n2/17-19の状況:');
    const feb17to19 = detectedDays.filter(d => 
      d.date >= '2025-02-17' && d.date <= '2025-02-19'
    );
    feb17to19.forEach(d => {
      console.log(`  ${d.date}: ${d.time}`);
    });
  }
  
  if (detectedDays.length > 7) {
    console.log('\n⚠️  警告: ダイヤモンド富士が検出される期間が長すぎます（1週間以上）');
    console.log('   許容誤差の設定を見直す必要があります。');
  }
}

testFebruaryRange();