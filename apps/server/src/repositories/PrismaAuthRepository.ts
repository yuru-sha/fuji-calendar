import { Admin } from "../shared";
import { AuthRepository } from "./interfaces/AuthRepository";
import { PrismaClientManager } from "../database/prisma";
import { getComponentLogger } from "../shared";

const logger = getComponentLogger("prisma-auth-repository");

export class PrismaAuthRepository implements AuthRepository {
  private prisma = PrismaClientManager.getInstance();

  async findAdminByUsername(username: string): Promise<Admin | null> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        return null;
      }

      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        passwordHash: admin.passwordHash,
        createdAt: admin.createdAt,
      };
    } catch (error) {
      logger.error("管理者取得エラー", { username, error });
      throw error;
    }
  }

  async updateAdminPassword(
    adminId: number,
    passwordHash: string,
  ): Promise<void> {
    try {
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { passwordHash },
      });
      logger.info("管理者パスワード更新完了", { adminId });
    } catch (error) {
      logger.error("管理者パスワード更新エラー", { adminId, error });
      throw error;
    }
  }

  async saveRefreshToken(
    adminId: number,
    _refreshToken: string,
    _expiresAt: Date,
  ): Promise<void> {
    // Refresh token 機能は未実装（JWT のみ使用）
    logger.debug("リフレッシュトークン機能は未実装", { adminId });
  }

  async findValidRefreshToken(
    _token: string,
  ): Promise<{ adminId: number; expiresAt: Date } | null> {
    // Refresh token 機能は未実装（JWT のみ使用）
    logger.debug("リフレッシュトークン機能は未実装");
    return null;
  }

  async revokeRefreshToken(_token: string): Promise<void> {
    // Refresh token 機能は未実装（JWT のみ使用）
    logger.debug("リフレッシュトークン機能は未実装");
  }

  async revokeAllRefreshTokens(adminId: number): Promise<void> {
    // Refresh token 機能は未実装（JWT のみ使用）
    logger.debug("リフレッシュトークン機能は未実装", { adminId });
  }

  async cleanupExpiredTokens(): Promise<number> {
    // Refresh token 機能は未実装（JWT のみ使用）
    logger.debug("リフレッシュトークン機能は未実装");
    return 0;
  }

  async recordLoginAttempt(
    username: string,
    success: boolean,
    ipAddress?: string,
  ): Promise<void> {
    try {
      // login_attempts テーブルがある場合の実装
      // 現在のスキーマにはないため、ログ出力のみ行う
      logger.info("ログイン試行記録", {
        username,
        success,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("ログイン試行記録エラー", { username, success, error });
      // この機能は補助的なものなので、エラーでも処理を継続
    }
  }

  async getFailedLoginAttempts(username: string, since: Date): Promise<number> {
    try {
      // login_attempts テーブルがある場合の実装
      // 現在のスキーマにはないため、0 を返す
      logger.debug("失敗ログイン試行回数取得", { username, since });
      return 0;
    } catch (error) {
      logger.error("失敗ログイン試行回数取得エラー", { username, error });
      return 0;
    }
  }

  async resetFailedLoginAttempts(username: string): Promise<void> {
    try {
      // login_attempts テーブルがある場合の実装
      // 現在のスキーマにはないため、ログ出力のみ行う
      logger.debug("失敗ログイン試行回数リセット", { username });
    } catch (error) {
      logger.error("失敗ログイン試行回数リセットエラー", { username, error });
      // この機能は補助的なものなので、エラーでも処理を継続
    }
  }
}
