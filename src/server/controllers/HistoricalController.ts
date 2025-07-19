import { Request, Response } from 'express';

import { HistoricalSearchOptions } from '../../shared/types';
import { getComponentLogger } from '../../shared/utils/logger';

import { HistoricalEventsModel } from '../models/HistoricalEvents';
import { LocationModel } from '../models/Location';

export class HistoricalController {
  private historicalModel: HistoricalEventsModel;
  private locationModel: LocationModel;
  private logger = getComponentLogger('historical-controller');

  constructor() {
    this.historicalModel = new HistoricalEventsModel();
    this.locationModel = new LocationModel();
  }

  async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        locationId,
        yearStart,
        yearEnd,
        eventType,
        subType,
        photoSuccessOnly,
        minVisibility,
        dataSource,
        limit = 50,
        offset = 0
      } = req.query;

      const searchOptions: HistoricalSearchOptions = {
        locationId: locationId ? parseInt(locationId as string) : undefined,
        yearStart: yearStart ? parseInt(yearStart as string) : undefined,
        yearEnd: yearEnd ? parseInt(yearEnd as string) : undefined,
        eventType: eventType as 'diamond' | 'pearl' | undefined,
        subType: subType as 'sunrise' | 'sunset' | undefined,
        photoSuccessOnly: photoSuccessOnly === 'true',
        minVisibility: minVisibility ? parseInt(minVisibility as string) : undefined,
        dataSource: dataSource as 'calculated' | 'observed' | 'reported' | undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await this.historicalModel.search(searchOptions);
      
      this.logger.info('過去データ検索実行', {
        searchOptions,
        resultCount: result.events.length,
        total: result.total,
        requestId: req.requestId
      });

      res.json({
        success: true,
        data: {
          events: result.events,
          pagination: {
            total: result.total,
            limit: searchOptions.limit,
            offset: searchOptions.offset,
            hasMore: result.hasMore
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('過去データ検索エラー', error, {
        requestId: req.requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '過去データの検索中にエラーが発生しました。'
      });
    }
  }

  async getYearlyStats(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, eventType } = req.query;

      const stats = await this.historicalModel.getYearlyStats(
        locationId ? parseInt(locationId as string) : undefined,
        eventType as 'diamond' | 'pearl' | undefined
      );

      this.logger.info('年別統計取得', {
        locationId,
        eventType,
        statsCount: stats.length,
        requestId: req.requestId
      });

      res.json({
        success: true,
        data: { stats },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('年別統計取得エラー', error, {
        requestId: req.requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '年別統計の取得中にエラーが発生しました。'
      });
    }
  }

  async getMonthlyHistory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { year, eventType } = req.query;

      if (!locationId || isNaN(parseInt(locationId))) {
        res.status(400).json({
          error: 'Invalid location ID',
          message: '有効な地点IDを指定してください。'
        });
      }

      const summaries = await this.historicalModel.getMonthlyHistory(
        parseInt(locationId),
        year ? parseInt(year as string) : undefined,
        eventType as 'diamond' | 'pearl' | undefined
      );

      this.logger.info('月別履歴取得', {
        locationId: parseInt(locationId),
        year,
        eventType,
        summaryCount: summaries.length,
        requestId: req.requestId
      });

      res.json({
        success: true,
        data: { summaries },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('月別履歴取得エラー', error, {
        requestId: req.requestId,
        locationId: req.params.locationId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '月別履歴の取得中にエラーが発生しました。'
      });
    }
  }

  async reportPhotoSuccess(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, visibilityRating, weatherCondition, notes } = req.body;

      if (!eventId || !visibilityRating) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'イベントIDと視界評価が必要です。'
        });
      }

      if (visibilityRating < 1 || visibilityRating > 5) {
        res.status(400).json({
          error: 'Invalid visibility rating',
          message: '視界評価は1-5の範囲で指定してください。'
        });
      }

      const success = await this.historicalModel.reportPhotoSuccess(
        parseInt(eventId),
        parseInt(visibilityRating),
        weatherCondition,
        notes
      );

      if (!success) {
        return res.status(404).json({
          error: 'Event not found',
          message: '指定されたイベントが見つかりません。'
        });
      }

      this.logger.info('撮影成功報告追加', {
        eventId: parseInt(eventId),
        visibilityRating: parseInt(visibilityRating),
        hasWeatherCondition: !!weatherCondition,
        hasNotes: !!notes,
        requestId: req.requestId
      });

      res.json({
        success: true,
        message: '撮影成功報告を追加しました。',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('撮影成功報告追加エラー', error, {
        requestId: req.requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '撮影成功報告の追加中にエラーが発生しました。'
      });
    }
  }

  async addObservedEvent(req: Request, res: Response): Promise<void> {
    try {
      const {
        locationId,
        year,
        month,
        day,
        eventType,
        subType,
        eventTime,
        azimuth,
        elevation,
        moonPhase,
        weatherCondition,
        visibilityRating,
        photoSuccessReported = false,
        dataSource = 'observed',
        notes
      } = req.body;

      if (!locationId || !year || !month || !day || !eventType || !subType || !eventTime) {
        res.status(400).json({
          error: 'Missing required fields',
          message: '必須フィールドが不足しています。'
        });
      }

      const location = await this.locationModel.findById(parseInt(locationId));
      if (!location) {
        return res.status(404).json({
          error: 'Location not found',
          message: '指定された地点が見つかりません。'
        });
      }

      const eventId = await this.historicalModel.addObservedEvent(
        parseInt(locationId),
        parseInt(year),
        parseInt(month),
        parseInt(day),
        eventType,
        subType,
        new Date(eventTime),
        azimuth ? parseFloat(azimuth) : undefined,
        elevation ? parseFloat(elevation) : undefined,
        moonPhase ? parseFloat(moonPhase) : undefined,
        weatherCondition,
        visibilityRating ? parseInt(visibilityRating) : undefined,
        photoSuccessReported === true,
        dataSource,
        notes
      );

      this.logger.info('観測データ追加', {
        eventId,
        locationId: parseInt(locationId),
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        eventType,
        subType,
        dataSource,
        requestId: req.requestId
      });

      res.status(201).json({
        success: true,
        data: { eventId },
        message: '観測データを追加しました。',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('観測データ追加エラー', error, {
        requestId: req.requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '観測データの追加中にエラーが発生しました。'
      });
    }
  }

  async getDataOverview(req: Request, res: Response): Promise<void> {
    try {
      const dataCount = await this.historicalModel.getDataCount();

      this.logger.info('過去データ統計取得', {
        dataCount,
        requestId: req.requestId
      });

      res.json({
        success: true,
        data: dataCount,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('過去データ統計取得エラー', error, {
        requestId: req.requestId
      });
      res.status(500).json({
        error: 'Internal server error',
        message: '過去データ統計の取得中にエラーが発生しました。'
      });
    }
  }
}

export default HistoricalController;