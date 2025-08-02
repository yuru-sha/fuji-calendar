/**
 * 認証関連の設定
 */

export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-jwt-secret-key",
  JWT_EXPIRES_IN: "24h",
  REFRESH_SECRET: process.env.REFRESH_SECRET || "dev-refresh-secret-key",
  REFRESH_EXPIRES_IN: "7d",
  BCRYPT_SALT_ROUNDS: 10,
} as const;
