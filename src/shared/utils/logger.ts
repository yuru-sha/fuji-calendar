import pino, { Logger } from 'pino';
import { Request } from 'express';

/**
 * ログレベル定義
 */
export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug', 
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

/**
 * ログコンテキスト型定義
 */
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  locationId?: number;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * 天体計算専用ログコンテキスト
 */
export interface AstronomicalLogContext extends LogContext {
  calculationType?: 'diamond' | 'pearl' | 'position';
  date?: string;
  locationName?: string;
  azimuth?: number;
  elevation?: number;
  searchTimeMs?: number;
}

/**
 * ログ設定
 */
interface LoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  enableFileOutput: boolean;
  logDir?: string;
}

/**
 * 環境別ログ設定を取得
 */
function getLoggerConfig(): LoggerConfig {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || (isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);
  
  return {
    level: logLevel,
    isDevelopment,
    enableFileOutput: process.env.ENABLE_FILE_LOGGING === 'true',
    logDir: process.env.LOG_DIR || './logs'
  };
}

/**
 * Pinoロガーの設定
 */
function createPinoLogger(): Logger {
  const config = getLoggerConfig();
  
  const baseConfig = {
    level: config.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    }
  };

  // 開発環境では見やすいフォーマットを使用
  if (config.isDevelopment && !config.enableFileOutput) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
          levelFirst: true
        }
      }
    });
  }

  // 本番環境またはファイル出力時はJSON形式
  return pino(baseConfig);
}

/**
 * メインロガーインスタンス
 */
export const logger = createPinoLogger();

/**
 * 構造化ログのヘルパークラス
 */
export class StructuredLogger {
  private baseLogger: Logger;
  private context: LogContext;

  constructor(baseLogger: Logger, context: LogContext = {}) {
    this.baseLogger = baseLogger;
    this.context = context;
  }

  /**
   * コンテキスト付き子ロガーを作成
   */
  child(additionalContext: LogContext): StructuredLogger {
    const mergedContext = { ...this.context, ...additionalContext };
    return new StructuredLogger(this.baseLogger.child(mergedContext), mergedContext);
  }

  /**
   * デバッグログ（開発時の詳細情報）
   */
  debug(message: string, data?: any): void {
    this.baseLogger.debug(data, message);
  }

  /**
   * 情報ログ（通常の動作記録）
   */
  info(message: string, data?: any): void {
    this.baseLogger.info(data, message);
  }

  /**
   * 警告ログ（注意が必要だが継続可能）
   */
  warn(message: string, data?: any): void {
    this.baseLogger.warn(data, message);
  }

  /**
   * エラーログ（エラー発生時）
   */
  error(message: string, error?: Error | any, data?: any): void {
    const logData = {
      ...data,
      err: error instanceof Error ? error : error
    };
    this.baseLogger.error(logData, message);
  }

  /**
   * 致命的エラーログ（アプリケーション停止レベル）
   */
  fatal(message: string, error?: Error | any, data?: any): void {
    const logData = {
      ...data,
      err: error instanceof Error ? error : error
    };
    this.baseLogger.fatal(logData, message);
  }

  /**
   * 天体計算専用ログ
   */
  astronomical(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context: AstronomicalLogContext
  ): void {
    const logData = {
      component: 'astronomical-calculator',
      ...context
    };
    
    this.baseLogger[level](logData, `[ASTRONOMICAL] ${message}`);
  }

  /**
   * パフォーマンス測定ログ
   */
  performance(operation: string, durationMs: number, data?: any): void {
    this.baseLogger.info({
      component: 'performance',
      operation,
      duration: durationMs,
      ...data
    }, `Performance: ${operation} completed in ${durationMs}ms`);
  }

  /**
   * APIリクエストログ
   */
  apiRequest(req: Request, message: string, data?: any): void {
    const requestData = {
      component: 'api',
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...data
    };
    
    this.baseLogger.info(requestData, `[API] ${message}`);
  }

  /**
   * データベース操作ログ
   */
  database(operation: string, table: string, data?: any): void {
    this.baseLogger.debug({
      component: 'database',
      operation,
      table,
      ...data
    }, `[DB] ${operation} on ${table}`);
  }
}

/**
 * デフォルトの構造化ロガー
 */
export const structuredLogger = new StructuredLogger(logger);

/**
 * コンポーネント別ロガー生成関数
 */
export function getComponentLogger(component: string, additionalContext?: LogContext): StructuredLogger {
  return structuredLogger.child({
    component,
    ...additionalContext
  });
}

/**
 * Express.js用のリクエストIDミドルウェア用ヘルパー
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * エラー情報の標準化
 */
export function serializeError(error: any): any {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...error
    };
  }
  return error;
}

/**
 * ログレベルの動的変更（開発用）
 */
export function setLogLevel(level: LogLevel): void {
  logger.level = level;
}

/**
 * ログ出力の一時停止/再開（テスト用）
 */
export function muteLogger(): void {
  logger.level = 'silent';
}

export function unmuteLogger(): void {
  const config = getLoggerConfig();
  logger.level = config.level;
}