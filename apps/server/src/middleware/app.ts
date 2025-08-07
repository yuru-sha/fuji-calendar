import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";

export function setupMiddleware(app: Express): void {
  // プロキシ信頼設定（本番環境ではプロキシ経由でアクセスされることが多い）
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // 最初のプロキシを信頼
  } else {
    // 開発環境でも Docker 等を使用する場合は必要
    app.set("trust proxy", true);
  }

  // セキュリティヘッダー
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'", 
            "https://fonts.googleapis.com",
            "https://unpkg.com", // Leaflet CSS 用
          ],
          scriptSrc: [
            "'self'",
            // 本番環境では 'unsafe-eval' は除去（セキュリティ強化）
          ],
          imgSrc: [
            "'self'", 
            "data:", 
            "https:",
            "blob:", // 地図画像用
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
          ],
          connectSrc: [
            "'self'",
            "https:", // API 通信用
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          upgradeInsecureRequests: [], // HTTPS 強制
        },
      } : false, // 開発環境では無効化（デバッグ容易性のため）
      // セキュリティヘッダー追加設定
      hsts: {
        maxAge: 31536000, // 1 年
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true, // MIME-type sniffing 防止
      frameguard: { action: 'deny' }, // clickjacking 防止
      xssFilter: true, // XSS フィルター有効化
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  // CORS 設定
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL
          : ["http://localhost:3000", "http://localhost:5173"],
      credentials: true,
    }),
  );

  // JSON 解析
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 静的ファイル配信（本番環境用）
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.join(__dirname, "../../../apps/client/dist");
    app.use(express.static(staticPath));
  }
}
