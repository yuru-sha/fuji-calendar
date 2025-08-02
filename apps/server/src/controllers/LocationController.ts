import { Request, Response } from "express";
import { LocationService } from "../services/LocationService";
import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("LocationController");

/**
 * リファクタリング後の LocationController
 * DI パターンを使用して依存関係を注入
 */
export class LocationController {
  constructor(private locationService: LocationService) {}

  /**
   * 全ての撮影地点を取得
   */
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.locationService.getAllLocations();

      logger.info("撮影地点一覧取得成功", {
        locationCount: locations.length,
      });

      res.json({
        success: true,
        locations,
        count: locations.length,
      });
    } catch (error) {
      logger.error("撮影地点一覧取得エラー", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の取得中にエラーが発生しました。",
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
          error: "Invalid ID",
          message: "有効な ID を指定してください。",
        });
        return;
      }

      const location = await this.locationService.getLocationById(id);

      if (!location) {
        res.status(404).json({
          success: false,
          error: "Location not found",
          message: "指定された撮影地点が見つかりません。",
        });
        return;
      }

      logger.info("撮影地点詳細取得成功", {
        locationId: id,
        locationName: location.name,
      });

      res.json({
        success: true,
        location,
      });
    } catch (error) {
      logger.error("撮影地点詳細取得エラー", error, {
        locationId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の取得中にエラーが発生しました。",
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
        fujiAzimuth,
        fujiElevation,
        fujiDistance,
        measurementNotes,
      } = req.body;

      // バリデーション
      if (
        !name ||
        !prefecture ||
        latitude === undefined ||
        longitude === undefined ||
        elevation === undefined
      ) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          message: "必須フィールドが不足しています。",
        });
        return;
      }

      const createData = {
        name,
        prefecture,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        elevation: parseFloat(elevation),
        description,
        accessInfo,
        fujiAzimuth: fujiAzimuth ? parseFloat(fujiAzimuth) : undefined,
        fujiElevation: fujiElevation ? parseFloat(fujiElevation) : undefined,
        fujiDistance: fujiDistance ? parseFloat(fujiDistance) : undefined,
        measurementNotes,
      };

      const location = await this.locationService.createLocation(createData);

      logger.info("撮影地点作成成功", {
        locationId: location.id,
        locationName: location.name,
      });

      res.status(201).json({
        success: true,
        location,
        message: "撮影地点が正常に作成されました。天体計算を開始します。",
      });
    } catch (error) {
      logger.error("撮影地点作成エラー", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の作成中にエラーが発生しました。",
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
          error: "Invalid ID",
          message: "有効な ID を指定してください。",
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
        fujiAzimuth,
        fujiElevation,
        fujiDistance,
        measurementNotes,
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (prefecture !== undefined) updateData.prefecture = prefecture;
      if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
      if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
      if (elevation !== undefined) updateData.elevation = parseFloat(elevation);
      if (description !== undefined) updateData.description = description;
      if (accessInfo !== undefined) updateData.accessInfo = accessInfo;
      if (fujiAzimuth !== undefined)
        updateData.fujiAzimuth = fujiAzimuth ? parseFloat(fujiAzimuth) : null;
      if (fujiElevation !== undefined)
        updateData.fujiElevation = fujiElevation
          ? parseFloat(fujiElevation)
          : null;
      if (fujiDistance !== undefined)
        updateData.fujiDistance = fujiDistance
          ? parseFloat(fujiDistance)
          : null;
      if (measurementNotes !== undefined)
        updateData.measurementNotes = measurementNotes;

      const location = await this.locationService.updateLocation(
        id,
        updateData,
      );

      if (!location) {
        res.status(404).json({
          success: false,
          error: "Location not found",
          message: "指定された撮影地点が見つかりません。",
        });
        return;
      }

      logger.info("撮影地点更新成功", {
        locationId: id,
        locationName: location.name,
      });

      res.json({
        success: true,
        location,
        message: "撮影地点が正常に更新されました。",
      });
    } catch (error) {
      logger.error("撮影地点更新エラー", error, {
        locationId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の更新中にエラーが発生しました。",
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
          error: "Invalid ID",
          message: "有効な ID を指定してください。",
        });
        return;
      }

      await this.locationService.deleteLocation(id);

      logger.info("撮影地点削除成功", { locationId: id });

      res.json({
        success: true,
        message: "撮影地点が正常に削除されました。",
      });
    } catch (error) {
      logger.error("撮影地点削除エラー", error, {
        locationId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の削除中にエラーが発生しました。",
      });
    }
  }

  /**
   * 撮影地点を検索
   */
  async searchLocations(req: Request, res: Response): Promise<void> {
    try {
      const { prefecture, minElevation, maxElevation } = req.query;

      const condition: any = {};
      if (prefecture) condition.prefecture = prefecture as string;
      if (minElevation)
        condition.minElevation = parseFloat(minElevation as string);
      if (maxElevation)
        condition.maxElevation = parseFloat(maxElevation as string);

      const locations = await this.locationService.searchLocations(condition);

      logger.info("撮影地点検索成功", {
        condition,
        locationCount: locations.length,
      });

      res.json({
        success: true,
        locations,
        count: locations.length,
        searchCondition: condition,
      });
    } catch (error) {
      logger.error("撮影地点検索エラー", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点の検索中にエラーが発生しました。",
      });
    }
  }

  /**
   * 撮影地点データを JSON 形式でエクスポート
   */
  async exportLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.locationService.getAllLocations();

      logger.info("撮影地点エクスポート成功", {
        locationCount: locations.length,
      });

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="locations_export_${new Date().toISOString().split("T")[0]}.json"`,
      );
      res.json(locations);
    } catch (error) {
      logger.error("撮影地点エクスポートエラー", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "撮影地点のエクスポート中にエラーが発生しました。",
      });
    }
  }

  /**
   * JSON 形式の撮影地点データをインポート（重複データはスキップ）
   */
  async importLocations(req: Request, res: Response): Promise<void> {
    try {
      logger.info("撮影地点インポート開始", {
        bodyType: typeof req.body,
        isArray: Array.isArray(req.body),
        bodyLength: Array.isArray(req.body) ? req.body.length : "N/A",
      });

      const locations = req.body;

      if (!Array.isArray(locations)) {
        logger.warn("無効なデータ形式", {
          bodyType: typeof req.body,
          body: req.body,
        });
        res.status(400).json({
          success: false,
          error: "Invalid data format",
          message: "配列形式の JSON が必要です。",
        });
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const locationData of locations) {
        try {
          // 必須フィールドのバリデーション
          if (
            !locationData.name ||
            !locationData.prefecture ||
            locationData.latitude === undefined ||
            locationData.longitude === undefined ||
            locationData.elevation === undefined
          ) {
            errors.push(
              `地点「${locationData.name || "名前なし"}」: 必須フィールドが不足しています`,
            );
            errorCount++;
            continue;
          }

          const createData = {
            name: locationData.name,
            prefecture: locationData.prefecture,
            latitude: parseFloat(locationData.latitude),
            longitude: parseFloat(locationData.longitude),
            elevation: parseFloat(locationData.elevation),
            description: locationData.description || null,
            accessInfo: locationData.accessInfo || null,
            fujiAzimuth: locationData.fujiAzimuth
              ? parseFloat(locationData.fujiAzimuth)
              : undefined,
            fujiElevation: locationData.fujiElevation
              ? parseFloat(locationData.fujiElevation)
              : undefined,
            fujiDistance: locationData.fujiDistance
              ? parseFloat(locationData.fujiDistance)
              : undefined,
            measurementNotes: locationData.measurementNotes || undefined,
          };

          await this.locationService.createLocation(createData);
          importedCount++;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Unique constraint failed")
          ) {
            skippedCount++;
          } else {
            errors.push(
              `地点「${locationData.name || "名前なし"}」: ${error instanceof Error ? error.message : "不明なエラー"}`,
            );
            errorCount++;
          }
        }
      }

      logger.info("撮影地点インポート完了", {
        totalCount: locations.length,
        importedCount,
        skippedCount,
        errorCount,
      });

      res.json({
        success: true,
        message: "インポートが完了しました。",
        summary: {
          totalCount: locations.length,
          importedCount,
          skippedCount,
          errorCount,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error("撮影地点インポートエラー", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: `撮影地点のインポート中にエラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }
}

export default LocationController;
