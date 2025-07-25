// データベース抽象化インターフェース
export interface DatabaseInterface {
  // 基本操作
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<QueryResult>;

  // トランザクション
  transaction<T>(callback: (db: any) => Promise<T>): Promise<T>;

  // 初期化・終了
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export interface QueryResult<T = any> {
  rows?: T[];
  rowCount?: number;
  lastID?: number;
  changes?: number;
}

// データベースファクトリー
export class DatabaseFactory {
  static async create(): Promise<DatabaseInterface> {
    const dbType = process.env.DB_TYPE || 'postgres'; // PostgreSQLをデフォルトに変更

    switch (dbType) {
      case 'postgres':
        const { PostgreSQLDatabase } = await import('./connection-postgres');
        return new PostgreSQLDatabase();
      case 'sqlite':
      default:
        // SQLite使用は廃止されました（PostgreSQL移行により）
        throw new Error('SQLite support has been deprecated. Please use PostgreSQL.');
        // const { Database: SQLiteDatabase } = await import('./connection');
        // return new SQLiteDatabase() as any; // 既存のSQLiteクラスを適応
    }
  }
}

// 環境変数の型定義
export interface DatabaseConfig {
  // 共通設定
  DB_TYPE?: 'sqlite' | 'postgres';

  // SQLite設定
  DB_PATH?: string;

  // PostgreSQL設定
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}