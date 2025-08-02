import { Admin } from "../../shared";

export interface AuthRepository {
  // 管理者アカウント関連
  findAdminByUsername(username: string): Promise<Admin | null>;
  updateAdminPassword(adminId: number, passwordHash: string): Promise<void>;

  // トークン管理関連
  saveRefreshToken(
    adminId: number,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void>;
  findValidRefreshToken(
    token: string,
  ): Promise<{ adminId: number; expiresAt: Date } | null>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllRefreshTokens(adminId: number): Promise<void>;
  cleanupExpiredTokens(): Promise<number>; // 削除されたトークン数を返す

  // セキュリティ関連
  recordLoginAttempt(
    username: string,
    success: boolean,
    ipAddress?: string,
  ): Promise<void>;
  getFailedLoginAttempts(username: string, since: Date): Promise<number>;
  resetFailedLoginAttempts(username: string): Promise<void>;
}
