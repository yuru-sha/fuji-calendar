import { Express } from 'express';
import { adminApiRateLimit, authRateLimit } from '../middleware/security';
import { authenticateAdmin } from '../middleware/auth';
import { errorLoggingMiddleware } from '../middleware/logging';
import { getComponentLogger } from '../../shared/utils/logger';
import { Bootstrap } from '../bootstrap';

// Controllers
import CalendarController from '../controllers/CalendarController';
import AdminController from '../controllers/AdminController';
import AuthController from '../controllers/AuthController';
import PrismaAdminController from '../controllers/PrismaAdminController';

const serverLogger = getComponentLogger('server');

/**
 * ルートの設定
 */
export function setupRoutes(app: Express): void {
  // コントローラーのインスタンス化
  const calendarController = new CalendarController();
  const adminController = new AdminController();
  const authController = new AuthController();
  const prismaAdminController = new PrismaAdminController();

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

  // 認証 API（専用レート制限適用）
  app.post('/api/admin/login', authRateLimit, authController.login.bind(authController));
  app.post('/api/admin/logout', authRateLimit, authController.logout.bind(authController));
  app.get('/api/admin/verify', authRateLimit, authController.verifyToken.bind(authController));

  // 管理者用 API（管理者レート制限 + 認証）
  app.get('/api/admin/locations', adminApiRateLimit, authenticateAdmin, adminController.getLocations.bind(adminController));
  app.post('/api/admin/locations', adminApiRateLimit, authenticateAdmin, adminController.createLocation.bind(adminController));
  app.post('/api/admin/locations/import', adminApiRateLimit, authenticateAdmin, adminController.importLocations.bind(adminController));
  app.put('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, adminController.updateLocation.bind(adminController));
  app.delete('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, adminController.deleteLocation.bind(adminController));
  app.post('/api/admin/reverse-geocode', adminApiRateLimit, authenticateAdmin, adminController.reverseGeocode.bind(adminController));
  app.put('/api/admin/password', adminApiRateLimit, authenticateAdmin, adminController.changePassword.bind(adminController));

  // Prisma ベース管理者 API
  app.get('/api/admin/prisma/health/:year?', adminApiRateLimit, authenticateAdmin, prismaAdminController.getSystemHealth.bind(prismaAdminController));
  app.post('/api/admin/prisma/calculate/:year', adminApiRateLimit, authenticateAdmin, prismaAdminController.executeYearlyCalculation.bind(prismaAdminController));
  app.post('/api/admin/prisma/calculate-location', adminApiRateLimit, authenticateAdmin, prismaAdminController.executeLocationCalculation.bind(prismaAdminController));
  app.get('/api/admin/prisma/stats', adminApiRateLimit, authenticateAdmin, prismaAdminController.getSystemStats.bind(prismaAdminController));
  app.get('/api/admin/prisma/stats/:year', adminApiRateLimit, authenticateAdmin, prismaAdminController.getYearStats.bind(prismaAdminController));
  app.post('/api/admin/prisma/maintenance', adminApiRateLimit, authenticateAdmin, prismaAdminController.performMaintenance.bind(prismaAdminController));

  // 撮影地点 API（Prisma ベース）
  app.get('/api/locations', async (req, res) => {
    try {
      const { PrismaClientManager } = await import('../database/prisma');
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
          message: '有効な ID を指定してください。'
        });
      }

      const { PrismaClientManager } = await import('../database/prisma');
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
    res.sendFile(Bootstrap.getIndexHtmlPath());
  });

  // エラーハンドリング
  app.use(errorLoggingMiddleware);
  app.use((err: any, req: any, res: any, _next: any) => {
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

  // 404 ハンドリング
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
}