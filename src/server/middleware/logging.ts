import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { logger, generateRequestId, StructuredLogger, getComponentLogger } from '../../shared/utils/logger';

/**
 * Express用のリクエストIDミドルウェア
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Pino HTTPログミドルウェア
 */
export const httpLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req: Request) => req.requestId,
  serializers: {
    req: (req: Request) => ({
      id: req.requestId,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      remoteAddress: req.connection?.remoteAddress,
      remotePort: req.connection?.remotePort
    }),
    res: (res: Response) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders ? res.getHeaders() : {}
    })
  },
  customLogLevel: (req: Request, res: Response, err?: Error) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return 'info';
    }
    return 'info';
  },
  customSuccessMessage: (req: Request, res: Response) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req: Request, res: Response, err: Error) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  }
});

/**
 * APIエンドポイント別のパフォーマンス測定ミドルウェア
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const componentLogger = getComponentLogger('api-performance', {
    requestId: req.requestId,
    endpoint: `${req.method} ${req.route?.path || req.path}`
  });

  // レスポンス完了時にパフォーマンスログを出力
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = duration > 1000 ? 'warn' : 'info';
    
    componentLogger[logLevel](`API ${req.method} ${req.originalUrl} completed`, {
      statusCode: res.statusCode,
      duration,
      slow: duration > 1000
    });
  });

  next();
}

/**
 * エラーログ用ミドルウェア
 */
export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errorLogger = getComponentLogger('error-handler', {
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // エラーの種類に応じてログレベルを調整
  if (res.statusCode >= 500) {
    errorLogger.error('Internal server error occurred', err, {
      statusCode: res.statusCode,
      stack: err.stack
    });
  } else if (res.statusCode >= 400) {
    errorLogger.warn('Client error occurred', err, {
      statusCode: res.statusCode
    });
  } else {
    errorLogger.info('Request handled with error', err, {
      statusCode: res.statusCode
    });
  }

  next(err);
}

/**
 * セキュリティ関連のログミドルウェア
 */
export function securityLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const securityLogger = getComponentLogger('security', {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 認証関連のエンドポイントをログ
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    securityLogger.info('Security-sensitive endpoint accessed', {
      endpoint: req.path,
      method: req.method,
      hasAuth: !!req.headers.authorization
    });
  }

  // 不審なリクエストの検出
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/, // XSS attempt
    /union.*select/i, // SQL injection
    /eval\(/i // Code injection
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(req.get('User-Agent') || '') ||
    pattern.test(JSON.stringify(req.body) || '')
  );

  if (isSuspicious) {
    securityLogger.warn('Suspicious request detected', {
      url: req.url,
      body: req.body,
      headers: req.headers
    });
  }

  next();
}

/**
 * 天体計算処理専用のログミドルウェア
 */
export function astronomicalLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 天体計算関連のエンドポイントのみに適用
  if (req.path.includes('/calendar') || req.path.includes('/events')) {
    const astroLogger = getComponentLogger('astronomical-api', {
      requestId: req.requestId,
      endpoint: req.path
    });

    astroLogger.debug('Astronomical calculation request started', {
      query: req.query,
      params: req.params
    });

    // レスポンス完了時に結果をログ
    const originalSend = res.send;
    res.send = function(body: any) {
      try {
        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
        if (responseData && responseData.events) {
          astroLogger.info('Astronomical calculation completed', {
            eventCount: responseData.events.length,
            year: responseData.year,
            month: responseData.month
          });
        }
      } catch (error) {
        // JSON parseエラーは無視（テキストレスポンス等）
      }
      
      return originalSend.call(this, body);
    };
  }

  next();
}

/**
 * データベース操作のログ用ユーティリティ
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  data?: any,
  requestId?: string
): void {
  const dbLogger = getComponentLogger('database', { requestId });
  dbLogger.database(operation, table, data);
}

/**
 * ログファイル出力設定のためのヘルパー
 */
export function setupFileLogging(): void {
  if (process.env.ENABLE_FILE_LOGGING === 'true') {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = process.env.LOG_DIR || './logs';
    
    // ログディレクトリの作成
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // ローテーションのための日付ベースファイル名
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(logDir, `fuji-calendar-${today}.log`);
    
    // ファイル出力ストリームの設定
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    // プロセス終了時にストリームを閉じる
    process.on('exit', () => {
      logStream.end();
    });
    
    process.on('SIGINT', () => {
      logStream.end();
      process.exit(0);
    });
  }
}

// TypeScript拡張: Request型にrequestIdプロパティを追加
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}