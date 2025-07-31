import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '@fuji-calendar/utils';
import { AUTH_CONFIG } from '../config/auth';

const logger = getComponentLogger('AuthMiddleware');

interface AuthenticatedRequest extends Request {
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
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
        message: '認証トークンが提供されていません。再ログインしてください。'
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
        where: { id: decoded.adminId }
      });

      if (!admin) {
        logger.warn('認証失敗: 管理者が存在しません', { adminId: decoded.adminId });
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: '無効な認証トークンです。再ログインしてください。'
        });
        return;
      }

      // リクエストオブジェクトに管理者情報を追加
      req.admin = {
        id: admin.id,
        username: admin.username,
        email: admin.email
      };

      next();
    } catch (jwtError) {
      logger.warn('JWT 検証エラー', { error: jwtError });
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: '無効または期限切れの認証トークンです。再ログインしてください。'
      });
    }
  } catch (error) {
    logger.error('認証ミドルウェアエラー', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '認証処理中にエラーが発生しました。'
    });
  }
};

/**
 * オプショナル認証ミドルウェア（認証されていなくてもエラーにしない）
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as any;
      
      const prisma = PrismaClientManager.getInstance();
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId }
      });

      if (admin) {
        req.admin = {
          id: admin.id,
          username: admin.username,
          email: admin.email
        };
      }
    } catch (jwtError) {
      // オプショナル認証なのでエラーは無視
      logger.debug('オプショナル認証: トークン無効', { error: jwtError });
    }

    next();
  } catch (error) {
    logger.error('オプショナル認証ミドルウェアエラー', error);
    next(); // エラーでも処理を続行
  }
};

/**
 * レート制限ミドルウェア（認証 API 用）
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // 簡易的なレート制限実装
  // 本番環境では express-rate-limit などを使用することを推奨
  next();
};

/**
 * 管理者 API 用レート制限
 */
export const adminApiRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // 簡易的なレート制限実装
  // 本番環境では express-rate-limit などを使用することを推奨
  next();
};