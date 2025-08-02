import { Request, Response } from 'express';
import { SystemSettingsService } from '../services/SystemSettingsService';
import { getComponentLogger } from '@fuji-calendar/utils';

/**
 * システム設定管理コントローラー
 * 管理画面でのシステム設定の取得・更新を提供
 */
export class SystemSettingsController {
  private systemSettingsService: SystemSettingsService;
  private logger = getComponentLogger('SystemSettingsController');

  constructor(systemSettingsService: SystemSettingsService) {
    this.systemSettingsService = systemSettingsService;
  }

  /**
   * 全システム設定を取得
   */
  async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('システム設定一覧取得開始');

      const settings = await this.systemSettingsService.getAllSettings();
      
      // カテゴリ別に整理
      const categorizedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push({
          id: setting.id,
          settingKey: setting.settingKey,
          settingType: setting.settingType,
          value: this.getSettingValue(setting),
          description: setting.description,
          editable: setting.editable,
          updatedAt: setting.updatedAt
        });
        return acc;
      }, {} as Record<string, any[]>);

      this.logger.info('システム設定一覧取得完了', {
        totalSettings: settings.length,
        categories: Object.keys(categorizedSettings)
      });

      res.json({
        success: true,
        settings: categorizedSettings,
        meta: {
          totalSettings: settings.length,
          categories: Object.keys(categorizedSettings),
          lastUpdate: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('システム設定一覧取得エラー', error);
      res.status(500).json({
        success: false,
        message: 'システム設定の取得に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 特定の設定を更新
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { settingKey } = req.params;
      const { value } = req.body;

      this.logger.info('システム設定更新開始', { settingKey, value });

      if (!settingKey) {
        res.status(400).json({
          success: false,
          message: '設定キーが指定されていません'
        });
        return;
      }

      if (value === undefined || value === null) {
        res.status(400).json({
          success: false,
          message: '設定値が指定されていません'
        });
        return;
      }

      const updatedSetting = await this.systemSettingsService.updateSettingAndReturn(settingKey, value);

      if (!updatedSetting) {
        res.status(404).json({
          success: false,
          message: '指定された設定が見つかりません'
        });
        return;
      }

      this.logger.info('システム設定更新完了', { 
        settingKey, 
        oldValue: this.getSettingValue(updatedSetting),
        newValue: value 
      });

      res.json({
        success: true,
        message: '設定を更新しました',
        setting: {
          id: updatedSetting.id,
          settingKey: updatedSetting.settingKey,
          settingType: updatedSetting.settingType,
          value: this.getSettingValue(updatedSetting),
          description: updatedSetting.description,
          editable: updatedSetting.editable,
          updatedAt: updatedSetting.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('システム設定更新エラー', error, { settingKey: req.params.settingKey });
      res.status(500).json({
        success: false,
        message: 'システム設定の更新に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 複数設定の一括更新
   */
  async updateMultipleSettings(req: Request, res: Response): Promise<void> {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        res.status(400).json({
          success: false,
          message: '設定データが正しい形式ではありません'
        });
        return;
      }

      this.logger.info('複数システム設定更新開始', { count: settings.length });

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const { settingKey, value } of settings) {
        try {
          const updatedSetting = await this.systemSettingsService.updateSettingAndReturn(settingKey, value);
          if (updatedSetting) {
            results.push({
              settingKey,
              success: true,
              setting: {
                id: updatedSetting.id,
                settingKey: updatedSetting.settingKey,
                value: this.getSettingValue(updatedSetting),
                updatedAt: updatedSetting.updatedAt
              }
            });
            successCount++;
          } else {
            results.push({
              settingKey,
              success: false,
              error: '設定が見つかりません'
            });
            failureCount++;
          }
        } catch (settingError) {
          results.push({
            settingKey,
            success: false,
            error: settingError instanceof Error ? settingError.message : 'Unknown error'
          });
          failureCount++;
        }
      }

      this.logger.info('複数システム設定更新完了', { 
        total: settings.length,
        success: successCount,
        failure: failureCount 
      });

      res.json({
        success: failureCount === 0,
        message: `${successCount} 件の設定を更新しました${failureCount > 0 ? ` (${failureCount} 件の更新に失敗)` : ''}`,
        results,
        summary: {
          total: settings.length,
          success: successCount,
          failure: failureCount
        }
      });
    } catch (error) {
      this.logger.error('複数システム設定更新エラー', error);
      res.status(500).json({
        success: false,
        message: 'システム設定の一括更新に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 設定の初期化（デフォルト値に戻す）
   */
  async resetSettings(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.body;

      this.logger.info('システム設定初期化開始', { category });

      // カテゴリが指定されている場合は、そのカテゴリのみ初期化
      if (category) {
        // TODO: カテゴリ別初期化の実装
        this.logger.warn('カテゴリ別初期化は未実装', { category });
        res.status(501).json({
          success: false,
          message: 'カテゴリ別初期化は現在未対応です'
        });
        return;
      }

      // 全設定を初期化（危険な操作なので慎重に）
      this.logger.warn('全システム設定初期化が要求されました');
      res.status(501).json({
        success: false,
        message: '全設定初期化は安全上未対応です'
      });
    } catch (error) {
      this.logger.error('システム設定初期化エラー', error);
      res.status(500).json({
        success: false,
        message: 'システム設定の初期化に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * キャッシュクリア
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('システム設定キャッシュクリア開始');

      await this.systemSettingsService.clearCache();

      this.logger.info('システム設定キャッシュクリア完了');

      res.json({
        success: true,
        message: 'キャッシュをクリアしました',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('システム設定キャッシュクリアエラー', error);
      res.status(500).json({
        success: false,
        message: 'キャッシュクリアに失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 設定値を適切な型で取得
   */
  private getSettingValue(setting: any): any {
    switch (setting.settingType) {
      case 'number':
        return setting.numberValue;
      case 'string':
        return setting.stringValue;
      case 'boolean':
        return setting.booleanValue;
      default:
        return null;
    }
  }
}