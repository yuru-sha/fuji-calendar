// 既存地点での手動計算トリガーテスト
const http = require('http');

// 管理者ログイン
async function adminLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200 && result.data?.token) {
            console.log('✅ 管理者ログイン成功');
            resolve(result.data.token);
          } else {
            reject(new Error(`Login failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 地点一覧取得
async function getLocations() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/locations',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ 地点一覧取得成功');
            resolve(result.data.locations);
          } else {
            reject(new Error(`Get locations failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 手動計算トリガー
async function triggerCalculation(token, locationId, year = 2025) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      locationId: locationId,
      year: year,
      priority: 'high'
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/admin/queue/calculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
      }
    };

    console.log(`🚀 計算開始: locationId=${locationId}, year=${year}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ 計算ジョブ開始成功:', result.data);
            resolve(result.data);
          } else {
            reject(new Error(`Trigger calculation failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// キュー統計取得
async function getQueueStats(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/admin/queue/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ キュー統計取得成功');
            resolve(result.data);
          } else {
            reject(new Error(`Get queue stats failed: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// メイン実行
async function main() {
  try {
    console.log('=== 富士山カレンダー キューシステムテスト ===\n');

    // 1. 管理者ログイン
    console.log('1. 管理者ログイン中...');
    const token = await adminLogin();

    // 2. 地点一覧取得
    console.log('\n2. 地点一覧取得中...');
    const locations = await getLocations();
    console.log(`地点数: ${locations.length}`);
    
    if (locations.length > 0) {
      console.log('利用可能な地点:');
      locations.forEach(loc => {
        console.log(`  - ID: ${loc.id}, 名前: ${loc.name}, 都道府県: ${loc.prefecture}`);
      });
    }

    // 3. 最初の地点で計算開始
    if (locations.length > 0) {
      const firstLocation = locations[0];
      console.log(`\n3. 地点 "${firstLocation.name}" の2025年計算開始...`);
      const jobData = await triggerCalculation(token, firstLocation.id, 2025);
      console.log(`ジョブID: ${jobData.jobId}`);

      // 4. キュー統計確認
      console.log('\n4. キュー統計確認中...');
      const stats = await getQueueStats(token);
      console.log('キュー統計:');
      console.log('  Location Queue:', stats.location);
      console.log('  Monthly Queue:', stats.monthly);
      console.log('  Daily Queue:', stats.daily);

      console.log('\n✅ テスト完了！バックグラウンドで計算が実行されています。');
      console.log('ログを確認して進捗を監視してください。');
    } else {
      console.log('\n❌ 利用可能な地点がありません。');
    }

  } catch (error) {
    console.error('\n❌ テスト失敗:', error.message);
  }
}

main();