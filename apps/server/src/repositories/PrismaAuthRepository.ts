import { Admin } from "@fuji-calendar/types";
import { getComponentLogger } from "@fuji-calendar/utils";
import { AuthRepository } from "./interfaces/AuthRepository";
import { PrismaClientManager } from "../database/prisma";

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

  async findAdminById(adminId: number): Promise<Admin | null> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
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
      logger.error("管理者 ID 取得エラー", { adminId, error });
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
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          adminId,
          expiresAt,
        },
      });
      logger.info("リフレッシュトークン保存完了", { adminId });
    } catch (error) {
      logger.error("リフレッシュトークン保存エラー", { adminId, error });
      throw error;
    }
  }

  async findValidRefreshToken(
    token: string,
  ): Promise<{ adminId: number; expiresAt: Date } | null> {
    try {
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { 
          token,
        },
        select: {
          adminId: true,
          expiresAt: true,
          isRevoked: true,
        },
      });

      if (!refreshToken || refreshToken.isRevoked || refreshToken.expiresAt < new Date()) {
        return null;
      }

      return {
        adminId: refreshToken.adminId,
        expiresAt: refreshToken.expiresAt,
      };
    } catch (error) {
      logger.error("リフレッシュトークン検索エラー", { error });
      throw error;
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });
      logger.info("リフレッシュトークン無効化完了");
    } catch (error) {
      logger.error("リフレッシュトークン無効化エラー", { error });
      throw error;
    }
  }

  async revokeAllRefreshTokens(adminId: number): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { 
          adminId,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
      logger.info("全リフレッシュトークン無効化完了", { adminId });
    } catch (error) {
      logger.error("全リフレッシュトークン無効化エラー", { adminId, error });
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });
      
      if (result.count > 0) {
        logger.info("期限切れ・無効化済みトークンクリーンアップ完了", { 
          deletedCount: result.count 
        });
      }
      
      return result.count;
    } catch (error) {
      logger.error("トークンクリーンアップエラー", { error });
      throw error;
    }
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

  async incrementFailedLoginCount(adminId: number): Promise<void> {
    try {
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { 
          failedLoginCount: { increment: 1 } 
        },
      });
      logger.info("失敗ログイン回数増加", { adminId });
    } catch (error) {
      logger.error("失敗ログイン回数増加エラー", { adminId, error });
      throw error;
    }
  }

  async resetFailedLoginCount(adminId: number): Promise<void> {
    try {
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { 
          failedLoginCount: 0,
          lockedUntil: null 
        },
      });
      logger.info("失敗ログイン回数リセット", { adminId });
    } catch (error) {
      logger.error("失敗ログイン回数リセットエラー", { adminId, error });
      throw error;
    }
  }

  async lockAccount(adminId: number, lockDurationMinutes: number): Promise<void> {
    try {
      const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { lockedUntil },
      });
      logger.warn("アカウントロック実行", { 
        adminId, 
        lockDurationMinutes,
        lockedUntil: lockedUntil.toISOString() 
      });
    } catch (error) {
      logger.error("アカウントロックエラー", { adminId, error });
      throw error;
    }
  }

  async isAccountLocked(adminId: number): Promise<boolean> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
        select: { lockedUntil: true },
      });

      if (!admin || !admin.lockedUntil) {
        return false;
      }

      const isLocked = admin.lockedUntil > new Date();
      
      if (!isLocked) {
        // ロック期間が過ぎていたら自動的にクリア
        await this.prisma.admin.update({
          where: { id: adminId },
          data: { lockedUntil: null },
        });
      }
      
      return isLocked;
    } catch (error) {
      logger.error("アカウントロック状態確認エラー", { adminId, error });
      return false; // エラー時は安全側に倒してロック状態とみなさない
    }
  }

  async updateLastLogin(adminId: number): Promise<void> {
    try {
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { lastLoginAt: new Date() },
      });
      logger.info("最終ログイン時刻更新", { adminId });
    } catch (error) {
      logger.error("最終ログイン時刻更新エラー", { adminId, error });
      throw error;
    }
  }
}
