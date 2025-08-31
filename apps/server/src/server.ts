import "reflect-metadata";
import express from "express";
import { container } from "tsyringe";
import { Bootstrap } from "./bootstrap";
import { setupMiddleware } from "./middleware/app";
import { setupRoutes } from "./routes";
import { configureContainer } from "./di/tsyringe.config";
import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("server");

// DIコンテナの初期化
configureContainer(container);
logger.info("DIコンテナ初期化完了");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ミドルウェアの設定
setupMiddleware(app);

// ルートの設定
setupRoutes(app, container);

// グレースフルシャットダウン
process.on("SIGTERM", async () => {
  await Bootstrap.shutdown(container);
  process.exit(0);
});

process.on("SIGINT", async () => {
  await Bootstrap.shutdown(container);
  process.exit(0);
});

// サーバー起動
Bootstrap.startServer({ app, port: PORT }, container);
