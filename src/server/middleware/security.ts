import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getClientIP } from './auth';

// XSS対策：入力値をサニタイズ
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // リクエストボディのサニタイズ
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // クエリパラメータのサニタイズ
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// オブジェクトの再帰的サニタイズ
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// 文字列のサニタイズ
function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/&/g, '&amp;');
}

// SQLインジェクション対策：危険なパターンの検出
export const detectSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /('|(\\u0027)|(\\u2019)|(\\u02BC)|(\\u02B9))/i, // シングルクォート
    /(;|\x00)/i, // セミコロンやnullバイト
    /(\|\||&&)/i, // 論理演算子
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i, // SQLキーワード
    /(script|javascript|vbscript|onload|onerror|onclick)/i, // スクリプト関連
    /(<|&lt;)([^>]+)(>|&gt;)/i, // HTMLタグ
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    
    return false;
  };

  // リクエストボディをチェック
  if (req.body && checkValue(req.body)) {
    console.warn(`SQL injection attempt detected from IP: ${getClientIP(req)}`);
    return res.status(400).json({
      error: 'Invalid input detected',
      message: '不正な入力が検出されました。'
    });
  }

  // クエリパラメータをチェック
  if (req.query && checkValue(req.query)) {
    console.warn(`SQL injection attempt detected in query from IP: ${getClientIP(req)}`);
    return res.status(400).json({
      error: 'Invalid query parameter detected',
      message: '不正なクエリパラメータが検出されました。'
    });
  }

  next();
};

// CSRFトークン管理
const csrfTokens = new Map<string, { token: string; expires: Date }>();

export const generateCSRFToken = (req: Request): string => {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30分後に期限切れ
  
  const sessionId = req.sessionID || getClientIP(req);
  csrfTokens.set(sessionId, { token, expires });
  
  // 期限切れトークンを定期的にクリーンアップ
  cleanupExpiredCSRFTokens();
  
  return token;
};

export const verifyCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // GET、HEAD、OPTIONSリクエストはCSRFチェックをスキップ
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.sessionID || getClientIP(req);
  const providedToken = req.headers['x-csrf-token'] || req.body.csrfToken;
  
  const storedData = csrfTokens.get(sessionId);
  
  if (!storedData || !providedToken) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRFトークンが不足しています。'
    });
  }

  if (storedData.expires < new Date()) {
    csrfTokens.delete(sessionId);
    return res.status(403).json({
      error: 'CSRF token expired',
      message: 'CSRFトークンが期限切れです。'
    });
  }

  if (storedData.token !== providedToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: '無効なCSRFトークンです。'
    });
  }

  next();
};

// 期限切れCSRFトークンのクリーンアップ
function cleanupExpiredCSRFTokens() {
  const now = new Date();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(sessionId);
    }
  }
}

// API用レート制限（一般的な利用に適した設定）
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 100, // 100リクエスト/分
  message: {
    error: 'Too many requests',
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIP(req)
});

// 管理API用レート制限（適度な制限）
export const adminApiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 60, // 60リクエスト/分
  message: {
    error: 'Too many admin requests',
    message: '管理APIへのリクエストが多すぎます。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIP(req)
});

// 認証API用の厳格なレート制限（ブルートフォース攻撃対策）
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 5回まで（厳格）
  message: {
    error: 'Too many authentication attempts',
    message: '認証試行回数が多すぎます。15分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIP(req),
  skipSuccessfulRequests: true // 成功したリクエストはカウントしない
});

// ファイルアップロード制限
export const fileUploadLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'File too large',
      message: 'ファイルサイズが大きすぎます。'
    });
  }

  next();
};

// セキュリティヘッダー設定
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // 開発環境では無効化
  crossOriginEmbedderPolicy: false,
  hsts: false // 開発環境では無効化
});

// 本番環境でのHTTPS強制
export const forceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// リクエストサイズ制限
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 1 * 1024 * 1024; // 1MB（通常のAPIリクエスト用）

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: 'リクエストサイズが大きすぎます。'
    });
  }

  next();
};

// IPホワイトリスト（管理機能用）
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    
    // 開発環境ではIPチェックをスキップ
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    if (!allowedIPs.includes(clientIP)) {
      console.warn(`Unauthorized IP access attempt: ${clientIP}`);
      return res.status(403).json({
        error: 'IP not allowed',
        message: 'このIPアドレスからのアクセスは許可されていません。'
      });
    }

    next();
  };
};

// セキュリティログ記録
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const method = req.method;
  const path = req.path;
  const timestamp = new Date().toISOString();

  // 疑わしいリクエストをログに記録
  const suspiciousPatterns = [
    /admin/i,
    /login/i,
    /password/i,
    /token/i,
    /auth/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(path))) {
    console.log(`Security Log: ${timestamp} - IP: ${clientIP} - ${method} ${path} - UA: ${userAgent}`);
  }

  next();
};

// ブルートフォース攻撃検出（より適切なデフォルト値）
const attemptTracking = new Map<string, { count: number; firstAttempt: Date; lastAttempt: Date }>();

export const bruteForceProtection = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    const now = new Date();
    
    let attempts = attemptTracking.get(clientIP);
    
    if (!attempts) {
      attempts = { count: 1, firstAttempt: now, lastAttempt: now };
      attemptTracking.set(clientIP, attempts);
      return next();
    }

    // 時間ウィンドウをリセット
    if (now.getTime() - attempts.firstAttempt.getTime() > windowMs) {
      attempts = { count: 1, firstAttempt: now, lastAttempt: now };
      attemptTracking.set(clientIP, attempts);
      return next();
    }

    attempts.count += 1;
    attempts.lastAttempt = now;

    if (attempts.count > maxAttempts) {
      console.warn(`Brute force attack detected from IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too many attempts',
        message: '試行回数が上限に達しました。しばらく待ってから再試行してください。'
      });
    }

    next();
  };
};