import { Express } from 'express';
import path from 'path';
import { getComponentLogger } from '@fuji-calendar/utils';

const logger = getComponentLogger('bootstrap');

export interface BootstrapConfig {
  app: Express;
  port: number;
}

export class Bootstrap {
  /**
   * アプリケーションの初期化
   */
  static async initialize(): Promise<void> {
    logger.info('アプリケーション初期化開始');
    
    // 簡略化された初期化処理
    logger.info('アプリケーション初期化完了');
  }

  /**
   * サーバーの起動
   */
  static async startServer(config: BootstrapConfig): Promise<void> {
    const { app, port } = config;

    try {
      await this.initialize();

      app.listen(Number(port), () => {
        logger.info('サーバー起動完了', {
          port,
          environment: process.env.NODE_ENV || 'development',
          endpoint: `http://localhost:${port}/api`
        });
      });
    } catch (error) {
      logger.fatal('サーバー起動失敗', error);
      process.exit(1);
    }
  }

  /**
   * グレースフルシャットダウン
   */
  static async shutdown(): Promise<void> {
    logger.info('グレースフルシャットダウン開始');
    logger.info('グレースフルシャットダウン完了');
  }

  /**
   * 静的ファイルのパスを取得
   */
  static getStaticPath(): string {
    return path.join(__dirname, '../../../apps/client/dist');
  }

  /**
   * フロントエンドの index.html パスを取得
   */
  static getIndexHtmlPath(): string {
    return path.join(__dirname, '../../../apps/client/dist/index.html');
  }
}