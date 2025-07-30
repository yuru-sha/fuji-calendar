import pino, { Logger } from 'pino';

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
  // ブラウザ環境では process オブジェクトが存在しないことがある
  const isServer = typeof process !== 'undefined' && process.env;
  const isDevelopment = isServer ? process.env.NODE_ENV !== 'production' : true;
  const logLevel = (isServer ? (process.env.LOG_LEVEL as LogLevel) : null) || (isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);
  
  return {
    level: logLevel,
    isDevelopment,
    enableFileOutput: isServer ? process.env.ENABLE_FILE_LOGGING === 'true' : false,
    logDir: isServer ? process.env.LOG_DIR || './logs' : './logs'
  };
}

/**
 * ブラウザ用軽量ロガー
 */
class BrowserLogger {
  level: string;

  constructor(level: string = 'info') {
    this.level = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.level);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  trace(data: any, message?: string): void {
    if (this.shouldLog('trace')) {
      console.log(`[TRACE] ${message || ''}`, data);
    }
  }

  debug(data: any, message?: string): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message || ''}`, data);
    }
  }

  info(data: any, message?: string): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message || ''}`, data);
    }  
  }

  warn(data: any, message?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message || ''}`, data);
    }
  }

  error(data: any, message?: string): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message || ''}`, data);
    }
  }

  fatal(data: any, message?: string): void {
    if (this.shouldLog('fatal')) {
      console.error(`[FATAL] ${message || ''}`, data);
    }
  }

  silent(data: any, message?: string): void {
    // Do nothing - silent logging
  }

  child(context: any): BrowserLogger {
    return new BrowserLogger(this.level);
  }
}

/**
 * Pino ロガーの設定（サーバー環境用）
 */
function createPinoLogger(): Logger {
  const config = getLoggerConfig();
  
  // ブラウザ環境では軽量なロガーを使用
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
    return new BrowserLogger(config.level) as any;
  }
  
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

  // 本番環境またはファイル出力時は JSON 形式
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
  private baseLogger: Logger | BrowserLogger;
  private context: LogContext;

  constructor(baseLogger: Logger | BrowserLogger, context: LogContext = {}) {
    this.baseLogger = baseLogger;
    this.context = context;
  }

  /**
   * コンテキスト付き子ロガーを作成
   */
  child(additionalContext: LogContext): StructuredLogger {
    const mergedContext = { ...this.context, ...additionalContext };
    const childLogger = 'child' in this.baseLogger 
      ? this.baseLogger.child(mergedContext)
      : this.baseLogger;
    return new StructuredLogger(childLogger, mergedContext);
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
    
    if (level in this.baseLogger && typeof this.baseLogger[level] === 'function') {
      (this.baseLogger as any)[level](logData, `[ASTRONOMICAL] ${message}`);
    }
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
 * Express.js 用のリクエスト ID ミドルウェア用ヘルパー
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
  if ('level' in logger) {
    logger.level = level;
  }
}

/**
 * ログ出力の一時停止/再開（テスト用）
 */
export function muteLogger(): void {
  if ('level' in logger) {
    logger.level = 'silent';
  }
}

export function unmuteLogger(): void {
  const config = getLoggerConfig();
  if ('level' in logger) {
    logger.level = config.level;
  }
}