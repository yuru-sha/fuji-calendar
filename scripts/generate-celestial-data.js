#!/usr/bin/env node

/**
 * 天体軌道データ生成スクリプト（手動実行用）
 * 
 * 使用方法:
 *   node scripts/generate-celestial-data.js [year]
 *   
 * 例:
 *   node scripts/generate-celestial-data.js 2025
 *   node scripts/generate-celestial-data.js        # 現在年
 */

const { celestialOrbitDataService } = require('../dist/server/services/CelestialOrbitDataService');

async function main() {
  // コマンドライン引数から年を取得
  const args = process.argv.slice(2);
  const year = args.length > 0 ? parseInt(args[0]) : new Date().getFullYear();

  if (isNaN(year) || year < 2000 || year > 2100) {
    console.error('❌ エラー: 年は2000-2100の範囲で指定してください');
    console.log('\n使用方法:');
    console.log('  node scripts/generate-celestial-data.js [year]');
    console.log('\n例:');
    console.log('  node scripts/generate-celestial-data.js 2025');
    console.log('  node scripts/generate-celestial-data.js        # 現在年');
    process.exit(1);
  }

  console.log(`🌟 ${year}年の天体軌道データ生成を開始します...`);
  console.log(`⏰ 開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    // 天体軌道データ生成実行
    const result = await celestialOrbitDataService.generateYearlyData(year);
    
    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);

    if (result.success) {
      console.log('');
      console.log('🎉 天体軌道データ生成完了！');
      console.log(`📊 生成データ数: ${result.totalDataPoints.toLocaleString()}件`);
      console.log(`⏱️  処理時間: ${minutes}分${seconds}秒`);
      console.log(`📅 対象年: ${year}年`);
      console.log(`💾 1日あたり: ${Math.round(result.totalDataPoints / 365).toLocaleString()}件`);
      console.log(`⏰ 完了時刻: ${new Date().toLocaleString('ja-JP')}`);
      
      console.log('');
      console.log('✅ 次のステップ:');
      console.log('  1. LocationFujiEventServiceでイベントマッチングを実行');
      console.log('  2. 10月のダイヤモンド富士検出テストを実行');
      console.log('');
      
      process.exit(0);
    } else {
      console.error('');
      console.error('❌ 天体軌道データ生成に失敗しました');
      console.error(`⏱️  処理時間: ${minutes}分${seconds}秒`);
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ 天体軌道データ生成中にエラーが発生しました:');
    console.error(error.message);
    console.error('');
    console.error('🔍 トラブルシューティング:');
    console.error('  1. データベース接続を確認してください');
    console.error('  2. Astronomy Engineライブラリが正しくインストールされているか確認してください');
    console.error('  3. メモリ不足の場合は、プロセスを再起動してください');
    console.error('');
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  処理が中断されました');
  console.log('⏹️  プロセスを終了します...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('⚠️  処理が終了されました');
  process.exit(143);
});

// メイン実行
main().catch((error) => {
  console.error('');
  console.error('❌ 予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});