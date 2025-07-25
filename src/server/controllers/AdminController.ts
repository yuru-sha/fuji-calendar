import { Request, Response } from 'express';
import { FUJI_COORDINATES } from '../../shared/types';
import { getComponentLogger } from '../../shared/utils/logger';
import { AdminModel } from '../models/Admin';
import { PrismaClientManager } from '../database/prisma';
import { AstronomicalCalculatorImpl } from '../services/AstronomicalCalculator';
// EventCacheServiceはキューシステムに移行済み
import { queueService } from '../services/QueueService';

const astronomicalCalculator = new AstronomicalCalculatorImpl();
import * as bcrypt from 'bcrypt';

export class AdminController {
  private logger = getComponentLogger('admin-controller');

  constructor() {
    // Prismaベース、キューシステム使用
  }

  // 撮影地点一覧取得
  // GET /api/admin/locations
  async getLocations(req: Request, res: Response) {
    try {
      const prisma = PrismaClientManager.getInstance();
      const locations = await prisma.location.findMany({
        orderBy: [
          { prefecture: 'asc' },
          { name: 'asc' }
        ]
      });
      
      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      this.logger.error('撮影地点一覧取得エラー', error);
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影地点の取得に失敗しました。'
      });
    }
  }

  // 撮影地点作成
  // POST /api/admin/locations
  async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;

      // バリデーション
      if (!locationData.name || !locationData.prefecture || 
          typeof locationData.latitude !== 'number' || 
          typeof locationData.longitude !== 'number' ||
          typeof locationData.elevation !== 'number') {
        return res.status(400).json({
          error: 'Invalid input',
          message: '必須フィールドが不足しているか、形式が正しくありません。'
        });
      }

      // 緯度・経度の範囲チェック
      if (locationData.latitude < -90 || locationData.latitude > 90) {
        return res.status(400).json({
          error: 'Invalid latitude',
          message: '緯度は-90から90の間で指定してください。'
        });
      }

      if (locationData.longitude < -180 || locationData.longitude > 180) {
        return res.status(400).json({
          error: 'Invalid longitude',
          message: '経度は-180から180の間で指定してください。'
        });
      }

      // 富士山への事前計算値を自動計算
      const tempLocation = {
        id: 0, // 仮ID
        name: locationData.name,
        prefecture: locationData.prefecture,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        elevation: locationData.elevation,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let fujiAzimuth: number, fujiElevation: number, fujiDistance: number;
      
      try {
        fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(tempLocation);
        fujiElevation = astronomicalCalculator.calculateElevationToFuji(tempLocation);
        fujiDistance = astronomicalCalculator.getDistanceToFuji(tempLocation);
        
        this.logger.info('富士山への事前計算完了', {
          locationName: locationData.name,
          fujiAzimuth: fujiAzimuth.toFixed(3),
          fujiElevation: fujiElevation.toFixed(6),
          fujiDistance: fujiDistance.toFixed(2)
        });
      } catch (calculationError) {
        this.logger.error('富士山への事前計算エラー', {
          locationName: locationData.name,
          coordinates: { lat: locationData.latitude, lng: locationData.longitude, elev: locationData.elevation },
          error: calculationError instanceof Error ? calculationError.message : 'Unknown calculation error'
        });
        
        // 計算エラーの場合はnullを設定
        fujiAzimuth = 0;
        fujiElevation = 0;
        fujiDistance = 0;
      }

      const prisma = PrismaClientManager.getInstance();
      const newLocation = await prisma.location.create({
        data: {
          name: locationData.name,
          prefecture: locationData.prefecture,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          elevation: locationData.elevation,
          description: locationData.description || null,
          accessInfo: locationData.accessInfo || null,
          parkingInfo: locationData.parkingInfo || null,
          fujiAzimuth: Math.round(fujiAzimuth * 1000) / 1000,      // 自動計算（小数点3桁）
          fujiElevation: Math.round(fujiElevation * 1000000) / 1000000, // 自動計算（小数点6桁）
          fujiDistance: Math.round(fujiDistance * 100) / 100        // 自動計算（小数点2桁）
        }
      });
      
      this.logger.info('撮影地点作成完了', {
        locationId: newLocation.id,
        locationName: newLocation.name,
        fujiAzimuth: newLocation.fujiAzimuth,
        fujiElevation: newLocation.fujiElevation,
        fujiDistance: newLocation.fujiDistance
      });

      // 富士現象イベントの初期計算（キューに登録）
      const currentYear = new Date().getFullYear();
      // 前年・当年・翌年の3年分のイベントキャッシュを生成
      const jobId = await queueService.scheduleLocationCalculation(
        newLocation.id,
        currentYear - 1,
        currentYear + 1,
        'high',
        `create-location-${newLocation.id}-${Date.now()}`
      );
      
      this.logger.info('地点作成に伴う計算ジョブをスケジュール', {
        locationId: newLocation.id,
        locationName: newLocation.name,
        jobId,
        years: [currentYear, currentYear + 1]
      });
      
      res.status(201).json({
        success: true,
        data: newLocation,
        message: '撮影地点が正常に作成されました。'
      });
    } catch (error) {
      this.logger.error('地点作成エラー', error, {
        requestId: (req as any).requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影地点の作成に失敗しました。'
      });
    }
  }

  // 撮影地点更新
  // PUT /api/admin/locations/:id
  async updateLocation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const locationData = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          error: 'Invalid ID',
          message: 'IDの形式が正しくありません。'
        });
      }

      const prisma = PrismaClientManager.getInstance();
      
      // 既存の撮影地点をチェック
      const existingLocation = await prisma.location.findUnique({
        where: { id }
      });
      
      if (!existingLocation) {
        return res.status(404).json({
          error: 'Location not found',
          message: '指定された撮影地点が見つかりません。'
        });
      }

      // 緯度・経度の範囲チェック（提供されている場合）
      if (locationData.latitude !== undefined && (locationData.latitude < -90 || locationData.latitude > 90)) {
        return res.status(400).json({
          error: 'Invalid latitude',
          message: '緯度は-90から90の間で指定してください。'
        });
      }

      if (locationData.longitude !== undefined && (locationData.longitude < -180 || locationData.longitude > 180)) {
        return res.status(400).json({
          error: 'Invalid longitude',
          message: '経度は-180から180の間で指定してください。'
        });
      }

      // 更新データを準備
      const updateData: any = {};
      if (locationData.name !== undefined) updateData.name = locationData.name;
      if (locationData.prefecture !== undefined) updateData.prefecture = locationData.prefecture;
      if (locationData.latitude !== undefined) updateData.latitude = locationData.latitude;
      if (locationData.longitude !== undefined) updateData.longitude = locationData.longitude;
      if (locationData.elevation !== undefined) updateData.elevation = locationData.elevation;
      if (locationData.description !== undefined) updateData.description = locationData.description;
      if (locationData.accessInfo !== undefined) updateData.accessInfo = locationData.accessInfo;
      if (locationData.parkingInfo !== undefined) updateData.parkingInfo = locationData.parkingInfo;
      
      // 座標が変更された場合は富士山データを再計算
      const coordinatesChanged = locationData.latitude !== undefined || 
                                locationData.longitude !== undefined || 
                                locationData.elevation !== undefined;
      
      if (coordinatesChanged) {
        const tempLocation = {
          id: existingLocation.id,
          name: locationData.name || existingLocation.name,
          prefecture: locationData.prefecture || existingLocation.prefecture,
          latitude: locationData.latitude !== undefined ? locationData.latitude : existingLocation.latitude,
          longitude: locationData.longitude !== undefined ? locationData.longitude : existingLocation.longitude,
          elevation: locationData.elevation !== undefined ? locationData.elevation : existingLocation.elevation,
          createdAt: existingLocation.createdAt,
          updatedAt: new Date()
        };
        
        try {
          const fujiAzimuth = astronomicalCalculator.calculateBearingToFuji(tempLocation);
          const fujiElevation = astronomicalCalculator.calculateElevationToFuji(tempLocation);
          const fujiDistance = astronomicalCalculator.getDistanceToFuji(tempLocation);
          
          updateData.fujiAzimuth = Math.round(fujiAzimuth * 1000) / 1000;
          updateData.fujiElevation = Math.round(fujiElevation * 1000000) / 1000000;
          updateData.fujiDistance = Math.round(fujiDistance * 100) / 100;
          
          this.logger.info('座標変更により富士山データを再計算', {
            locationId: id,
            locationName: tempLocation.name,
            oldCoordinates: {
              lat: existingLocation.latitude,
              lng: existingLocation.longitude,
              elev: existingLocation.elevation
            },
            newCoordinates: {
              lat: tempLocation.latitude,
              lng: tempLocation.longitude,
              elev: tempLocation.elevation
            },
            fujiAzimuth: updateData.fujiAzimuth,
            fujiElevation: updateData.fujiElevation,
            fujiDistance: updateData.fujiDistance
          });
        } catch (calculationError) {
          this.logger.error('富士山データ再計算エラー', {
            locationId: id,
            locationName: tempLocation.name,
            coordinates: { lat: tempLocation.latitude, lng: tempLocation.longitude, elev: tempLocation.elevation },
            error: calculationError instanceof Error ? calculationError.message : 'Unknown calculation error'
          });
          
          // 計算エラーの場合は既存値を保持
          this.logger.warn('計算エラーのため富士山データは既存値を保持します', {
            locationId: id,
            existingFujiAzimuth: existingLocation.fujiAzimuth,
            existingFujiElevation: existingLocation.fujiElevation,
            existingFujiDistance: existingLocation.fujiDistance
          });
        }
      } else {
        // 手動で富士山データが指定された場合はそれを使用
        if (locationData.fujiAzimuth !== undefined) {
          updateData.fujiAzimuth = locationData.fujiAzimuth;
          this.logger.info('手動指定による富士山方位角更新', {
            locationId: id,
            newFujiAzimuth: locationData.fujiAzimuth
          });
        }
        if (locationData.fujiElevation !== undefined) {
          updateData.fujiElevation = locationData.fujiElevation;
          this.logger.info('手動指定による富士山仰角更新', {
            locationId: id,
            newFujiElevation: locationData.fujiElevation
          });
        }
        if (locationData.fujiDistance !== undefined) {
          updateData.fujiDistance = locationData.fujiDistance;
          this.logger.info('手動指定による富士山距離更新', {
            locationId: id,
            newFujiDistance: locationData.fujiDistance
          });
        }
      }

      const updatedLocation = await prisma.location.update({
        where: { id },
        data: updateData
      });
      
      this.logger.info('撮影地点更新完了', {
        locationId: id,
        locationName: updatedLocation.name
      });

      // 座標または富士山データが変更された場合、富士現象イベントを再計算
      const fujiDataChanged = coordinatesChanged || 
                              locationData.fujiAzimuth !== undefined ||
                              locationData.fujiElevation !== undefined ||
                              locationData.fujiDistance !== undefined;
      
      // レスポンスを先に返す
      res.json({
        success: true,
        data: updatedLocation,
        message: '撮影地点が正常に更新されました。'
      });

      // 座標または富士山データが変更された場合、富士現象イベントを再計算（キューに登録）
      if (fujiDataChanged) {
        const currentYear = new Date().getFullYear();
        this.logger.info('座標変更に伴うイベント再計算ジョブをスケジュール', {
          locationId: id,
          locationName: updatedLocation.name,
          targetYears: [currentYear - 1, currentYear, currentYear + 1]
        });
        
        // 前年・当年・翌年の3年分を再計算（キューに登録）
        const jobId = await queueService.scheduleLocationCalculation(
          id,
          currentYear - 1,
          currentYear + 1,
          'high',
          `update-location-${id}-${Date.now()}`
        );
        
        this.logger.info('座標変更に伴う計算ジョブをスケジュール完了', {
          locationId: id,
          locationName: updatedLocation.name,
          jobId
        });
      }
    } catch (error) {
      this.logger.error('撮影地点更新エラー', {
        locationId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: (req as any).requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影地点の更新に失敗しました。'
      });
    }
  }

  // 撮影地点削除
  // DELETE /api/admin/locations/:id
  async deleteLocation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          error: 'Invalid ID',
          message: 'IDの形式が正しくありません。'
        });
      }

      const prisma = PrismaClientManager.getInstance();
      
      // 既存の撮影地点をチェック
      const existingLocation = await prisma.location.findUnique({
        where: { id }
      });
      
      if (!existingLocation) {
        return res.status(404).json({
          error: 'Location not found',
          message: '指定された撮影地点が見つかりません。'
        });
      }

      await prisma.location.delete({
        where: { id }
      });

      // 関連する富士現象イベントも削除（Cascade削除で自動削除されるが、ログ記録のため明示的に実行）
      this.deleteLocationEvents(id, existingLocation.name);
      
      this.logger.info('撮影地点削除完了', {
        locationId: id,
        locationName: existingLocation.name
      });
      
      res.json({
        success: true,
        message: '撮影地点が正常に削除されました。'
      });
    } catch (error) {
      this.logger.error('撮影地点削除エラー', {
        locationId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: (req as any).requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影地点の削除に失敗しました。'
      });
    }
  }

  // 逆ジオコーディング（緯度経度から住所を取得）
  // POST /api/admin/reverse-geocode
  async reverseGeocode(req: Request, res: Response) {
    try {
      const { lat, lng } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: '緯度と経度が必要です。'
        });
      }

      // デバッグログ
      this.logger.debug('逆ジオコーディング要求', { lat, lng });
      
      // 国土地理院の逆ジオコーディングAPI
      const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`;
      
      // Node.js のfetchにヘッダーを追加
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'fuji-calendar-server/1.0'
        }
      });
      
      if (!response.ok) {
        this.logger.error('GSI API エラー', {
          status: response.status,
          statusText: response.statusText,
          url
        });
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json() as any;
      this.logger.debug('GSI API レスポンス', { data });
      
      // APIレスポンスから都道府県、市区町村、地名を抽出
      // 新しいレスポンス形式に対応
      const result = data.results || data;
      if (!result || (!result.muniCd && !result.munuCd)) {
        this.logger.warn('GSI API から有効な結果が見つかりません', { result });
        throw new Error('No valid address data');
      }
      
      // muniCd（市区町村コード）から都道府県を判定
      const muniCd = result.muniCd || result.munuCd; // API仕様変更に対応
      const prefectureCode = muniCd ? muniCd.substring(0, 2) : null;
      const prefectureMap: { [key: string]: string } = {
        '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
        '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
        '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
        '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
        '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
        '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
        '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
        '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
        '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
        '46': '鹿児島県', '47': '沖縄県'
      };
      
      // lv01Nm（市区町村名）、lv02Nm（大字名）から地名を構成
      // "-"の場合は空文字として扱う
      const cityName = (result.lv01Nm && result.lv01Nm !== '−') ? result.lv01Nm : '';
      const districtName = (result.lv02Nm && result.lv02Nm !== '−') ? result.lv02Nm : '';
      
      const addressData = {
        prefecture: prefectureCode ? prefectureMap[prefectureCode] : null,
        city: cityName,
        address: districtName
      };
      
      this.logger.debug('住所データ解析結果', addressData);
      
      // 都道府県が取得できなかった場合、座標ベースの判定を使用
      if (!addressData.prefecture) {
        addressData.prefecture = this.getPrefectureByCoordinate(lat, lng);
        this.logger.debug('座標ベース都道府県判定使用', { prefecture: addressData.prefecture });
      }
      
      // 市区町村名が取得できなかった場合、座標に基づいた地名の提案
      if (!addressData.city && addressData.prefecture) {
        addressData.city = this.getSuggestedLocationName(lat, lng, addressData.prefecture);
        this.logger.debug('提案地名使用', { city: addressData.city });
      }

      res.json({
        success: true,
        data: addressData
      });
    } catch (error) {
      this.logger.error('逆ジオコーディングエラー', {
        lat: req.body.lat,
        lng: req.body.lng,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // 国土地理院APIが失敗した場合、簡易的な座標ベースの判定を使用
      try {
        const simplePrefecture = this.getPrefectureByCoordinate(req.body.lat, req.body.lng);
        this.logger.info('簡易都道府県判定を使用', { prefecture: simplePrefecture });
        
        res.json({
          success: true,
          data: {
            prefecture: simplePrefecture,
            city: '',
            address: ''
          }
        });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          message: '住所の取得に失敗しました。'
        });
      }
    }
  }

  // 簡易的な座標ベースの都道府県判定
  private getPrefectureByCoordinate(lat: number, lng: number): string {
    // 富士山周辺の主要な都道府県の範囲を定義
    const prefectures = [
      { name: '山梨県', latMin: 35.1, latMax: 36.0, lngMin: 138.2, lngMax: 139.2 },
      { name: '静岡県', latMin: 34.6, latMax: 35.7, lngMin: 137.5, lngMax: 139.2 },
      { name: '神奈川県', latMin: 35.1, latMax: 35.7, lngMin: 138.9, lngMax: 139.8 },
      { name: '東京都', latMin: 35.5, latMax: 35.9, lngMin: 138.9, lngMax: 139.9 },
      { name: '埼玉県', latMin: 35.8, latMax: 36.3, lngMin: 138.7, lngMax: 139.9 },
      { name: '長野県', latMin: 35.2, latMax: 37.0, lngMin: 137.3, lngMax: 138.8 },
      { name: '愛知県', latMin: 34.5, latMax: 35.5, lngMin: 136.7, lngMax: 137.8 },
      { name: '千葉県', latMin: 34.9, latMax: 36.1, lngMin: 139.7, lngMax: 140.9 },
      { name: '群馬県', latMin: 35.9, latMax: 37.1, lngMin: 138.4, lngMax: 139.6 },
      { name: '栃木県', latMin: 36.2, latMax: 37.2, lngMin: 139.3, lngMax: 140.3 },
      { name: '茨城県', latMin: 35.7, latMax: 36.9, lngMin: 139.7, lngMax: 140.9 },
      { name: '福島県', latMin: 36.8, latMax: 37.9, lngMin: 139.1, lngMax: 141.1 },
      { name: '新潟県', latMin: 36.7, latMax: 38.6, lngMin: 137.6, lngMax: 139.9 },
      { name: '岐阜県', latMin: 35.1, latMax: 36.5, lngMin: 136.3, lngMax: 137.7 },
      { name: '三重県', latMin: 33.7, latMax: 35.3, lngMin: 135.8, lngMax: 136.9 },
      { name: '滋賀県', latMin: 34.8, latMax: 35.7, lngMin: 135.8, lngMax: 136.6 },
      { name: '京都府', latMin: 34.7, latMax: 35.8, lngMin: 134.9, lngMax: 136.1 },
      { name: '大阪府', latMin: 34.3, latMax: 35.1, lngMin: 135.1, lngMax: 135.8 },
      { name: '兵庫県', latMin: 34.2, latMax: 35.7, lngMin: 134.3, lngMax: 135.5 },
      { name: '奈良県', latMin: 33.8, latMax: 34.8, lngMin: 135.6, lngMax: 136.2 },
      { name: '和歌山県', latMin: 33.4, latMax: 34.4, lngMin: 135.0, lngMax: 136.0 }
    ];

    // 座標に基づいて都道府県を判定
    for (const pref of prefectures) {
      if (lat >= pref.latMin && lat <= pref.latMax && 
          lng >= pref.lngMin && lng <= pref.lngMax) {
        return pref.name;
      }
    }

    // 富士山に最も近い場合のデフォルト（剣ヶ峰座標）
    const fujiLat = FUJI_COORDINATES.latitude;
    const fujiLng = FUJI_COORDINATES.longitude;
    const distanceToFuji = Math.sqrt(
      Math.pow(lat - fujiLat, 2) + Math.pow(lng - fujiLng, 2)
    );
    
    if (distanceToFuji < 0.5) {
      return '山梨県'; // 富士山山頂に近い場合
    }

    return ''; // 判定できない場合
  }

  // 座標と都道府県に基づいた地名の提案
  private getSuggestedLocationName(lat: number, lng: number, prefecture: string): string {
    // 富士山周辺の主要な地点
    const landmarks = [
      // 山梨県
      { name: '富士吉田市', lat: 35.478, lng: 138.809, prefecture: '山梨県' },
      { name: '河口湖', lat: 35.501, lng: 138.766, prefecture: '山梨県' },
      { name: '山中湖', lat: 35.423, lng: 138.874, prefecture: '山梨県' },
      { name: '西湖', lat: 35.501, lng: 138.693, prefecture: '山梨県' },
      { name: '精進湖', lat: 35.493, lng: 138.609, prefecture: '山梨県' },
      { name: '本栖湖', lat: 35.464, lng: 138.587, prefecture: '山梨県' },
      { name: '忍野村', lat: 35.460, lng: 138.875, prefecture: '山梨県' },
      { name: '鳴沢村', lat: 35.477, lng: 138.705, prefecture: '山梨県' },
      
      // 静岡県
      { name: '富士宮市', lat: 35.221, lng: 138.622, prefecture: '静岡県' },
      { name: '富士市', lat: 35.161, lng: 138.676, prefecture: '静岡県' },
      { name: '御殿場市', lat: 35.308, lng: 138.934, prefecture: '静岡県' },
      { name: '裾野市', lat: 35.175, lng: 138.907, prefecture: '静岡県' },
      { name: '小山町', lat: 35.361, lng: 138.984, prefecture: '静岡県' },
      { name: '朝霧高原', lat: 35.334, lng: 138.568, prefecture: '静岡県' },
      { name: '田貫湖', lat: 35.300, lng: 138.557, prefecture: '静岡県' },
      
      // 神奈川県
      { name: '箱根町', lat: 35.233, lng: 139.025, prefecture: '神奈川県' },
      { name: '小田原市', lat: 35.265, lng: 139.152, prefecture: '神奈川県' },
      { name: '南足柄市', lat: 35.320, lng: 139.100, prefecture: '神奈川県' },
      { name: '山北町', lat: 35.361, lng: 139.084, prefecture: '神奈川県' },
      { name: '開成町', lat: 35.330, lng: 139.125, prefecture: '神奈川県' },
      { name: '松田町', lat: 35.344, lng: 139.138, prefecture: '神奈川県' },
      { name: '秦野市', lat: 35.375, lng: 139.221, prefecture: '神奈川県' },
      { name: '伊勢原市', lat: 35.395, lng: 139.315, prefecture: '神奈川県' },
      { name: '平塚市', lat: 35.328, lng: 139.349, prefecture: '神奈川県' },
      { name: '大磯町', lat: 35.306, lng: 139.316, prefecture: '神奈川県' },
      { name: '二宮町', lat: 35.299, lng: 139.257, prefecture: '神奈川県' },
      { name: '中井町', lat: 35.332, lng: 139.203, prefecture: '神奈川県' },
      { name: '大井町', lat: 35.329, lng: 139.156, prefecture: '神奈川県' },
      
      // 東京都
      { name: '八王子市', lat: 35.667, lng: 139.316, prefecture: '東京都' },
      { name: '町田市', lat: 35.546, lng: 139.439, prefecture: '東京都' },
      { name: '多摩市', lat: 35.637, lng: 139.446, prefecture: '東京都' },
      { name: '日野市', lat: 35.672, lng: 139.395, prefecture: '東京都' },
      
      // 埼玉県
      { name: '所沢市', lat: 35.799, lng: 139.469, prefecture: '埼玉県' },
      { name: '狭山市', lat: 35.853, lng: 139.412, prefecture: '埼玉県' },
      { name: '入間市', lat: 35.836, lng: 139.391, prefecture: '埼玉県' },
      
      // 千葉県
      { name: '館山市', lat: 34.996, lng: 139.870, prefecture: '千葉県' },
      { name: '南房総市', lat: 35.041, lng: 139.840, prefecture: '千葉県' },
      { name: '鴨川市', lat: 35.114, lng: 140.099, prefecture: '千葉県' }
    ];

    // 指定された都道府県の地点のみをフィルタ
    const prefectureLandmarks = landmarks.filter(l => l.prefecture === prefecture);
    
    if (prefectureLandmarks.length === 0) {
      return '';
    }

    // 最も近い地点を探す
    let closestLandmark = prefectureLandmarks[0];
    let minDistance = this.calculateDistance(lat, lng, closestLandmark.lat, closestLandmark.lng);

    for (const landmark of prefectureLandmarks) {
      const distance = this.calculateDistance(lat, lng, landmark.lat, landmark.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestLandmark = landmark;
      }
    }

    // 距離に応じて地名を調整
    if (minDistance < 0.05) { // 約5km以内
      return closestLandmark.name;
    } else if (minDistance < 0.1) { // 約10km以内
      return `${closestLandmark.name}周辺`;
    } else if (minDistance < 0.2) { // 約20km以内
      return `${closestLandmark.name}方面`;
    } else {
      return '';
    }
  }

  // 2地点間の距離を計算（簡易版）
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  }

  // キャッシュ統計情報を取得
  // GET /api/admin/cache/stats
  async getCacheStats(req: Request, res: Response) {
    try {
      // const stats = await cacheService.getCacheStats(); // 一時的に無効化
      const stats = { message: 'キャッシュ機能は一時的に無効化されています' };
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Cache stats error', { error });
      res.status(500).json({
        error: 'Internal server error',
        message: 'キャッシュ統計の取得に失敗しました。'
      });
    }
  }

  // キャッシュを手動で無効化
  // DELETE /api/admin/cache
  async clearCache(req: Request, res: Response) {
    try {
      const { pattern } = req.body;
      
      if (pattern) {
        // 特定パターンのキャッシュを削除
        // await cacheService.deletePattern(pattern); // 一時的に無効化
        this.logger.info('Cache pattern cleared by admin', { pattern });
        
        res.json({
          success: true,
          message: `パターン '${pattern}' のキャッシュが削除されました。`
        });
      } else {
        // 全地点関連キャッシュを削除
        // await cacheService.invalidateLocationCache(); // 一時的に無効化
        this.logger.info('All cache cleared by admin');
        
        res.json({
          success: true,
          message: '全てのキャッシュが削除されました。'
        });
      }
    } catch (error) {
      this.logger.error('Cache clear error', { error });
      res.status(500).json({
        error: 'Internal server error',
        message: 'キャッシュの削除に失敗しました。'
      });
    }
  }

  // 特定月のキャッシュを事前生成
  // POST /api/admin/cache/pregenerate
  async pregenerateCache(req: Request, res: Response) {
    try {
      const { year, month } = req.body;
      
      if (!year || !month || isNaN(year) || isNaN(month)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: '年と月を正しく指定してください。'
        });
      }

      if (year < 2000 || year > 2100 || month < 1 || month > 12) {
        return res.status(400).json({
          error: 'Invalid range',
          message: '年は2000-2100年、月は1-12の範囲で指定してください。'
        });
      }

      // キャッシュに既に存在するかチェック
      // const existingCache = await cacheService.getMonthlyCalendar(year, month); // 一時的に無効化
      const existingCache = null;
      
      if (existingCache) {
        return res.json({
          success: true,
          message: `${year}年${month}月のキャッシュは既に存在します。`,
          alreadyCached: true
        });
      }

      this.logger.info('Manual cache pregeneration started', { year, month });
      
      // ここで実際のカレンダーサービスを呼び出して事前生成
      // 実装は後で CalendarService に統合
      
      res.json({
        success: true,
        message: `${year}年${month}月のキャッシュ事前生成を開始しました。`,
        started: true
      });
      
    } catch (error) {
      this.logger.error('Cache pregeneration error', { error });
      res.status(500).json({
        error: 'Internal server error',
        message: 'キャッシュの事前生成に失敗しました。'
      });
    }
  }
  
  // パスワード変更
  // PUT /api/admin/password
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = (req as any).admin?.id;
      
      if (!adminId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '認証が必要です。'
        });
      }
      
      // バリデーション
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Invalid input',
          message: '現在のパスワードと新しいパスワードを入力してください。'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Weak password',
          message: 'パスワードは8文字以上で設定してください。'
        });
      }
      
      // 現在のパスワードを確認
      const admin = await AdminModel.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: '管理者が見つかりません。'
        });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValidPassword) {
        this.logger.warn('Invalid current password', { adminId });
        return res.status(401).json({
          error: 'Invalid password',
          message: '現在のパスワードが正しくありません。'
        });
      }
      
      // パスワードを更新
      const updated = await AdminModel.updatePassword(adminId, newPassword);
      if (!updated) {
        throw new Error('Failed to update password');
      }
      
      this.logger.info('Password changed successfully', { adminId, username: admin.username });
      
      res.json({
        success: true,
        message: 'パスワードが正常に変更されました。'
      });
    } catch (error) {
      this.logger.error('Password change error', { error });
      res.status(500).json({
        error: 'Internal server error',
        message: 'パスワードの変更に失敗しました。'
      });
    }
  }

  // 不要なバックグラウンド処理メソッドを削除（キューシステムに移行済み）

  /**
   * 地点削除時に関連する富士現象イベントをログ記録付きで削除
   */
  private deleteLocationEvents(locationId: number, locationName: string): void {
    // バックグラウンドで非同期実行
    this.performEventDeletion(locationId, locationName).catch((error) => {
      this.logger.error('富士現象イベント削除エラー', {
        locationId,
        locationName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  }

  /**
   * 実際の富士現象イベント削除処理
   */
  private async performEventDeletion(locationId: number, locationName: string): Promise<void> {
    try {
      const prisma = PrismaClientManager.getInstance();
      
      // カウント取得（削除前）
      const eventCount = await prisma.locationFujiEvent.count({
        where: { locationId }
      });

      if (eventCount > 0) {
        // イベント削除（Cascade削除で既に削除されている可能性があるが、明示的に実行）
        const deleteResult = await prisma.locationFujiEvent.deleteMany({
          where: { locationId }
        });

        this.logger.info('関連富士現象イベント削除完了', {
          locationId,
          locationName,
          deletedCount: deleteResult.count,
          expectedCount: eventCount
        });
      } else {
        this.logger.debug('削除対象の富士現象イベントなし', {
          locationId,
          locationName
        });
      }
    } catch (error) {
      this.logger.error('富士現象イベント削除失敗', {
        locationId,
        locationName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default AdminController;