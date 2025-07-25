#!/usr/bin/env node

/**
 * Prismaベースシステムのテストスクリプト
 * 初回データ生成前の動作確認とサンプル実行
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Prismaベースシステム動作確認開始');
  
  try {
    // 1. データベース接続テスト
    console.log('\n📊 1. データベース接続テスト');
    const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ データベース接続: 正常');
    
    // 2. 基本テーブル確認
    console.log('\n📋 2. 基本テーブル確認');
    const adminCount = await prisma.admin.count();
    const locationCount = await prisma.location.count();
    console.log(`✅ 管理者数: ${adminCount}`);
    console.log(`✅ 撮影地点数: ${locationCount}`);
    
    // 3. 地点データ詳細表示
    console.log('\n🗺️ 3. 撮影地点データ確認');
    const locations = await prisma.location.findMany();
    for (const location of locations) {
      console.log(`  📍 ${location.name} (${location.prefecture})`);
      console.log(`     座標: ${location.latitude}, ${location.longitude}`);
      console.log(`     富士山: 方位角${location.fujiAzimuth}°, 仰角${location.fujiElevation}°, 距離${location.fujiDistance}km`);
    }
    
    // 4. 天体データテーブル状態確認
    console.log('\n🌟 4. 天体データテーブル状態確認');
    const celestialCount = await prisma.celestialOrbitData.count();
    const astroCount = await prisma.astronomicalData.count();
    const eventCount = await prisma.locationFujiEvent.count();
    
    console.log(`📊 天体軌道データ: ${celestialCount}件`);
    console.log(`📊 天文候補データ: ${astroCount}件`);
    console.log(`📊 富士現象イベント: ${eventCount}件`);
    
    if (celestialCount === 0) {
      console.log('⚠️  天体データが未生成です - 初回データ生成が必要');
    }
    
    // 5. システム構成確認
    console.log('\n🔧 5. システム構成確認');
    console.log('✅ Prismaクライアント: 動作中');
    console.log('✅ PostgreSQLデータベース: 接続済み');
    console.log('✅ 必要テーブル: 5テーブル全て存在');
    
    console.log('\n🎯 Prismaベースシステム動作確認完了');
    console.log('初回データ生成の準備が整いました！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();