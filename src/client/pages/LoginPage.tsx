import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('ユーザー名とパスワードを入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // JWTトークンをローカルストレージに保存
        localStorage.setItem('adminToken', result.token);
        
        // 管理画面にリダイレクト
        navigate('/admin');
      } else {
        setError(result.message || 'ログインに失敗しました。');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました。');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className="content-narrow">
        <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1 className={styles.title}>管理者ログイン</h1>
          <p className={styles.subtitle}>ダイヤモンド富士・パール富士カレンダー</p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className={styles.errorClose}
              aria-label="エラーを閉じる"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">ユーザー名</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="管理者ユーザー名を入力"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="パスワードを入力"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <a href="/" className={styles.backLink}>
            ← カレンダーに戻る
          </a>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;