import { Pool, PoolClient, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';

// PostgreSQL接続設定
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fuji_calendar',
  user: process.env.DB_USER || 'fuji_user',
  password: process.env.DB_PASSWORD || 'dev_password_123',
  // 接続プール設定
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000, // アイドルタイムアウト
  connectionTimeoutMillis: 2000, // 接続タイムアウト
};

// PostgreSQL接続プール
export class PostgreSQLDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(DB_CONFIG);

    // 接続テスト
    this.testConnection();

    // エラーハンドリング
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  private async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log(`Connected to PostgreSQL database at: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
      client.release();
    } catch (err) {
      console.error('Error connecting to PostgreSQL:', err);
      throw err;
    }
  }

  // スキーマ初期化
  async initialize(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema-postgres.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('PostgreSQL schema file not found:', schemaPath);
      return;
    }

    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await this.pool.query(schema);
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    }
  }

  // 単純クエリ実行
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // トランザクション実行
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 単一行取得
  async get<T = any>(text: string, params?: any[]): Promise<T | undefined> {
    const result = await this.query<T>(text, params);
    return result.rows[0];
  }

  // 複数行取得
  async all<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  // 実行のみ
  async run(text: string, params?: any[]): Promise<QueryResult> {
    return await this.query(text, params);
  }

  // 接続プールを閉じる
  async close(): Promise<void> {
    await this.pool.end();
    console.log('PostgreSQL connection pool closed');
  }
}

// データベースインスタンス（シングルトン）
let dbInstance: PostgreSQLDatabase | null = null;

export function getDatabase(): PostgreSQLDatabase {
  if (!dbInstance) {
    dbInstance = new PostgreSQLDatabase();
  }
  return dbInstance;
}

// 初期化関数
export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  await db.initialize();
}

// データベースタイプの判定
export function isDatabaseType(type: string): boolean {
  return process.env.DB_TYPE === type;
}

export { PostgreSQLDatabase as Database };