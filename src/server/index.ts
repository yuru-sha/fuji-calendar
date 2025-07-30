import express from 'express';
import { Bootstrap } from './bootstrap';
import { setupMiddleware } from './middleware/app';
import { setupRoutes } from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ミドルウェアの設定
setupMiddleware(app);

// ルートの設定
setupRoutes(app);

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  await Bootstrap.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await Bootstrap.shutdown();
  process.exit(0);
});

// サーバー起動
Bootstrap.startServer({ app, port: PORT });