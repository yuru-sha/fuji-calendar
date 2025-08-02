import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthService } from "./interfaces/AuthService";
import { AuthRepository } from "../repositories/interfaces/AuthRepository";
import { getComponentLogger } from "../shared";

const logger = getComponentLogger("auth-service");

export class AuthServiceImpl implements AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTokenExpiry = "24h"; // 24 時間
  private readonly refreshTokenExpiry = "7d"; // 7 日

  constructor(private authRepository: AuthRepository) {
    this.jwtSecret = process.env.JWT_SECRET || "fallback-secret";
    this.refreshSecret =
      process.env.REFRESH_SECRET || "fallback-refresh-secret";

    if (
      process.env.NODE_ENV === "production" &&
      (this.jwtSecret === "fallback-secret" ||
        this.refreshSecret === "fallback-refresh-secret")
    ) {
      logger.warn("本番環境でデフォルトの JWT シークレットが使用されています");
    }
  }

  async authenticate(
    username: string,
    password: string,
    ipAddress?: string,
  ): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    message: string;
    admin?: {
      id: number;
      username: string;
    };
  }> {
    try {
      logger.info("認証試行開始", { username, ipAddress });

      // 管理者情報取得
      const admin = await this.authRepository.findAdminByUsername(username);
      if (!admin) {
        await this.authRepository.recordLoginAttempt(
          username,
          false,
          ipAddress,
        );
        logger.warn("認証失敗 - ユーザーが見つかりません", {
          username,
          ipAddress,
        });
        return {
          success: false,
          message: "ユーザー名またはパスワードが正しくありません。",
        };
      }

      // パスワード検証
      const isValidPassword = await bcrypt.compare(
        password,
        admin.passwordHash,
      );
      if (!isValidPassword) {
        await this.authRepository.recordLoginAttempt(
          username,
          false,
          ipAddress,
        );
        logger.warn("認証失敗 - パスワードが正しくありません", {
          username,
          ipAddress,
        });
        return {
          success: false,
          message: "ユーザー名またはパスワードが正しくありません。",
        };
      }

      // トークン生成
      const accessToken = this.generateAccessToken(admin.id, admin.username);
      const refreshToken = this.generateRefreshToken();

      // リフレッシュトークンをデータベースに保存
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 日後
      await this.authRepository.saveRefreshToken(
        admin.id,
        refreshToken,
        refreshExpiresAt,
      );

      // 成功記録
      await this.authRepository.recordLoginAttempt(username, true, ipAddress);
      await this.authRepository.resetFailedLoginAttempts(username);

      logger.info("認証成功", { username, adminId: admin.id, ipAddress });

      return {
        success: true,
        accessToken,
        refreshToken,
        message: "認証に成功しました。",
        admin: {
          id: admin.id,
          username: admin.username,
        },
      };
    } catch (error) {
      logger.error("認証処理エラー", { username, ipAddress, error });
      return {
        success: false,
        message: "認証処理中にエラーが発生しました。",
      };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    message: string;
  }> {
    try {
      logger.debug("アクセストークン更新試行");

      // リフレッシュトークンの検証
      const tokenData =
        await this.authRepository.findValidRefreshToken(refreshToken);
      if (!tokenData) {
        logger.warn("無効なリフレッシュトークン");
        return {
          success: false,
          message: "リフレッシュトークンが無効です。",
        };
      }

      // 管理者情報取得
      const admin = await this.authRepository.findAdminByUsername("admin"); // 実際のプロジェクトでは管理者 ID から取得
      if (!admin) {
        logger.error("管理者情報の取得に失敗");
        return {
          success: false,
          message: "管理者情報の取得に失敗しました。",
        };
      }

      // 新しいアクセストークン生成
      const accessToken = this.generateAccessToken(admin.id, admin.username);

      logger.info("アクセストークン更新成功", { adminId: admin.id });

      return {
        success: true,
        accessToken,
        message: "アクセストークンを更新しました。",
      };
    } catch (error) {
      logger.error("アクセストークン更新エラー", { error });
      return {
        success: false,
        message: "トークン更新中にエラーが発生しました。",
      };
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.authRepository.revokeRefreshToken(refreshToken);
      logger.info("リフレッシュトークン無効化完了");
    } catch (error) {
      logger.error("リフレッシュトークン無効化エラー", { error });
      throw error;
    }
  }

  async revokeAllRefreshTokens(adminId: number): Promise<void> {
    try {
      await this.authRepository.revokeAllRefreshTokens(adminId);
      logger.info("全リフレッシュトークン無効化完了", { adminId });
    } catch (error) {
      logger.error("全リフレッシュトークン無効化エラー", { adminId, error });
      throw error;
    }
  }

  async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.info("パスワード変更試行", { adminId });

      // 現在の管理者情報を取得
      const admin = await this.authRepository.findAdminByUsername("admin"); // 簡易実装: admin 固定
      if (!admin || admin.id !== adminId) {
        logger.warn("パスワード変更失敗 - 管理者が見つかりません", { adminId });
        return {
          success: false,
          message: "管理者情報が見つかりません。",
        };
      }

      // 現在のパスワード検証
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        admin.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        logger.warn("パスワード変更失敗 - 現在のパスワードが正しくありません", {
          adminId,
        });
        return {
          success: false,
          message: "現在のパスワードが正しくありません。",
        };
      }

      // 新しいパスワードのハッシュ化
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      logger.debug("新しいパスワードハッシュ生成完了", {
        hashLength: newPasswordHash.length,
      });

      // パスワード更新
      await this.authRepository.updateAdminPassword(adminId, newPasswordHash);

      logger.info("パスワード変更成功", { adminId });

      return {
        success: true,
        message: "パスワードを変更しました。",
      };
    } catch (error) {
      logger.error("パスワード変更エラー", { adminId, error });
      return {
        success: false,
        message: "パスワード変更中にエラーが発生しました。",
      };
    }
  }

  async verifyAccessToken(token: string): Promise<{
    valid: boolean;
    adminId?: number;
    username?: string;
  }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        adminId: number;
        username: string;
        iat: number;
        exp: number;
      };

      return {
        valid: true,
        adminId: decoded.adminId,
        username: decoded.username,
      };
    } catch (error) {
      logger.debug("アクセストークン検証失敗", {
        error: error instanceof Error ? error.message : error,
      });
      return {
        valid: false,
      };
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const deletedCount = await this.authRepository.cleanupExpiredTokens();
      logger.info("期限切れトークンクリーンアップ完了", { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error("期限切れトークンクリーンアップエラー", { error });
      throw error;
    }
  }

  private generateAccessToken(adminId: number, username: string): string {
    return jwt.sign(
      {
        adminId,
        username,
        type: "access",
      },
      this.jwtSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: "fuji-calendar",
        audience: "fuji-calendar-admin",
      },
    );
  }

  private generateRefreshToken(): string {
    return jwt.sign(
      {
        type: "refresh",
        nonce: Math.random().toString(36).substring(2, 15),
      },
      this.refreshSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: "fuji-calendar",
        audience: "fuji-calendar-admin",
      },
    );
  }
}
