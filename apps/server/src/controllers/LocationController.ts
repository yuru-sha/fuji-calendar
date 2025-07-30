import { Request, Response } from 'express';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '@fuji-calendar/utils';
import { Location } from '@fuji-calendar/types';

const logger = getComponentLogger('LocationController');

export class LocationController {
  private prisma = PrismaClientManager.getInstance();

  /**
   * 全ての撮影地点を取得
   */
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.prisma.location.findMany({
        orderBy: {
          id: 'asc'
        }
      });

      logger.info('撮影地点一覧取得成功', {
        locationCount: locations.length
      });

      res.json({
        success: true,
        locations: locations.map(this.formatLocation),
        count: locations.length
      });
    } catch (error) {
      logger.error('撮影地点一覧取得エラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点の取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 特定の撮影地点を取得
   */
  async getLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: '有効な ID を指定してください。'
        });
        return;
      }

      const location = await this.prisma.location.findUnique({
        where: { id },
        include: {
          events: {
            where: {
              eventDate: {
                gte: new Date()
              }
            },
            orderBy: {
              eventDate: 'asc'
            },
            take: 10
          }
        }
      });

      if (!location) {
        res.status(404).json({
          success: false,
          error: 'Location not found',
          message: '指定された撮影地点が見つかりません。'
        });
        return;
      }

      logger.info('撮影地点詳細取得成功', {
        locationId: id,
        locationName: location.name,
        upcomingEvents: location.events.length
      });

      res.json({
        success: true,
        location: this.formatLocation(location),
        upcomingEvents: location.events.length
      });
    } catch (error) {
      logger.error('撮影地点詳細取得エラー', error, {
        locationId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点の取得中にエラーが発生しました。'
      });
    }
  }

  /**
   * 新しい撮影地点を作成
   */
  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        prefecture,
        latitude,
        longitude,
        elevation,
        description,
        accessInfo,
        parkingInfo
      } = req.body;

      // バリデーション
      if (!name || !prefecture || latitude === undefined || longitude === undefined || elevation === undefined) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: '必須フィールドが不足しています。'
        });
        return;
      }

      // 富士山からの距離と方位角を計算（簡易版）
      const fujiLat = 35.3606;
      const fujiLng = 138.7274;
      const distance = this.calculateDistance(latitude, longitude, fujiLat, fujiLng);
      const azimuth = this.calculateAzimuth(latitude, longitude, fujiLat, fujiLng);

      const location = await this.prisma.location.create({
        data: {
          name,
          prefecture,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          elevation: parseFloat(elevation),
          description,
          accessInfo,
          parkingInfo,
          fujiDistance: distance,
          fujiAzimuth: azimuth
        }
      });

      logger.info('撮影地点作成成功', {
        locationId: location.id,
        locationName: location.name,
        prefecture: location.prefecture
      });

      res.status(201).json({
        success: true,
        location: this.formatLocation(location),
        message: '撮影地点が正常に作成されました。'
      });
    } catch (error) {
      logger.error('撮影地点作成エラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点の作成中にエラーが発生しました。'
      });
    }
  }

  /**
   * 撮影地点を更新
   */
  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: '有効な ID を指定してください。'
        });
        return;
      }

      const {
        name,
        prefecture,
        latitude,
        longitude,
        elevation,
        description,
        accessInfo,
        parkingInfo
      } = req.body;

      // 富士山からの距離と方位角を再計算
      let updateData: any = {
        name,
        prefecture,
        description,
        accessInfo,
        parkingInfo
      };

      if (latitude !== undefined && longitude !== undefined) {
        const fujiLat = 35.3606;
        const fujiLng = 138.7274;
        updateData.latitude = parseFloat(latitude);
        updateData.longitude = parseFloat(longitude);
        updateData.fujiDistance = this.calculateDistance(latitude, longitude, fujiLat, fujiLng);
        updateData.fujiAzimuth = this.calculateAzimuth(latitude, longitude, fujiLat, fujiLng);
      }

      if (elevation !== undefined) {
        updateData.elevation = parseFloat(elevation);
      }

      const location = await this.prisma.location.update({
        where: { id },
        data: updateData
      });

      logger.info('撮影地点更新成功', {
        locationId: id,
        locationName: location.name
      });

      res.json({
        success: true,
        location: this.formatLocation(location),
        message: '撮影地点が正常に更新されました。'
      });
    } catch (error) {
      logger.error('撮影地点更新エラー', error, {
        locationId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点の更新中にエラーが発生しました。'
      });
    }
  }



  /**
   * 撮影地点を削除
   */
  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid ID',
          message: '有効な ID を指定してください。'
        });
        return;
      }

      await this.prisma.location.delete({
        where: { id }
      });

      logger.info('撮影地点削除成功', {
        locationId: id
      });

      res.json({
        success: true,
        message: '撮影地点が正常に削除されました。'
      });
    } catch (error) {
      logger.error('撮影地点削除エラー', error, {
        locationId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点の削除中にエラーが発生しました。'
      });
    }
  }

  /**
   * 撮影地点データをJSON形式でエクスポート
   */
  async exportLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.prisma.location.findMany({
        orderBy: {
          id: 'asc'
        }
      });

      logger.info('撮影地点エクスポート成功', {
        locationCount: locations.length
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="locations_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(locations.map(this.formatLocation));
    } catch (error) {
      logger.error('撮影地点エクスポートエラー', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '撮影地点のエクスポート中にエラーが発生しました。'
      });
    }
  }

  /**
   * JSON形式の撮影地点データをインポート（重複データはスキップ）
   */
  async importLocations(req: Request, res: Response): Promise<void> {
    try {
      logger.info('撮影地点インポート開始', {
        bodyType: typeof req.body,
        isArray: Array.isArray(req.body),
        bodyLength: Array.isArray(req.body) ? req.body.length : 'N/A',
        firstItem: Array.isArray(req.body) && req.body.length > 0 ? req.body[0] : 'N/A'
      });

      const locations = req.body;

      if (!Array.isArray(locations)) {
        logger.warn('無効なデータ形式', {
          bodyType: typeof req.body,
          body: req.body
        });
        res.status(400).json({
          success: false,
          error: 'Invalid data format',
          message: '配列形式のJSONが必要です。'
        });
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // 既存の地点を取得（重複チェック用）
      const existingLocations = await this.prisma.location.findMany({
        select: {
          name: true,
          prefecture: true,
          latitude: true,
          longitude: true
        }
      });

      for (const locationData of locations) {
        try {
          // 必須フィールドのバリデーション
          if (!locationData.name || !locationData.prefecture || 
              locationData.latitude === undefined || locationData.longitude === undefined || 
              locationData.elevation === undefined) {
            errors.push(`地点「${locationData.name || '名前なし'}」: 必須フィールドが不足しています`);
            errorCount++;
            continue;
          }

          // 重複チェック（名前+都道府県、または座標の近似値で判定）
          const isDuplicate = existingLocations.some(existing => {
            const nameMatch = existing.name === locationData.name && existing.prefecture === locationData.prefecture;
            const coordMatch = Math.abs(existing.latitude - locationData.latitude) < 0.0001 && 
                              Math.abs(existing.longitude - locationData.longitude) < 0.0001;
            return nameMatch || coordMatch;
          });

          if (isDuplicate) {
            skippedCount++;
            continue;
          }

          // 富士山からの距離と方位角を計算
          const fujiLat = 35.3606;
          const fujiLng = 138.7274;
          const distance = this.calculateDistance(locationData.latitude, locationData.longitude, fujiLat, fujiLng);
          const azimuth = this.calculateAzimuth(locationData.latitude, locationData.longitude, fujiLat, fujiLng);

          // 新しい地点を作成
          const newLocation = await this.prisma.location.create({
            data: {
              name: locationData.name,
              prefecture: locationData.prefecture,
              latitude: parseFloat(locationData.latitude),
              longitude: parseFloat(locationData.longitude),
              elevation: parseFloat(locationData.elevation),
              description: locationData.description || null,
              accessInfo: locationData.accessInfo || null,
              parkingInfo: locationData.parkingInfo || null,
              fujiDistance: distance,
              fujiAzimuth: azimuth
            }
          });

          // 既存リストに追加（後続の重複チェック用）
          existingLocations.push({
            name: newLocation.name,
            prefecture: newLocation.prefecture,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });

          importedCount++;
        } catch (error) {
          errors.push(`地点「${locationData.name || '名前なし'}」: ${error instanceof Error ? error.message : '不明なエラー'}`);
          errorCount++;
        }
      }

      logger.info('撮影地点インポート完了', {
        totalCount: locations.length,
        importedCount,
        skippedCount,
        errorCount
      });

      res.json({
        success: true,
        message: 'インポートが完了しました。',
        summary: {
          totalCount: locations.length,
          importedCount,
          skippedCount,
          errorCount
        },
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      logger.error('撮影地点インポートエラー', error, {
        requestBody: req.body,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: `撮影地点のインポート中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  /**
   * Prisma の Location を API の Location 型に変換
   */
  private formatLocation(location: any): Location {
    return {
      id: location.id,
      name: location.name,
      prefecture: location.prefecture,
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
      description: location.description,
      accessInfo: location.accessInfo,
      parkingInfo: location.parkingInfo,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation,
      fujiDistance: location.fujiDistance,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    };
  }

  /**
   * 2 点間の距離を計算（メートル単位）
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球の半径（メートル）
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 方位角を計算（度単位）
   */
  private calculateAzimuth(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = this.toRadians(lng2 - lng1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let azimuth = Math.atan2(y, x);
    azimuth = this.toDegrees(azimuth);
    return (azimuth + 360) % 360;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}

export default LocationController;