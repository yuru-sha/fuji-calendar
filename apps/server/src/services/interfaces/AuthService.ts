export interface AuthService {
  // 認証関連
  authenticate(
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
  }>;

  // トークン関連
  refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    message: string;
  }>;

  revokeRefreshToken(refreshToken: string): Promise<void>;
  revokeAllRefreshTokens(adminId: number): Promise<void>;

  // パスワード変更
  changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{
    success: boolean;
    message: string;
  }>;

  // トークン検証
  verifyAccessToken(token: string): Promise<{
    valid: boolean;
    adminId?: number;
    username?: string;
  }>;

  // メンテナンス
  cleanupExpiredTokens(): Promise<number>;
}
