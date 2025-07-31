import { Express, Request, Response } from 'express';
import path from 'path';
import { getComponentLogger } from '@fuji-calendar/utils';
import LocationController from '../controllers/LocationControllerRefactored';
import AuthController from '../controllers/AuthController';
import { authenticateAdmin, authRateLimit, adminApiRateLimit } from '../middleware/auth';
import { DIContainer } from '../di/DIContainer';

const serverLogger = getComponentLogger('server');

export function setupRoutes(app: Express, container: DIContainer): void {

  // コントローラーのインスタンス化
  const locationController = container.resolve('LocationController') as LocationController;
  const calendarController = container.resolve('CalendarController') as any;
  const authController = new AuthController();

  // ヘルスチェック
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.2.0'
    });
  });
  
  // キュー統計情報
  app.get('/api/queue/stats', async (req: Request, res: Response) => {
    try {
      const queueService = container.resolve('QueueService') as any;
      const stats = await queueService.getQueueStats();
      res.json(stats);
    } catch (error) {
      serverLogger.error('キュー統計取得エラー', error);
      res.status(500).json({ error: 'Failed to get queue stats' });
    }
  });

  // 撮影地点 API
  app.get('/api/locations', locationController.getLocations.bind(locationController));
  app.get('/api/locations/:id', locationController.getLocation.bind(locationController));
  app.post('/api/locations', locationController.createLocation.bind(locationController));
  app.put('/api/locations/:id', locationController.updateLocation.bind(locationController));
  app.delete('/api/locations/:id', locationController.deleteLocation.bind(locationController));

  // イベント API
  app.get('/api/calendar/:year/:month', calendarController.getMonthlyCalendar.bind(calendarController));
  app.get('/api/events/:date', calendarController.getDayEvents.bind(calendarController));
  app.get('/api/events/upcoming', calendarController.getUpcomingEvents.bind(calendarController));
  app.get('/api/calendar/location/:locationId/:year', calendarController.getLocationYearlyEvents.bind(calendarController));
  app.get('/api/calendar/stats/:year', calendarController.getCalendarStats.bind(calendarController));

  // 認証 API
  app.post('/api/auth/login', authRateLimit, authController.login.bind(authController));
  app.post('/api/auth/logout', authRateLimit, authController.logout.bind(authController));
  app.get('/api/auth/verify', authRateLimit, authController.verifyToken.bind(authController));
  app.post('/api/auth/change-password', authRateLimit, authenticateAdmin, authController.changePassword.bind(authController));

  // 管理者向け一括再計算（既存の locations データを元に全イベントを再検出）
  app.post('/api/admin/regenerate-all', authenticateAdmin, adminApiRateLimit, async (req: Request, res: Response) => {
    try {
      const eventCacheService = container.resolve('EventCacheService') as any;
      const { years } = req.body;
      
      // デフォルトで 2024-2026 年を対象
      const targetYears = years || [2024, 2025, 2026];
      
      serverLogger.info('既存地点データを元に一括再計算開始', { 
        targetYears,
        requestedBy: (req as any).admin?.username 
      });
      
      let totalEvents = 0;
      const results = [];
      
      for (const year of targetYears) {
        serverLogger.info(`${year}年の再計算開始`);
        const result = await eventCacheService.generateYearlyCache(year);
        results.push({
          year,
          success: result.success,
          totalEvents: result.totalEvents,
          timeMs: result.timeMs,
          error: result.error?.message
        });
        
        if (result.success) {
          totalEvents += result.totalEvents;
          serverLogger.info(`${year}年完了: ${result.totalEvents}件`);
        } else {
          serverLogger.error(`${year}年失敗`, result.error);
        }
      }
      
      serverLogger.info('一括再計算完了', { 
        targetYears,
        totalEvents,
        results
      });
      
      res.json({
        success: true,
        message: `既存の全地点データを元に一括再計算が完了しました (${totalEvents.toLocaleString()}件)`,
        totalEvents,
        results
      });
      
    } catch (error) {
      serverLogger.error('一括再計算エラー', error);
      res.status(500).json({
        error: '一括再計算中にエラーが発生しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // 初期セットアップ用（本番環境では無効化推奨）
  if (process.env.NODE_ENV === 'development') {
    // app.post('/api/auth/create-admin', authController.createAdmin.bind(authController)); // TODO: createAdmin メソッドを実装
  }

  // 管理者用 API（認証必須）
  app.post('/api/admin/locations', adminApiRateLimit, authenticateAdmin, locationController.createLocation.bind(locationController));
  app.put('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, locationController.updateLocation.bind(locationController));
  app.delete('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, locationController.deleteLocation.bind(locationController));
  // Export/Import 機能
  app.get('/api/admin/locations/export', adminApiRateLimit, authenticateAdmin, locationController.exportLocations.bind(locationController));
  app.post('/api/admin/locations/import', adminApiRateLimit, authenticateAdmin, locationController.importLocations.bind(locationController));

  app.get('/api/calendar/:year/:month', (req: Request, res: Response) => {
    const { year, month } = req.params;
    const events = [
      {
        date: `${year}-${month.padStart(2, '0')}-15`,
        type: 'diamond',
        events: [
          {
            id: '1',
            type: 'diamond',
            subType: 'sunrise',
            time: `${year}-${month.padStart(2, '0')}-15T06:30:00+09:00`,
            location: {
              id: 1,
              name: 'サンプル地点',
              prefecture: '静岡県',
              latitude: 35.3606,
              longitude: 138.7274,
              elevation: 1000
            },
            azimuth: 120,
            elevation: 15
          }
        ]
      }
    ];
    
    res.json({
      year: parseInt(year),
      month: parseInt(month),
      events
    });
  });

  app.get('/api/events/:date', (req: Request, res: Response) => {
    const { date } = req.params;
    const events = [
      {
        id: '1',
        type: 'diamond',
        subType: 'sunrise',
        time: `${date}T06:30:00+09:00`,
        location: {
          id: 1,
          name: 'サンプル地点',
          prefecture: '静岡県',
          latitude: 35.3606,
          longitude: 138.7274,
          elevation: 1000,
          fujiDistance: 50000
        },
        azimuth: 120,
        elevation: 15
      }
    ];
    
    res.json({ events });
  });

  // SPA 用のフォールバック（本番環境）
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(__dirname, '../../../apps/client/dist/index.html');
      res.sendFile(indexPath);
    });
  }

  // 404 ハンドリング
  app.use((req: Request, res: Response) => {
    serverLogger.warn('404 - ページが見つかりません', {
      url: req.url,
      method: req.method
    });
    res.status(404).json({ error: 'Not Found' });
  });
}