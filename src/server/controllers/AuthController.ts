import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '../../shared/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export class AuthController {
  private logger = getComponentLogger('auth-controller');
  // 管理者ログイン
  // POST /api/admin/login
  async login(req: Request, res: Response) {
    try {
      const { username, password }: { username: string; password: string } = req.body;

      // バリデーション
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'ユーザー名とパスワードを入力してください。'
        });
      }

      // 管理者の検索
      const prisma = PrismaClientManager.getInstance();
      const admin = await prisma.admin.findUnique({
        where: { username }
      });
      
      if (!admin) {
        this.logger.warn('ログイン失敗: ユーザーが見つからない', { username });
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'ユーザー名またはパスワードが正しくありません。'
        });
      }

      // パスワード検証
      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidPassword) {
        this.logger.warn('ログイン失敗: パスワード不正', { username });
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'ユーザー名またはパスワードが正しくありません。'
        });
      }

      // 最終ログイン時刻を更新
      await prisma.admin.update({
        where: { id: admin.id },
        data: { updatedAt: new Date() }
      });

      // JWTトークン生成
      const token = jwt.sign(
        { 
          adminId: admin.id, 
          username: admin.username,
          role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      this.logger.info('ログイン成功', { username, adminId: admin.id });
      
      res.json({
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          lastLogin: new Date()
        },
        message: 'ログインが完了しました。'
      });

    } catch (error) {
      this.logger.error('ログインエラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'ログイン処理中にエラーが発生しました。'
      });
    }
  }

  // トークン検証
  // GET /api/admin/verify
  async verifyToken(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'トークンが提供されていません。'
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // 管理者の存在確認
      const prisma = PrismaClientManager.getInstance();
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId }
      });
      
      if (!admin) {
        this.logger.warn('トークン検証失敗: 管理者が見つからない', { adminId: decoded.adminId });
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '無効なトークンです。'
        });
      }

      res.json({
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email
        }
      });

    } catch (error) {
      this.logger.warn('トークン検証エラー', error);
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '無効なトークンです。'
      });
    }
  }

  // ログアウト（トークン無効化）
  // POST /api/admin/logout
  async logout(req: Request, res: Response) {
    // クライアント側でトークンを削除するだけでOK
    // より高度な実装では、無効化されたトークンのブラックリストを管理
    res.json({
      success: true,
      message: 'ログアウトが完了しました。'
    });
  }
}

export default AuthController;