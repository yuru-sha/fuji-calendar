import { Express, Request, Response } from 'express';
import path from 'path';
import { getComponentLogger } from '@fuji-calendar/utils';
import LocationController from '../controllers/LocationController';
import EventController from '../controllers/EventController';
import AuthController from '../controllers/AuthController';
import { authenticateAdmin, authRateLimit, adminApiRateLimit } from '../middleware/auth';

const serverLogger = getComponentLogger('server');

export function setupRoutes(app: Express): void {
  // コントローラーのインスタンス化
  const locationController = new LocationController();
  const eventController = new EventController();
  const authController = new AuthController();

  // ヘルスチェック
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.2.0'
    });
  });

  // 撮影地点 API
  app.get('/api/locations', locationController.getLocations.bind(locationController));
  app.get('/api/locations/:id', locationController.getLocation.bind(locationController));
  app.post('/api/locations', locationController.createLocation.bind(locationController));
  app.put('/api/locations/:id', locationController.updateLocation.bind(locationController));
  app.delete('/api/locations/:id', locationController.deleteLocation.bind(locationController));

  // イベント API
  app.get('/api/calendar/:year/:month', eventController.getMonthlyCalendar.bind(eventController));
  app.get('/api/events/:date', eventController.getDayEvents.bind(eventController));
  app.get('/api/events/upcoming', eventController.getUpcomingEvents.bind(eventController));
  app.get('/api/calendar/location/:locationId/:year', eventController.getLocationYearlyEvents.bind(eventController));
  app.get('/api/calendar/stats/:year', eventController.getCalendarStats.bind(eventController));

  // 認証 API
  app.post('/api/auth/login', authRateLimit, authController.login.bind(authController));
  app.post('/api/auth/logout', authRateLimit, authController.logout.bind(authController));
  app.get('/api/auth/verify', authRateLimit, authController.verifyToken.bind(authController));
  app.post('/api/auth/change-password', authRateLimit, authenticateAdmin, authController.changePassword.bind(authController));
  
  // 初期セットアップ用（本番環境では無効化推奨）
  if (process.env.NODE_ENV === 'development') {
    // app.post('/api/auth/create-admin', authController.createAdmin.bind(authController)); // TODO: createAdmin メソッドを実装
  }

  // 管理者用 API（認証必須）
  app.post('/api/admin/locations', adminApiRateLimit, authenticateAdmin, locationController.createLocation.bind(locationController));
  app.put('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, locationController.updateLocation.bind(locationController));
  app.delete('/api/admin/locations/:id', adminApiRateLimit, authenticateAdmin, locationController.deleteLocation.bind(locationController));
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