#!/usr/bin/env node

/**
 * PostgreSQL接続テストスクリプト
 * 使用方法: node scripts/test-postgres-connection.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fuji_calendar',
  user: process.env.DB_USER || 'fuji_user',
  password: process.env.DB_PASSWORD || 'dev_password_123',
});

async function testConnection() {
  console.log('🔍 PostgreSQL接続テスト開始...');
  
  try {
    // 1. 接続テスト
    const client = await pool.connect();
    console.log('✅ PostgreSQL接続成功');
    
    // 2. バージョン確認
    const versionResult = await client.query('SELECT version()');
    console.log('📋 PostgreSQLバージョン:', versionResult.rows[0].version.split(',')[0]);
    
    // 3. テーブル存在確認
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📊 作成済みテーブル:', tablesResult.rows.map(row => row.table_name));
    
    // 4. 管理者アカウント確認
    const adminResult = await client.query('SELECT username, email FROM admins LIMIT 1');
    if (adminResult.rows.length > 0) {
      console.log('👤 管理者アカウント:', adminResult.rows[0]);
    }
    
    // 5. locationsテーブル構造確認
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      ORDER BY ordinal_position
    `);
    console.log('🏗️  locationsテーブル構造:');
    structureResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // 6. インデックス確認
    const indexResult = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'locations'
    `);
    console.log('📚 locationsテーブル インデックス:');
    indexResult.rows.forEach(idx => {
      console.log(`   ${idx.indexname}`);
    });
    
    client.release();
    console.log('✅ PostgreSQL接続テスト完了');
    
  } catch (error) {
    console.error('❌ PostgreSQL接続エラー:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// テスト実行
testConnection();