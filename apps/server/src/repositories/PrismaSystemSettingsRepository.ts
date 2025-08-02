import { SystemSetting } from '@fuji-calendar/types';
import { SystemSettingsRepository } from './interfaces/SystemSettingsRepository';
import { PrismaClientManager } from '../database/prisma';
import { getComponentLogger } from '@fuji-calendar/utils';

export class PrismaSystemSettingsRepository implements SystemSettingsRepository {
  private readonly logger = getComponentLogger('PrismaSystemSettingsRepository');
  private readonly prisma = PrismaClientManager.getInstance();

  async getByKey(key: string): Promise<SystemSetting | null> {
    try {
      this.logger.debug({ key }, '設定値を取得中');
      
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key }
      });

      if (!setting) {
        this.logger.debug({ key }, '設定が見つかりません');
        return null;
      }

      return this.toDomainModel(setting);
    } catch (error) {
      this.logger.error({ key, error }, '設定値の取得に失敗');
      throw error;
    }
  }

  async upsert(key: string, value: string, description?: string): Promise<SystemSetting> {
    try {
      this.logger.debug({ key, value, description }, '設定値を作成/更新中');
      
      const setting = await this.prisma.systemSetting.upsert({
        where: { key },
        update: { 
          value,
          description: description || undefined
        },
        create: { 
          key, 
          value,
          description: description || null
        }
      });

      this.logger.info({ key, value }, '設定値を正常に更新');
      return this.toDomainModel(setting);
    } catch (error) {
      this.logger.error({ key, value, error }, '設定値の作成/更新に失敗');
      throw error;
    }
  }

  async findAll(): Promise<SystemSetting[]> {
    try {
      this.logger.debug('全設定を取得中');
      
      const settings = await this.prisma.systemSetting.findMany({
        orderBy: { key: 'asc' }
      });

      return settings.map(setting => this.toDomainModel(setting));
    } catch (error) {
      this.logger.error({ error }, '全設定の取得に失敗');
      throw error;
    }
  }

  async findActive(): Promise<SystemSetting[]> {
    try {
      this.logger.debug('有効な設定を取得中');
      
      const settings = await this.prisma.systemSetting.findMany({
        where: { isActive: true },
        orderBy: { key: 'asc' }
      });

      return settings.map(setting => this.toDomainModel(setting));
    } catch (error) {
      this.logger.error({ error }, '有効な設定の取得に失敗');
      throw error;
    }
  }

  private toDomainModel(dbModel: any): SystemSetting {
    return {
      id: dbModel.id,
      key: dbModel.key,
      value: dbModel.value,
      description: dbModel.description,
      isActive: dbModel.isActive,
      createdAt: dbModel.createdAt.toISOString(),
      updatedAt: dbModel.updatedAt.toISOString()
    };
  }
}