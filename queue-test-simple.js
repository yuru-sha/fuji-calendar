/**
 * 簡単なキューシステムテスト（JavaScript版）
 */

console.log('🚀 キューシステム基本テスト開始...\n');

// Redis接続テスト
const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('1. Redis接続テスト');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });

  try {
    const result = await redis.ping();
    console.log('✅ Redis接続成功:', result);
    
    // キューの基本情報を取得
    const keys = await redis.keys('bull:*');
    console.log('既存のキューキー数:', keys.length);
    
    if (keys.length > 0) {
      console.log('キューキー例:', keys.slice(0, 3));
    }
    
    await redis.quit();
    return true;
  } catch (error) {
    console.log('❌ Redis接続失敗:', error.message);
    return false;
  }
}

// BullMQテスト
async function testBullMQ() {
  console.log('\n2. BullMQ基本機能テスト');
  
  try {
    const { Queue, Worker } = require('bullmq');
    const Redis = require('ioredis');
    
    const connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    
    // テストキューを作成
    const testQueue = new Queue('test-queue', { connection });
    
    // テストジョブを追加
    const job = await testQueue.add('test-job', {
      message: 'Hello Queue System!',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ テストジョブ追加成功');
    console.log('ジョブID:', job.id);
    
    // キューの状態を確認
    const counts = await testQueue.getJobCounts();
    console.log('キューの状態:', counts);
    
    // テストワーカーを作成（1つのジョブだけ処理）
    const worker = new Worker('test-queue', async (job) => {
      console.log('📝 ジョブ処理中:', job.data.message);
      return { status: 'completed', processedAt: new Date() };
    }, { connection });
    
    // ワーカーのイベントリスナー
    worker.on('completed', async (job, result) => {
      console.log('✅ ジョブ完了:', job.id, result);
      
      // クリーンアップ
      await worker.close();
      await testQueue.close();
      await connection.quit();
      
      console.log('\n🎉 BullMQテスト完了');
    });
    
    worker.on('failed', async (job, err) => {
      console.log('❌ ジョブ失敗:', job?.id, err.message);
      
      // クリーンアップ
      await worker.close();
      await testQueue.close();
      await connection.quit();
    });
    
    return true;
  } catch (error) {
    console.log('❌ BullMQテスト失敗:', error.message);
    return false;
  }
}

// パッケージ確認
function checkPackages() {
  console.log('\n3. 必要パッケージ確認');
  
  const packages = ['bullmq', 'ioredis'];
  const results = [];
  
  for (const pkg of packages) {
    try {
      const version = require(`${pkg}/package.json`).version;
      console.log(`✅ ${pkg}: v${version}`);
      results.push(true);
    } catch (error) {
      console.log(`❌ ${pkg}: インストールされていません`);
      results.push(false);
    }
  }
  
  return results.every(r => r);
}

// メイン実行
async function main() {
  try {
    // パッケージ確認
    const packagesOK = checkPackages();
    if (!packagesOK) {
      console.log('\n❌ 必要なパッケージが不足しています');
      process.exit(1);
    }
    
    // Redis接続テスト
    const redisOK = await testRedisConnection();
    if (!redisOK) {
      console.log('\n❌ Redisに接続できません。Dockerコンテナが起動しているか確認してください');
      console.log('起動コマンド: docker-compose up -d redis');
      process.exit(1);
    }
    
    // BullMQテスト
    await testBullMQ();
    
    // 3秒後に終了
    setTimeout(() => {
      console.log('\n📋 次のステップ:');
      console.log('1. npm run dev:worker でワーカープロセスを起動');
      console.log('2. 管理画面で地点を作成してキューを確認');
      console.log('3. ジョブが正常に処理されることを確認');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  }
}

main();