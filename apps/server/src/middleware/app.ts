import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

export function setupMiddleware(app: Express): void {
  // セキュリティヘッダー
  app.use(helmet({
    contentSecurityPolicy: false, // 開発環境では無効化
  }));

  // CORS設定
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }));

  // JSON解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 静的ファイル配信（本番環境用）
  if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../../../apps/client/dist');
    app.use(express.static(staticPath));
  }
}