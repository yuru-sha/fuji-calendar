import express from 'express';
import cors from 'cors';
import path from 'path';

// import { initializeDatabase } from './database/connection'; // SQLite削除により不要
// import { initializeUnifiedDatabase } from './database/connection-unified'; // 一時的に無効化
import { securityHeaders, apiRateLimit, adminApiRateLimit, authRateLimit, sanitizeInput, detectSQLInjection } from './middleware/security';
import { authenticateAdmin } from './middleware/auth';
import { 
  requestIdMiddleware, 
  httpLoggerMiddleware, 
  performanceMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  astronomicalLoggingMiddleware,
  setupFileLogging
} from './middleware/logging';
import { getComponentLogger } from '../shared/utils/logger';

import CalendarController from './controllers/CalendarController';
import AdminController from './controllers/AdminController';
import AuthController from './controllers/AuthController';
// import HistoricalController from './controllers/HistoricalController'; // 一時的に無効化
import PrismaAdminController from './controllers/PrismaAdminController';

// import { LocationModel } from './models/Location'; // 一時的に無効化
// import BackgroundJobScheduler from './services/BackgroundJobScheduler'; // 一時的に無効化
import BackgroundJobSchedulerPrisma from './services/BackgroundJobSchedulerPrisma';
// import { queueService } from './services/QueueService'; // 一時的に無効化
import { calendarServicePrisma } from './services/CalendarServicePrisma';
// import { queueService } from './services/QueueService'; // 一時的に無効化

const app = express();
const PORT = process.env.PORT || 3000;

setupFileLogging();
const serverLogger = getComponentLogger('server');
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);
app.use(performanceMiddleware);
app.use(securityLoggingMiddleware);
app.use(astronomicalLoggingMiddleware);

// セキュリティミドルウェア
app.use(securityHeaders);

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : true, // 開発環境では同一ポートなのでtrue
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

// 静的ファイル配信（開発・本番共通）
app.use(express.static(path.join(__dirname, '../../dist/client')));

// コントローラーのインスタンス化
const calendarController = new CalendarController();
const adminController = new AdminController();
const authController = new AuthController();
// const historicalController = new HistoricalController(); // 一時的に無効化
const prismaAdminController = new PrismaAdminController();
// const locationModel = new LocationModel(); // 一時的に無効化

// バックグラウンドジョブスケジューラー
// const backgroundScheduler = new BackgroundJobScheduler(); // 一時的に無効化
const backgroundSchedulerPrisma = new BackgroundJobSchedulerPrisma();

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API ルート
app.get('/api/calendar/:year/:month', calendarController.getMonthlyCalendar.bind(calendarController));
app.get('/api/events/upcoming', calendarController.getUpcomingEvents.bind(calendarController));
app.get('/api/events/:date', calendarController.getDayEvents.bind(calendarController));
app.get('/api/calendar/:year/:month/best', calendarController.getBestShotDays.bind(calendarController));
app.post('/api/calendar/suggest', calendarController.getSuggestedPlan.bind(calendarController));
app.get('/api/calendar/location/:locationId/:year', calendarController.getLocationYearlyEvents.bind(calendarController));
app.get('/api/calendar/stats/:year', calendarController.getCalendarStats.bind(calendarController));

// 認証API（専用レート制限適用）
app.post('/api/admin/login', authRateLimit, authController.login.bind(authController));
app.post('/api/admin/logout', authRateLimit, authController.logout.bind(authController));
app.get('/api/admin/verify', authRateLimit, authController.verifyToken.bind(authController));

// 過去データAPI（パブリック）- 一時的に無効化
/*
app.get('/api/historical/search', historicalController.searchEvents.bind(historicalController));
app.get('/api/historical/stats/yearly', historicalController.getYearlyStats.bind(historicalController));
app.get('/api/historical/monthly/:locationId', historicalController.getMonthlyHistory.bind(historicalController));
app.get('/api/historical/overview', historicalController.getDataOverview.bind(historicalController));

// 過去データ投稿API（認証不要、ただし将来的には認証を検討）
app.post('/api/historical/report-success', historicalController.reportPhotoSuccess.bind(historicalController));
*/

// 管理者用API（管理者レート制限 + 認証）
app.get('/api/admin/locations', adminApiRateLimit, authenticateAdmin, adminController.getLocations.bind(adminController));
app.post('/api/admin/locations', adminApiRateLimit, authenticateAdmin, adminController.createLocation.bind(adminController));
app.put('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, adminController.updateLocation.bind(adminController));
app.delete('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, adminController.deleteLocation.bind(adminController));
app.post('/api/admin/reverse-geocode', adminApiRateLimit, authenticateAdmin, adminController.reverseGeocode.bind(adminController));
app.put('/api/admin/password', adminApiRateLimit, authenticateAdmin, adminController.changePassword.bind(adminController));

// 管理者用過去データAPI - 一時的に無効化
// app.post('/api/admin/historical/add-observed', adminApiRateLimit, authenticateAdmin, historicalController.addObservedEvent.bind(historicalController));

// Prismaベース管理者API
app.get('/api/admin/prisma/health/:year?', adminApiRateLimit, authenticateAdmin, prismaAdminController.getSystemHealth.bind(prismaAdminController));
app.post('/api/admin/prisma/calculate/:year', adminApiRateLimit, authenticateAdmin, prismaAdminController.executeYearlyCalculation.bind(prismaAdminController));
app.post('/api/admin/prisma/calculate-location', adminApiRateLimit, authenticateAdmin, prismaAdminController.executeLocationCalculation.bind(prismaAdminController));
app.get('/api/admin/prisma/stats', adminApiRateLimit, authenticateAdmin, prismaAdminController.getSystemStats.bind(prismaAdminController));
app.get('/api/admin/prisma/stats/:year', adminApiRateLimit, authenticateAdmin, prismaAdminController.getYearStats.bind(prismaAdminController));
app.post('/api/admin/prisma/maintenance', adminApiRateLimit, authenticateAdmin, prismaAdminController.performMaintenance.bind(prismaAdminController));

// キャッシュ管理API（管理者用）- 一時的に無効化
/*
app.get('/api/admin/cache/stats', adminApiRateLimit, authenticateAdmin, async (req, res) => {
  try {
    const stats = await backgroundScheduler.batchService.getCacheStatistics();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('キャッシュ統計取得エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'キャッシュ統計の取得中にエラーが発生しました。'
    });
  }
});
*/

// 一時的に無効化
/*
app.post('/api/admin/cache/precompute', authenticateAdmin, async (req, res) => {
  try {
    const { monthsAhead = 2 } = req.body;
    await backgroundScheduler.triggerImmediatePrecomputation(monthsAhead);
    res.json({
      success: true,
      message: `${monthsAhead}ヶ月分の事前計算を開始しました`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('手動事前計算エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '事前計算の開始中にエラーが発生しました。'
    });
  }
});

app.get('/api/admin/background/status', authenticateAdmin, (req, res) => {
  const status = backgroundScheduler.getStatus();
  res.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
});
*/

// 年次メンテナンス手動実行 - 一時的に無効化
/*
app.post('/api/admin/background/yearly-maintenance', authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'preparation', 'verification', 'archive'
    
    if (!['preparation', 'verification', 'archive'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid maintenance type',
        message: '有効なメンテナンスタイプを指定してください。(preparation, verification, archive)'
      });
    }

    serverLogger.info('年次メンテナンス手動実行開始', {
      type,
      requestId: req.requestId
    });

    switch (type) {
      case 'preparation':
        await backgroundScheduler.performYearlyPreparation();
        break;
      case 'verification':
        await backgroundScheduler.performNewYearVerification();
        break;
      case 'archive':
        await backgroundScheduler.performYearlyArchive();
        break;
    }

    res.json({
      success: true,
      message: `年次${type}メンテナンスが完了しました。`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('年次メンテナンス手動実行エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '年次メンテナンスの実行中にエラーが発生しました。'
    });
  }
});

// 月次メンテナンス手動実行
app.post('/api/admin/background/monthly-maintenance', authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'preparation', 'verification'
    
    if (!['preparation', 'verification'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid maintenance type',
        message: '有効なメンテナンスタイプを指定してください。(preparation, verification)'
      });
    }

    serverLogger.info('月次メンテナンス手動実行開始', {
      type,
      requestId: req.requestId
    });

    switch (type) {
      case 'preparation':
        await backgroundScheduler.performMonthlyPreparation();
        break;
      case 'verification':
        await backgroundScheduler.performMonthlyVerification();
        break;
    }

    res.json({
      success: true,
      message: `月次${type}メンテナンスが完了しました。`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('月次メンテナンス手動実行エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '月次メンテナンスの実行中にエラーが発生しました。'
    });
  }
});
*/

// キューシステムの状態確認 - 一時的に無効化
/*
app.get('/api/admin/queue/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('キュー統計取得エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'キュー統計の取得中にエラーが発生しました。'
    });
  }
});
*/

// 特定ジョブの進捗確認 - 一時的に無効化
/*
app.get('/api/admin/queue/job/:jobId/:queueType', authenticateAdmin, async (req, res) => {
  try {
    const { jobId, queueType } = req.params;
    
    if (!['location', 'monthly', 'daily', 'historical'].includes(queueType)) {
      return res.status(400).json({
        error: 'Invalid queue type',
        message: 'キューの種類が正しくありません。'
      });
    }
    
    const progress = await queueService.getJobProgress(jobId, queueType as 'location' | 'monthly' | 'daily' | 'historical');
    
    if (!progress) {
      return res.status(404).json({
        error: 'Job not found',
        message: '指定されたジョブが見つかりません。'
      });
    }
    
    res.json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('ジョブ進捗取得エラー', error, {
      requestId: req.requestId,
      jobId: req.params.jobId,
      queueType: req.params.queueType
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'ジョブ進捗の取得中にエラーが発生しました。'
    });
  }
});
*/

// 手動でのバッチ計算起動 - 一時的に無効化
/*
app.post('/api/admin/queue/calculate', authenticateAdmin, async (req, res) => {
  try {
    const { locationId, year, month, day, priority = 'medium' } = req.body;
    
    if (!locationId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: '地点IDが必要です。'
      });
    }
    
    let jobId: string;
    
    if (day) {
      // 日別計算
      jobId = await queueService.scheduleDailyCalculation(
        parseInt(locationId),
        year || new Date().getFullYear(),
        month || new Date().getMonth() + 1,
        day,
        priority,
        req.requestId
      );
    } else if (month) {
      // 月間計算
      jobId = await queueService.scheduleMonthlyCalculation(
        parseInt(locationId),
        year || new Date().getFullYear(),
        month,
        priority,
        req.requestId
      );
    } else {
      // 地点全体計算
      const currentYear = new Date().getFullYear();
      jobId = await queueService.scheduleLocationCalculation(
        parseInt(locationId),
        year || currentYear,
        year || currentYear + 2,
        priority,
        req.requestId
      );
    }
    
    res.json({
      success: true,
      data: { jobId },
      message: '計算ジョブを開始しました。',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('手動計算起動エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '計算ジョブの起動中にエラーが発生しました。'
    });
  }
});
*/

// 過去データ計算起動 - 一時的に無効化
/*
app.post('/api/admin/queue/calculate-historical', authenticateAdmin, async (req, res) => {
  try {
    const { locationId, startYear, endYear, priority = 'low' } = req.body;
    
    if (!locationId || !startYear || !endYear) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '地点ID、開始年、終了年が必要です。'
      });
    }

    if (startYear > endYear) {
      return res.status(400).json({
        error: 'Invalid year range',
        message: '開始年は終了年以下である必要があります。'
      });
    }

    const currentYear = new Date().getFullYear();
    if (endYear > currentYear) {
      return res.status(400).json({
        error: 'Invalid end year',
        message: '終了年は現在年以下である必要があります。'
      });
    }

    const jobId = await queueService.scheduleHistoricalCalculation(
      parseInt(locationId),
      parseInt(startYear),
      parseInt(endYear),
      priority,
      req.requestId
    );

    serverLogger.info('過去データ計算ジョブ起動', {
      jobId,
      locationId: parseInt(locationId),
      startYear: parseInt(startYear),
      endYear: parseInt(endYear),
      yearSpan: parseInt(endYear) - parseInt(startYear) + 1,
      priority,
      requestId: req.requestId
    });

    res.json({
      success: true,
      data: { 
        jobId,
        yearSpan: parseInt(endYear) - parseInt(startYear) + 1
      },
      message: `${startYear}-${endYear}年の過去データ計算を開始しました。`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('過去データ計算起動エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '過去データ計算の起動中にエラーが発生しました。'
    });
  }
});
*/

// 撮影地点API（Prismaベース）
app.get('/api/locations', async (req, res) => {
  try {
    const { PrismaClientManager } = await import('./database/prisma');
    const prisma = PrismaClientManager.getInstance();
    const locations = await prisma.location.findMany();
    
    serverLogger.info('撮影地点一覧取得成功', {
      locationCount: locations.length,
      requestId: req.requestId
    });
    res.json({
      success: true,
      data: { locations },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('撮影地点一覧取得エラー', error, {
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '撮影地点の取得中にエラーが発生しました。'
    });
  }
});

app.get('/api/locations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: '有効なIDを指定してください。'
      });
    }

    const { PrismaClientManager } = await import('./database/prisma');
    const prisma = PrismaClientManager.getInstance();
    const location = await prisma.location.findUnique({
      where: { id }
    });
    
    if (!location) {
      return res.status(404).json({
        error: 'Location not found',
        message: '指定された撮影地点が見つかりません。'
      });
    }

    res.json({
      success: true,
      data: { location },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    serverLogger.error('撮影地点詳細取得エラー', error, {
      locationId: req.params.id,
      requestId: req.requestId
    });
    res.status(500).json({
      error: 'Internal server error',
      message: '撮影地点の取得中にエラーが発生しました。'
    });
  }
});

// フロントエンド配信（開発・本番共通）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

// エラーハンドリング
app.use(errorLoggingMiddleware);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  serverLogger.error('未処理エラー', err, {
    requestId: req.requestId,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404ハンドリング
app.use((req, res) => {
  serverLogger.warn('404 - ページが見つかりません', {
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  res.status(404).json({ error: 'Not Found' });
});

// データベース初期化とサーバー起動
async function startServer() {
  try {
    serverLogger.info('データベース初期化開始');
    
    // Prismaベースのデータベース接続テスト
    const { PrismaClientManager } = await import('./database/prisma');
    const isConnected = await PrismaClientManager.testConnection();
    if (!isConnected) {
      throw new Error('Prisma database connection failed');
    }
    serverLogger.info('Prisma データベース接続完了');
    
    // バックグラウンドスケジューラー開始（一時的に無効化）
    // backgroundScheduler.start(); // 一時的に無効化
    // backgroundSchedulerPrisma.start();
    serverLogger.info('バックグラウンドジョブスケジューラー一時無効化', {
      // prismaScheduler: backgroundSchedulerPrisma.getStatus()
    });
    
    app.listen(PORT, () => {
      serverLogger.info('サーバー起動完了', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        endpoint: `http://localhost:${PORT}/api`,
        logLevel: process.env.LOG_LEVEL || 'info',
        fileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        // backgroundJobs: backgroundSchedulerPrisma.getStatus()
      });
    });
  } catch (error) {
    serverLogger.fatal('サーバー起動失敗', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  serverLogger.info('SIGTERM受信 - グレースフルシャットダウン開始');
  backgroundSchedulerPrisma.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  serverLogger.info('SIGINT受信 - グレースフルシャットダウン開始');
  backgroundSchedulerPrisma.stop();
  process.exit(0);
});

startServer();