import { SystemSetting } from "../shared";
import { SystemSettingsRepository } from "./interfaces/SystemSettingsRepository";
import { PrismaClientManager } from "../database/prisma";
import { getComponentLogger } from "../shared";

export class PrismaSystemSettingsRepository
  implements SystemSettingsRepository
{
  private readonly logger = getComponentLogger(
    "PrismaSystemSettingsRepository",
  );
  private readonly prisma = PrismaClientManager.getInstance();

  async getByKey(settingKey: string): Promise<SystemSetting | null> {
    try {
      this.logger.debug("設定値を取得中", { settingKey });

      const setting = await this.prisma.systemSetting.findUnique({
        where: { settingKey },
      });

      if (!setting) {
        this.logger.debug("設定が見つかりません", { settingKey });
        return null;
      }

      return this.toDomainModel(setting);
    } catch (error) {
      this.logger.error("設定値の取得に失敗", { settingKey, error });
      throw error;
    }
  }

  async upsert(
    settingKey: string,
    value: any,
    description?: string,
  ): Promise<SystemSetting> {
    try {
      this.logger.debug("設定値を作成/更新中", {
        settingKey,
        value,
        description,
      });

      // 値の型を判定
      const { settingType, updateData, createData } = this.prepareValueData(
        value,
        description,
      );

      const setting = await this.prisma.systemSetting.upsert({
        where: { settingKey },
        update: updateData,
        create: {
          settingKey,
          settingType,
          category: "system", // デフォルトカテゴリ
          ...createData,
        },
      });

      this.logger.info("設定値を正常に更新", { settingKey, value });
      return this.toDomainModel(setting);
    } catch (error) {
      this.logger.error("設定値の作成/更新に失敗", {
        settingKey,
        value,
        error,
      });
      throw error;
    }
  }

  async findAll(): Promise<SystemSetting[]> {
    try {
      this.logger.debug("全設定を取得中");

      const settings = await this.prisma.systemSetting.findMany({
        orderBy: { settingKey: "asc" },
      });

      return settings.map((setting) => this.toDomainModel(setting));
    } catch (error) {
      this.logger.error("全設定の取得に失敗", { error });
      throw error;
    }
  }

  async findByCategory(category: string): Promise<SystemSetting[]> {
    try {
      this.logger.debug("カテゴリ別設定を取得中", { category });

      const settings = await this.prisma.systemSetting.findMany({
        where: { category },
        orderBy: { settingKey: "asc" },
      });

      return settings.map((setting) => this.toDomainModel(setting));
    } catch (error) {
      this.logger.error("カテゴリ別設定の取得に失敗", { category, error });
      throw error;
    }
  }

  private prepareValueData(value: any, description?: string) {
    if (typeof value === "number") {
      return {
        settingType: "number" as const,
        updateData: { numberValue: value, description },
        createData: { numberValue: value, description },
      };
    } else if (typeof value === "boolean") {
      return {
        settingType: "boolean" as const,
        updateData: { booleanValue: value, description },
        createData: { booleanValue: value, description },
      };
    } else {
      return {
        settingType: "string" as const,
        updateData: { stringValue: String(value), description },
        createData: { stringValue: String(value), description },
      };
    }
  }

  private toDomainModel(dbModel: any): SystemSetting {
    return {
      id: dbModel.id,
      settingKey: dbModel.settingKey,
      settingType: dbModel.settingType,
      numberValue: dbModel.numberValue,
      stringValue: dbModel.stringValue,
      booleanValue: dbModel.booleanValue,
      description: dbModel.description,
      category: dbModel.category,
      editable: dbModel.editable,
      createdAt: dbModel.createdAt.toISOString(),
      updatedAt: dbModel.updatedAt.toISOString(),
    };
  }
}
