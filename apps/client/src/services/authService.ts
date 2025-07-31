import { Admin } from '@fuji-calendar/types';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  admin?: Admin;
  expiresIn?: string;
  message: string;
  error?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  admin: Admin | null;
  token: string | null;
}

class AuthService {
  private baseUrl: string;
  private tokenKey = 'fuji_calendar_token';
  private adminKey = 'fuji_calendar_admin';

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://localhost:3001/api';
  }

  /**
   * ログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.token) {
        // トークンと管理者情報をローカルストレージに保存
        localStorage.setItem(this.tokenKey, data.token);
        localStorage.setItem(this.adminKey, JSON.stringify(data.admin));
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'ログイン処理中にエラーが発生しました。',
        error: 'Network error'
      };
    }
  }

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ローカルストレージからトークンと管理者情報を削除
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.adminKey);
    }
  }

  /**
   * トークン検証
   */
  async verifyToken(): Promise<{ success: boolean; admin?: Admin }> {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false };
      }

      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // 管理者情報を更新
        localStorage.setItem(this.adminKey, JSON.stringify(data.admin));
        return { success: true, admin: data.admin };
      } else {
        // トークンが無効な場合はクリア
        this.clearAuth();
        return { success: false };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuth();
      return { success: false };
    }
  }

  /**
   * パスワード変更
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, message: '認証が必要です。' };
      }

      const response = await fetch(`${this.baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message || (data.success ? 'パスワードが変更されました。' : 'パスワード変更に失敗しました。')
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'パスワード変更中にエラーが発生しました。'
      };
    }
  }

  /**
   * 現在の認証状態を取得
   */
  getAuthState(): AuthState {
    const token = this.getToken();
    const adminData = localStorage.getItem(this.adminKey);
    
    return {
      isAuthenticated: !!token,
      admin: adminData ? JSON.parse(adminData) : null,
      token,
    };
  }

  /**
   * トークンを取得
   */
  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    // トークンが存在し、空文字列でないことを確認
    return token && token.trim() !== '' ? token : null;
  }

  /**
   * 認証ヘッダーを取得
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    // トークンが有効な場合のみ Authorization ヘッダーを追加
    if (token && token.length > 10) { // JWT の最小長をチェック
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }

  /**
   * 認証情報をクリア
   */
  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.adminKey);
  }

  /**
   * 認証が必要な API リクエスト用の fetch ラッパー
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 401 エラーの場合は認証情報をクリア
    if (response.status === 401) {
      this.clearAuth();
      // ログインページにリダイレクト
      window.location.href = '/admin/login';
    }

    return response;
  }

  /**
   * 管理者作成（開発環境用）
   */
  async createAdmin(username: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message || (data.success ? '管理者が作成されました。' : '管理者作成に失敗しました。')
      };
    } catch (error) {
      console.error('Create admin error:', error);
      return {
        success: false,
        message: '管理者作成中にエラーが発生しました。'
      };
    }
  }
}

// シングルトンインスタンス
export const authService = new AuthService();

import React from 'react';

// React 用のカスタムフック
export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>(authService.getAuthState());

  React.useEffect(() => {
    // トークン検証
    const verifyAuth = async () => {
      await authService.verifyToken();
      setAuthState(authService.getAuthState());
    };

    if (authState.token) {
      verifyAuth();
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    const result = await authService.login(credentials);
    setAuthState(authService.getAuthState());
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setAuthState(authService.getAuthState());
  };

  return {
    ...authState,
    login,
    logout,
    verifyToken: authService.verifyToken.bind(authService),
    changePassword: authService.changePassword.bind(authService),
  };
}

export default authService;