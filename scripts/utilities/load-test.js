#!/usr/bin/env node

/**
 * 同時接続負荷テスト - PostgreSQL vs SQLite
 * 使用方法: node scripts/load-test.js
 */

const { performance } = require('perf_hooks');
const http = require('http');

class LoadTest {
  constructor() {
    this.results = {
      sqlite: { times: [], errors: 0 },
      postgres: { times: [], errors: 0 }
    };
  }

  async makeRequest(port, endpoint) {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      
      const req = http.get(`http://localhost:${port}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const end = performance.now();
          const responseTime = end - start;
          
          if (res.statusCode === 200) {
            resolve(responseTime);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  async runConcurrentTest(dbType, concurrency, requests) {
    console.log(`\n📊 ${dbType.toUpperCase()} 同時接続テスト (並行度: ${concurrency}, リクエスト数: ${requests})`);
    
    const results = this.results[dbType];
    const port = 3000; // 両方とも同じポートで切り替え
    const endpoints = [
      '/api/locations',
      '/api/locations/1',
      '/api/locations/5'
    ];

    let completed = 0;
    let startTime = performance.now();

    // 同時リクエスト実行
    const promises = [];
    for (let i = 0; i < requests; i++) {
      const endpoint = endpoints[i % endpoints.length];
      
      const promise = this.makeRequest(port, endpoint)
        .then(responseTime => {
          results.times.push(responseTime);
          completed++;
          if (completed % 10 === 0) {
            process.stdout.write(`   📈 進捗: ${completed}/${requests}\r`);
          }
        })
        .catch(error => {
          results.errors++;
          console.error(`   ❌ エラー: ${error.message}`);
        });
      
      promises.push(promise);
      
      // 並行度制御のための小さな遅延
      if (i % concurrency === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await Promise.all(promises);
    const totalTime = performance.now() - startTime;

    // 統計計算
    if (results.times.length > 0) {
      const avg = results.times.reduce((a, b) => a + b) / results.times.length;
      const min = Math.min(...results.times);
      const max = Math.max(...results.times);
      const p95 = results.times.sort((a, b) => a - b)[Math.floor(results.times.length * 0.95)];
      
      console.log(`\n   ✅ 成功: ${results.times.length}/${requests} リクエスト`);
      console.log(`   ❌ エラー: ${results.errors} 件`);
      console.log(`   ⏱️  平均応答時間: ${avg.toFixed(2)}ms`);
      console.log(`   📊 最小/最大: ${min.toFixed(2)}ms / ${max.toFixed(2)}ms`);
      console.log(`   📈 95パーセンタイル: ${p95.toFixed(2)}ms`);
      console.log(`   🔥 総処理時間: ${totalTime.toFixed(2)}ms`);
      console.log(`   ⚡ スループット: ${(results.times.length / totalTime * 1000).toFixed(2)} req/sec`);
    }
  }

  async switchDatabase(dbType) {
    console.log(`\n🔄 ${dbType.toUpperCase()}環境に切り替え中...`);
    
    // サーバーの切り替えは手動で行う必要があるため、
    // ここでは待機時間を設ける
    console.log(`   ⏳ ${dbType}サーバーが起動するまで10秒待機...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // ヘルスチェック
    try {
      await this.makeRequest(3000, '/api/health');
      console.log(`   ✅ ${dbType.toUpperCase()}サーバー準備完了`);
    } catch (error) {
      console.error(`   ❌ ${dbType.toUpperCase()}サーバー接続失敗:`, error.message);
      throw error;
    }
  }

  printComparison() {
    console.log('\n📋 負荷テスト比較結果');
    console.log('=' .repeat(80));
    
    const sqlite = this.results.sqlite;
    const postgres = this.results.postgres;
    
    if (sqlite.times.length > 0 && postgres.times.length > 0) {
      const sqliteAvg = sqlite.times.reduce((a, b) => a + b) / sqlite.times.length;
      const postgresAvg = postgres.times.reduce((a, b) => a + b) / postgres.times.length;
      const improvement = ((sqliteAvg - postgresAvg) / sqliteAvg * 100);
      
      console.log(`SQLite平均応答時間:     ${sqliteAvg.toFixed(2)}ms`);
      console.log(`PostgreSQL平均応答時間: ${postgresAvg.toFixed(2)}ms`);
      console.log(`改善率:               ${improvement.toFixed(1)}% ${improvement > 0 ? '(高速化)' : '(低下)'}`);
      
      console.log(`\nSQLiteエラー率:     ${(sqlite.errors / (sqlite.times.length + sqlite.errors) * 100).toFixed(1)}%`);  
      console.log(`PostgreSQLエラー率: ${(postgres.errors / (postgres.times.length + postgres.errors) * 100).toFixed(1)}%`);
      
      // 負荷耐性の評価
      if (postgres.errors < sqlite.errors) {
        console.log('\n🏆 PostgreSQLの方が高負荷に対して安定しています');
      } else if (sqlite.errors < postgres.errors) {
        console.log('\n🏆 SQLiteの方が高負荷に対して安定しています');
      } else {
        console.log('\n🤝 両方とも同様の安定性を示しています');
      }
    }
  }

  async run() {
    console.log('🚀 負荷テスト開始');
    console.log('注意: このテストは手動でサーバーを切り替える必要があります');
    
    const concurrency = 50; // 並行リクエスト数
    const requests = 100;   // 総リクエスト数
    
    try {
      // SQLiteテスト
      console.log('\n🔶 Phase 1: SQLite負荷テスト');
      console.log('手動でSQLiteサーバーを起動してください: npm run dev:server');
      await this.switchDatabase('sqlite');
      await this.runConcurrentTest('sqlite', concurrency, requests);
      
      // PostgreSQLテスト  
      console.log('\n🔷 Phase 2: PostgreSQL負荷テスト');
      console.log('手動でPostgreSQLサーバーを起動してください: DB_TYPE=postgres npm run dev:server');
      await this.switchDatabase('postgres');
      await this.runConcurrentTest('postgres', concurrency, requests);
      
      this.printComparison();
      
    } catch (error) {
      console.error('\n❌ 負荷テストエラー:', error.message);
      console.log('\n💡 ヒント: サーバーが正しく起動していることを確認してください');
    }
  }
}

// メイン実行
if (require.main === module) {
  const test = new LoadTest();
  test.run().catch(console.error);
}

module.exports = LoadTest;