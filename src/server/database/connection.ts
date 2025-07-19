import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// データベースファイルのパス
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'fuji_calendar.db');

// データディレクトリを作成
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite3データベース接続
export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log('Connected to SQLite database at:', DB_PATH);
    });

    // 外部キー制約を有効化
    this.db.run('PRAGMA foreign_keys = ON');
  }

  // データベース初期化（スキーマ適用）
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error initializing database:', err.message);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  }

  // クエリ実行（単一行取得）
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  // クエリ実行（複数行取得）
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  // クエリ実行（挿入・更新・削除）
  run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  // トランザクション実行
  async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  // データベース接続を閉じる
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }

  // 生のデータベースインスタンスを取得（デバッグ用）
  getRawDb(): sqlite3.Database {
    return this.db;
  }
}

// シングルトンインスタンス
let dbInstance: Database | null = null;

export const getDatabase = (): Database => {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
};

export const initializeDatabase = async (): Promise<void> => {
  const db = getDatabase();
  await db.initialize();
};

// アプリケーション終了時のクリーンアップ
process.on('SIGINT', async () => {
  if (dbInstance) {
    await dbInstance.close();
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  if (dbInstance) {
    await dbInstance.close();
    process.exit(0);
  }
});