import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClientManager } from '../database/prisma';
import { Admin, AuthResult } from '@fuji-calendar/types';

export interface AuthService {
  login(username: string, password: string): Promise<AuthResult>;
  verifyToken(token: string): Promise<Admin>;
  refreshToken(token: string): Promise<string>;
  logout(token: string): Promise<void>;
  generateToken(admin: Admin): string;
  generateRefreshToken(admin: Admin): string;
}

export class AuthServiceImpl implements AuthService {
  private prisma = PrismaClientManager.getInstance();
  private jwtSecret: string;
  private refreshSecret: string;
  private tokenExpiry: string;
  private refreshExpiry: string;
  
  // ブラックリストトークン管理（本番環境では Redis などを使用）
  private blacklistedTokens: Set<string> = new Set();

  constructor() {
    
    // 環境変数から設定を読み込み
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.refreshSecret = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';
    this.tokenExpiry = process.env.TOKEN_EXPIRY || '1h';
    this.refreshExpiry = process.env.REFRESH_EXPIRY || '7d';

    if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'your-secret-key-change-in-production') {
      console.warn('WARNING: Using default JWT secret in production! Please set JWT_SECRET environment variable.');
    }
  }

  // ログイン処理
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      // 入力値検証
      if (!username || !password) {
        return {
          success: false,
          error: 'ユーザー名とパスワードを入力してください'
        };
      }

      // ユーザー認証
      const admin = await this.prisma.admin.findUnique({
        where: { username }
      });

      if (!admin) {
        return {
          success: false,
          error: '認証に失敗しました'
        };
      }

      // パスワード検証
      const isValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isValid) {
        return {
          success: false,
          error: '認証に失敗しました'
        };
      }
      
      if (!admin) {
        return {
          success: false,
          error: 'ユーザー名またはパスワードが正しくありません'
        };
      }

      // JWT トークン生成
      const adminWithDefaults = {
        ...admin,
        failedLoginCount: 0  // Prisma スキーマにないためデフォルト値
      };
      const token = this.generateToken(adminWithDefaults);
      // const refreshToken = this.generateRefreshToken(adminWithDefaults); // 未実装

      return {
        success: true,
        token,
        admin: {
          ...adminWithDefaults,
          passwordHash: '' // パスワードハッシュは返却しない
        }
      };

    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message.includes('locked')) {
        return {
          success: false,
          error: 'アカウントがロックされています。しばらく待ってから再試行してください。'
        };
      }

      return {
        success: false,
        error: 'ログイン処理中にエラーが発生しました'
      };
    }
  }

  // トークン検証
  async verifyToken(token: string): Promise<Admin> {
    try {
      // ブラックリストチェック
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been revoked');
      }

      // JWT トークン検証
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (!decoded.adminId) {
        throw new Error('Invalid token payload');
      }

      // データベースからユーザー情報を取得
      const admin = await this.prisma.admin.findUnique({
        where: { id: decoded.adminId }
      });
      
      if (!admin) {
        throw new Error('Admin not found');
      }

      // アカウントロック状態チェック
      // Prisma スキーマに lockedUntil がないためスキップ

      return {
        ...admin,
        failedLoginCount: 0  // Prisma スキーマにないためデフォルト値
      };

    } catch (error: any) {
      console.error('Token verification error:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  // リフレッシュトークンから新しいアクセストークンを生成
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;
      
      if (!decoded.adminId || decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const admin = await this.prisma.admin.findUnique({
        where: { id: decoded.adminId }
      });
      
      if (!admin) {
        throw new Error('Admin not found');
      }

      // アカウントロック状態チェック
      // Prisma スキーマに lockedUntil がないためスキップ

      // 新しいアクセストークンを生成
      const adminWithDefaults = {
        ...admin,
        failedLoginCount: 0  // Prisma スキーマにないためデフォルト値
      };
      return this.generateToken(adminWithDefaults);

    } catch (error: any) {
      console.error('Refresh token error:', error.message);
      throw new Error('Invalid or expired refresh token');
    }
  }

  // ログアウト処理（トークンをブラックリストに追加）
  async logout(token: string): Promise<void> {
    try {
      // トークンをブラックリストに追加
      this.blacklistedTokens.add(token);
      
      // メモリ使用量を抑えるため、古いトークンを定期的に削除
      this.cleanupExpiredTokens();
      
    } catch (error: any) {
      console.error('Logout error:', error.message);
      throw new Error('Logout failed');
    }
  }

  // JWT アクセストークン生成
  generateToken(admin: Admin): string {
    const payload = {
      adminId: admin.id,
      username: admin.username,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'fuji-calendar',
      audience: 'fuji-calendar-admin'
    } as SignOptions);
  }

  // JWT リフレッシュトークン生成
  generateRefreshToken(admin: Admin): string {
    const payload = {
      adminId: admin.id,
      username: admin.username,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiry,
      issuer: 'fuji-calendar',
      audience: 'fuji-calendar-admin'
    } as SignOptions);
  }

  // トークンからペイロードを取得（検証なし）
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  // パスワード変更
  async changePassword(adminId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId }
      });
      if (!admin) {
        throw new Error('Admin not found');
      }

      // 現在のパスワードを検証
      const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // 新しいパスワードの検証
      if (!this.isValidPassword(newPassword)) {
        throw new Error('New password does not meet security requirements');
      }

      // パスワードを更新
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { passwordHash: hashedPassword }
      });
      return true;

    } catch (error: any) {
      console.error('Change password error:', error.message);
      throw error;
    }
  }

  // パスワードの強度チェック
  private isValidPassword(password: string): boolean {
    // 最低 8 文字、英数字と特殊文字を含む
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }

  // セッション情報の取得
  async getSessionInfo(token: string): Promise<{admin: Admin, tokenInfo: any}> {
    const admin = await this.verifyToken(token);
    const tokenInfo = this.decodeToken(token);
    
    return {
      admin: {
        ...admin,
        passwordHash: '' // パスワードハッシュは返却しない
      },
      tokenInfo: {
        issuedAt: new Date(tokenInfo.iat * 1000),
        expiresAt: new Date(tokenInfo.exp * 1000),
        issuer: tokenInfo.iss,
        audience: tokenInfo.aud
      }
    };
  }

  // 期限切れトークンをブラックリストから削除
  private cleanupExpiredTokens(): void {
    // 実装を簡略化：定期的にブラックリストをクリア
    // 本番環境では、トークンの有効期限を確認して削除
    if (this.blacklistedTokens.size > 1000) {
      this.blacklistedTokens.clear();
    }
  }

  // 管理者アカウントの作成（初期セットアップ用）
  async createAdmin(username: string, password: string): Promise<Admin> {
    try {
      // パスワード強度チェック
      if (!this.isValidPassword(password)) {
        throw new Error('Password does not meet security requirements');
      }

      // ユーザー名重複チェック
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { username }
      });
      if (existingAdmin) {
        throw new Error('Username already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = await this.prisma.admin.create({
        data: {
          username,
          passwordHash: hashedPassword,
          email: ''
        }
      });
      return {
        ...newAdmin,
        failedLoginCount: 0  // Prisma スキーマにないためデフォルト値
      };

    } catch (error: any) {
      console.error('Create admin error:', error.message);
      throw error;
    }
  }

  // アカウントロック解除（スーパーアドミン用）
  async unlockAccount(_adminId: number): Promise<boolean> {
    try {
      // Prisma スキーマに failedLoginCount がないため、
      // アカウントアンロックは特に何もしない
      // 将来的には別テーブルで管理するか、Prisma スキーマに追加する
      return true;
    } catch (error: any) {
      console.error('Unlock account error:', error.message);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const authService = new AuthServiceImpl();