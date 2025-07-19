import { Database, getDatabase } from '../database/connection';
import bcrypt from 'bcrypt';

export interface Admin {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  failedLoginCount?: number;
  lockedUntil?: Date;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
}

export class AdminModel {
  private static getDb(): Database {
    return getDatabase();
  }

  // ユーザー名で管理者を検索
  static async findByUsername(username: string): Promise<Admin | null> {
    const db = AdminModel.getDb();
    
    const sql = `
      SELECT 
        id, username, email, password_hash as passwordHash,
        datetime(created_at, 'localtime') as createdAt,
        datetime(last_login, 'localtime') as lastLogin
      FROM admins 
      WHERE username = ?
    `;
    
    const row = await db.get<any>(sql, [username]);
    return row ? AdminModel.mapRowToAdmin(row) : null;
  }

  // IDで管理者を検索
  static async findById(id: number): Promise<Admin | null> {
    const db = AdminModel.getDb();
    
    const sql = `
      SELECT 
        id, username, email, password_hash as passwordHash,
        datetime(created_at, 'localtime') as createdAt,
        datetime(last_login, 'localtime') as lastLogin
      FROM admins 
      WHERE id = ?
    `;
    
    const row = await db.get<any>(sql, [id]);
    return row ? AdminModel.mapRowToAdmin(row) : null;
  }

  // 全ての管理者を取得
  static async findAll(): Promise<Admin[]> {
    const db = AdminModel.getDb();
    
    const sql = `
      SELECT 
        id, username, email, password_hash as passwordHash,
        datetime(created_at, 'localtime') as createdAt,
        datetime(last_login, 'localtime') as lastLogin
      FROM admins 
      ORDER BY created_at DESC
    `;
    
    const rows = await db.all<any>(sql);
    return rows.map(AdminModel.mapRowToAdmin);
  }

  // パスワード検証
  static async verifyPassword(username: string, password: string): Promise<Admin | null> {
    const admin = await AdminModel.findByUsername(username);
    if (!admin) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    return isValid ? admin : null;
  }

  // アカウントロック解除
  static async unlockAccount(id: number): Promise<boolean> {
    const db = AdminModel.getDb();
    
    const sql = `
      UPDATE admins 
      SET failed_login_count = 0, locked_until = NULL 
      WHERE id = ?
    `;
    const result = await db.run(sql, [id]);
    
    return (result.changes || 0) > 0;
  }

  // 新しい管理者を作成（usernameとpasswordのみ）
  static async create(username: string, password: string): Promise<Admin> {
    const db = AdminModel.getDb();
    
    // パスワードのハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const sql = `
      INSERT INTO admins (
        username, email, password_hash, created_at, failed_login_count
      ) VALUES (?, ?, ?, datetime('now', '+9 hours'), 0)
    `;
    
    const result = await db.run(sql, [
      username,
      username + '@admin.local', // デフォルトメール
      passwordHash
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create admin');
    }

    const created = await AdminModel.findById(result.lastID);
    if (!created) {
      throw new Error('Failed to retrieve created admin');
    }

    return created;
  }

  // 新しい管理者を作成（完全版）
  static async createWithEmail(adminData: CreateAdminRequest): Promise<Admin> {
    const db = AdminModel.getDb();
    
    // パスワードのハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    
    const sql = `
      INSERT INTO admins (
        username, email, password_hash, created_at, failed_login_count
      ) VALUES (?, ?, ?, datetime('now', '+9 hours'), 0)
    `;
    
    const result = await db.run(sql, [
      adminData.username,
      adminData.email,
      passwordHash
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create admin');
    }

    const created = await AdminModel.findById(result.lastID);
    if (!created) {
      throw new Error('Failed to retrieve created admin');
    }

    return created;
  }

  // パスワードを更新
  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const db = AdminModel.getDb();
    
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const sql = 'UPDATE admins SET password_hash = ? WHERE id = ?';
    const result = await db.run(sql, [passwordHash, id]);
    
    return (result.changes || 0) > 0;
  }

  // 最終ログイン時刻を更新
  static async updateLastLogin(id: number): Promise<boolean> {
    const db = AdminModel.getDb();
    
    const sql = 'UPDATE admins SET last_login = datetime(\'now\', \'+9 hours\') WHERE id = ?';
    const result = await db.run(sql, [id]);
    
    return (result.changes || 0) > 0;
  }

  // 管理者を削除
  static async delete(id: number): Promise<boolean> {
    const db = AdminModel.getDb();
    
    const sql = 'DELETE FROM admins WHERE id = ?';
    const result = await db.run(sql, [id]);
    
    return (result.changes || 0) > 0;
  }

  // データベース行を Admin オブジェクトにマッピング
  private static mapRowToAdmin(row: any): Admin {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: new Date(row.createdAt),
      lastLogin: row.lastLogin ? new Date(row.lastLogin) : undefined,
      failedLoginCount: row.failedLoginCount || 0,
      lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : undefined
    };
  }
}

export default AdminModel;