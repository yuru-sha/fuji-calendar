import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { PrismaClientManager } from "../database/prisma";
import { getComponentLogger } from "@fuji-calendar/utils";
import { AUTH_CONFIG } from "../config/auth";

const logger = getComponentLogger("AuthMiddleware");

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: number;
    username: string;
    email: string;
  };
}

/**
 * JWT 認証ミドルウェア
 */
export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "No token provided",
        message: "認証トークンが提供されていません。再ログインしてください。",
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      // トークンを検証
      const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as any;

      // データベースで管理者の存在を確認
      const prisma = PrismaClientManager.getInstance();
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
      });

      if (!admin) {
        logger.warn("認証失敗: 管理者が存在しません", {
          adminId: decoded.adminId,
        });
        res.status(401).json({
          success: false,
          error: "Invalid token",
          message: "無効な認証トークンです。再ログインしてください。",
        });
        return;
      }

      // リクエストオブジェクトに管理者情報を追加
      req.admin = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      };

      next();
    } catch (jwtError) {
      logger.warn("JWT 検証エラー", { error: jwtError });
      res.status(401).json({
        success: false,
        error: "Invalid token",
        message:
          "無効または期限切れの認証トークンです。再ログインしてください。",
      });
    }
  } catch (error) {
    logger.error("認証ミドルウェアエラー", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "認証処理中にエラーが発生しました。",
    });
  }
};

/**
 * オプショナル認証ミドルウェア（認証されていなくてもエラーにしない）
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as any;

      const prisma = PrismaClientManager.getInstance();
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
      });

      if (admin) {
        req.admin = {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        };
      }
    } catch (jwtError) {
      // オプショナル認証なのでエラーは無視
      logger.debug("オプショナル認証: トークン無効", { error: jwtError });
    }

    next();
  } catch (error) {
    logger.error("オプショナル認証ミドルウェアエラー", error);
    next(); // エラーでも処理を続行
  }
};

/**
 * レート制限ミドルウェア（認証 API 用）
 * ログイン試行の制限: 15 分間で 5 回まで
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分
  max: 5, // 最大 5 回の試行
  standardHeaders: true, // `RateLimit-*` ヘッダーを返す
  legacyHeaders: false, // `X-RateLimit-*` ヘッダーを無効化
  message: {
    success: false,
    error: "Too many login attempts",
    message: "ログイン試行回数が上限に達しました。15 分後に再試行してください。",
  },
  handler: (req, res) => {
    logger.warn("認証レート制限に達しました", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    res.status(429).json({
      success: false,
      error: "Too many login attempts",
      message: "ログイン試行回数が上限に達しました。15 分後に再試行してください。",
    });
  },
  skip: (req) => {
    // 開発環境では localhost からの制限をスキップ
    return process.env.NODE_ENV === "development" && 
           (req.ip === "127.0.0.1" || req.ip === "::1");
  },
});

/**
 * 管理者 API 用レート制限
 * 管理者 API: 1 分間で 100 回まで（通常使用に支障なく、悪用は防ぐ）
 */
export const adminApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分
  max: 100, // 最大 100 回の操作
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many API requests",
    message: "API 使用回数が上限に達しました。1 分後に再試行してください。",
  },
  handler: (req, res) => {
    logger.warn("管理者 API レート制限に達しました", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
    });
    res.status(429).json({
      success: false,
      error: "Too many API requests", 
      message: "API 使用回数が上限に達しました。1 分後に再試行してください。",
    });
  },
  skip: (req) => {
    // 開発環境では localhost からの制限をスキップ
    return process.env.NODE_ENV === "development" && 
           (req.ip === "127.0.0.1" || req.ip === "::1");
  },
});
