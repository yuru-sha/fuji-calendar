#!/usr/bin/env node

// Prisma接続とテストデータ挿入のテスト
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPrismaConnection() {
  console.log('Prisma接続テストを開始します...');
  
  try {
    // データベース接続をテスト
    await prisma.$connect();
    console.log('✅ PostgreSQLに接続成功');
    
    // 現在のスキーマを確認
    console.log('\n=== 現在のテーブル構造確認 ===');
    const result = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'celestial_orbit_data'
      ORDER BY ordinal_position;
    `;
    console.log('celestial_orbit_data テーブル構造:', result);
    
    // 単一レコードのテスト挿入
    console.log('\n=== テストデータ挿入 ===');
    const testData = {
      date: new Date('2025-01-01'),
      time: new Date('2025-01-01T12:00:00.000Z'),
      hour: 12,
      minute: 0,
      celestialType: 'sun',
      azimuth: 180.5,
      elevation: 45.2,
      visible: true,
      moonPhase: null,
      moonIllumination: null,
      season: 'winter',
      timeOfDay: 'afternoon'
    };
    
    console.log('挿入するデータ:', JSON.stringify(testData, null, 2));
    
    const inserted = await prisma.celestialOrbitData.create({
      data: testData
    });
    
    console.log('✅ テストデータ挿入成功:', inserted.id);
    
    // データ確認
    const count = await prisma.celestialOrbitData.count();
    console.log(`現在のレコード数: ${count}件`);
    
    // 挿入したデータを削除
    await prisma.celestialOrbitData.delete({
      where: { id: inserted.id }
    });
    console.log('✅ テストデータ削除完了');
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
    console.error('詳細:', error.message);
    
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    
    if (error.meta) {
      console.error('メタ情報:', error.meta);
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
testPrismaConnection();