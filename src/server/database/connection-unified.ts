import { DatabaseInterface, QueryResult } from './database-interface';

// 統合データベース接続（環境変数で切り替え）
class UnifiedDatabase implements DatabaseInterface {
  private db: DatabaseInterface | null = null;
  private initialized = false;

  constructor() {
    // 非同期初期化は別メソッドで実行
  }

  private async ensureInitialized() {
    if (this.initialized && this.db) {
      return;
    }

    // PostgreSQLのみを使用
    console.log('初期化中: データベースタイプ = postgres');
    
    const { PostgreSQLDatabase } = await import('./connection-postgres');
    this.db = new PostgreSQLDatabase();
    console.log('PostgreSQLデータベース接続を初期化');
    
    this.initialized = true;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    await this.ensureInitialized();
    return await this.db!.query<T>(sql, params);
  }

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    await this.ensureInitialized();
    return await this.db!.get<T>(sql, params);
  }

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    await this.ensureInitialized();
    return await this.db!.all<T>(sql, params);
  }

  async run(sql: string, params?: any[]): Promise<QueryResult> {
    await this.ensureInitialized();
    return await this.db!.run(sql, params);
  }

  async transaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    return await this.db!.transaction(callback);
  }

  async initialize(): Promise<void> {
    await this.ensureInitialized();
    if (this.db && this.db.initialize) {
      await this.db.initialize();
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.close) {
      await this.db.close();
    }
  }

  // SQLクエリの方言を統一する補助メソッド
  adaptSQL(sql: string): string {
    const dbType = process.env.DB_TYPE || 'sqlite';
    
    if (dbType === 'postgres') {
      // SQLiteのINSERT OR REPLACEをPostgreSQL用に変換
      sql = sql.replace(
        /INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
        (match, table, columns, values) => {
          const columnList = columns.split(',').map(c => c.trim());
          const primaryKey = this.getPrimaryKeyForTable(table);
          return `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT (${primaryKey}) DO UPDATE SET ${columnList.map(col => `${col} = EXCLUDED.${col}`).join(', ')}`;
        }
      );
      
      // SQLiteの日時関数をPostgreSQL用に変換
      sql = sql.replace(/datetime\(([^,]+),\s*'localtime'\)/g, 
        `($1 AT TIME ZONE 'Asia/Tokyo')`);
      
      // CURRENT_TIMESTAMPをPostgreSQL用に変換
      sql = sql.replace(/CURRENT_TIMESTAMP/g, "NOW() AT TIME ZONE 'Asia/Tokyo'");
      
      // SQLiteのプレースホルダー（?）をPostgreSQL用（$1, $2...）に変換
      let paramIndex = 1;
      sql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    return sql;
  }

  private getPrimaryKeyForTable(tableName: string): string {
    // テーブルごとの主キー定義
    const primaryKeys: { [key: string]: string } = {
      'locations': 'id',
      'admins': 'id',
      'events_cache': 'cache_key',
      'location_requests': 'id',
      'historical_events': 'id',
      'request_limits': 'ip_address'
    };
    
    return primaryKeys[tableName] || 'id';
  }

  // パラメータ付きクエリの実行（方言対応版）
  async queryAdapted<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const adaptedSQL = this.adaptSQL(sql);
    return await this.query<T>(adaptedSQL, params);
  }

  async getAdapted<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    const adaptedSQL = this.adaptSQL(sql);
    return await this.get<T>(adaptedSQL, params);
  }

  async allAdapted<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const adaptedSQL = this.adaptSQL(sql);
    return await this.all<T>(adaptedSQL, params);
  }

  async runAdapted(sql: string, params?: any[]): Promise<QueryResult> {
    const adaptedSQL = this.adaptSQL(sql);
    return await this.run(adaptedSQL, params);
  }
}

// シングルトンインスタンス
let unifiedDbInstance: UnifiedDatabase | null = null;

export function getUnifiedDatabase(): UnifiedDatabase {
  if (!unifiedDbInstance) {
    unifiedDbInstance = new UnifiedDatabase();
  }
  return unifiedDbInstance;
}

export async function initializeUnifiedDatabase(): Promise<void> {
  const db = getUnifiedDatabase();
  await db.initialize();
}

export { UnifiedDatabase };