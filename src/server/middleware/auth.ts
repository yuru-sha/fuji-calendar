import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getComponentLogger } from '../../shared/utils/logger';

const prisma = new PrismaClient();
const logger = getComponentLogger('auth-middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Request インターフェースを拡張して admin プロパティを追加
declare module 'express-serve-static-core' {
  interface Request {
    admin?: {
      id: number;
      username: string;
      email: string;
    };
  }
}

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '認証トークンが提供されていません。'
      });
    }

    const token = authHeader.substring(7); // "Bearer " を除去

    // トークンの検証
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 管理者の存在確認
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId }
    });
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '無効なトークンです。'
      });
    }

    // リクエストオブジェクトに管理者情報を追加
    req.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email
    };

    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '無効なトークンです。'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'トークンの有効期限が切れています。再度ログインしてください。'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '認証処理中にエラーが発生しました。'
    });
  }
};

// クライアント IP アドレスを取得するヘルパー関数
export const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

export default authenticateAdmin;