// import { Database, getDatabase } from '../database/connection'; // PostgreSQL移行により無効化
import { prisma } from '../database/prisma';
import * as bcrypt from 'bcrypt';

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
  // Prismaベースなので不要
  // private static getDb(): Database {
  //   return getDatabase();
  // }

  // ユーザー名で管理者を検索
  static async findByUsername(username: string): Promise<Admin | null> {
    const admin = await prisma.admin.findUnique({
      where: { username }
    });
    
    return admin ? AdminModel.mapPrismaToAdmin(admin) : null;
  }

  // IDで管理者を検索
  static async findById(id: number): Promise<Admin | null> {
    const admin = await prisma.admin.findUnique({
      where: { id }
    });
    
    return admin ? AdminModel.mapPrismaToAdmin(admin) : null;
  }

  // 全ての管理者を取得
  static async findAll(): Promise<Admin[]> {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return admins.map(AdminModel.mapPrismaToAdmin);
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
    try {
      await prisma.admin.update({
        where: { id },
        data: {
          // failedLoginCount: 0,
          // lockedUntil: null
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  // 新しい管理者を作成（usernameとpasswordのみ）
  static async create(username: string, password: string): Promise<Admin> {
    // パスワードのハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const admin = await prisma.admin.create({
      data: {
        username,
        email: username + '@admin.local', // デフォルトメール
        passwordHash
      }
    });

    return AdminModel.mapPrismaToAdmin(admin);
  }

  // 新しい管理者を作成（完全版）
  static async createWithEmail(adminData: CreateAdminRequest): Promise<Admin> {
    // パスワードのハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    
    const admin = await prisma.admin.create({
      data: {
        username: adminData.username,
        email: adminData.email,
        passwordHash
      }
    });

    return AdminModel.mapPrismaToAdmin(admin);
  }

  // パスワードを更新
  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    try {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      await prisma.admin.update({
        where: { id },
        data: { passwordHash }
      });
      
      return true;
    } catch {
      return false;
    }
  }

  // 最終ログイン時刻を更新
  static async updateLastLogin(id: number): Promise<boolean> {
    try {
      await prisma.admin.update({
        where: { id },
        data: { updatedAt: new Date() } // lastLoginフィールドがないので、updatedAtを使用
      });
      
      return true;
    } catch {
      return false;
    }
  }

  // 管理者を削除
  static async delete(id: number): Promise<boolean> {
    try {
      await prisma.admin.delete({
        where: { id }
      });
      
      return true;
    } catch {
      return false;
    }
  }

  // Prismaの結果を Admin オブジェクトにマッピング
  private static mapPrismaToAdmin(admin: any): Admin {
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      passwordHash: admin.passwordHash,
      createdAt: admin.createdAt,
      lastLogin: admin.updatedAt, // lastLoginフィールドがないので、updatedAtを使用
      failedLoginCount: 0, // Prismaスキーマにないので0
      lockedUntil: undefined // Prismaスキーマにないのでundefined
    };
  }
}

export default AdminModel;