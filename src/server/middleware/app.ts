import express, { Express } from 'express';
import cors from 'cors';
import { 
  securityHeaders, 
  apiRateLimit, 
  sanitizeInput, 
  detectSQLInjection 
} from './security';
import { 
  requestIdMiddleware, 
  httpLoggerMiddleware, 
  performanceMiddleware,
  securityLoggingMiddleware,
  astronomicalLoggingMiddleware,
  setupFileLogging
} from './logging';
import { Bootstrap } from '../bootstrap';

/**
 * ミドルウェアの設定
 */
export function setupMiddleware(app: Express): void {
  // ファイルログ設定
  setupFileLogging();

  // リクエスト追跡とロギング
  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware);
  app.use(performanceMiddleware);
  app.use(securityLoggingMiddleware);
  app.use(astronomicalLoggingMiddleware);

  // セキュリティヘッダー
  app.use(securityHeaders);

  // CORS 設定
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : true, // 開発環境では同一ポートなので true
    credentials: true
  }));

  // レート制限
  app.use(apiRateLimit);

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // セキュリティミドルウェア
  app.use(sanitizeInput);
  app.use(detectSQLInjection);

  // 静的ファイル配信
  app.use(express.static(Bootstrap.getStaticPath()));
}