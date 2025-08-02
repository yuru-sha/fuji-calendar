import { Location, CreateLocationRequest } from "@fuji-calendar/types";
import { LocationRepository } from "../repositories/interfaces/LocationRepository";
import { AstronomicalCalculator } from "./interfaces/AstronomicalCalculator";
import { QueueService } from "./interfaces/QueueService";
import { getComponentLogger } from "@fuji-calendar/utils";

const logger = getComponentLogger("LocationService");

/**
 * Location ビジネスロジック層
 * Repository パターンでデータアクセス層と Controller 層を分離
 */
export class LocationService {
  constructor(
    private locationRepository: LocationRepository,
    private astronomicalCalculator: AstronomicalCalculator,
    private queueService: QueueService,
  ) {}

  /**
   * 座標データから完全な Location オブジェクトを作成
   */
  private createLocationObject(params: {
    id?: number;
    name?: string;
    prefecture?: string;
    latitude: number;
    longitude: number;
    elevation: number;
    description?: string | null;
    accessInfo?: string | null;
    measurementNotes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Location {
    return {
      id: params.id ?? 0,
      name: params.name ?? '',
      prefecture: params.prefecture ?? '',
      latitude: params.latitude,
      longitude: params.longitude,
      elevation: params.elevation,
      description: params.description ?? null,
      accessInfo: params.accessInfo ?? null,
      fujiAzimuth: null, // 計算時は一時的に null
      fujiElevation: null, // 計算時は一時的に null
      fujiDistance: null, // 計算時は一時的に null
      measurementNotes: params.measurementNotes ?? null,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    };
  }

  /**
   * 富士山仰角を安全に計算
   */
  private calculateFujiElevationSafely(
    locationData: Location,
    context: string
  ): number {
    logger.info(`仰角計算開始: ${context}`, {
      locationId: locationData.id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      elevation: locationData.elevation,
    });

    try {
      const elevation = this.astronomicalCalculator.calculateElevationToFuji(locationData);
      
      logger.info(`仰角計算成功: ${context}`, {
        locationId: locationData.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        elevation: locationData.elevation,
        calculatedElevation: elevation,
        isZero: elevation === 0,
        isNaN: isNaN(elevation),
        isFinite: isFinite(elevation),
      });
      
      return elevation;
    } catch (elevationError) {
      logger.error(`富士山仰角計算エラー: ${context}`, elevationError, {
        locationId: locationData.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        elevation: locationData.elevation,
        errorMessage: elevationError instanceof Error ? elevationError.message : 'Unknown error',
        errorStack: elevationError instanceof Error ? elevationError.stack : undefined,
      });
      return 0; // エラー時は 0 を設定
    }
  }

  /**
   * 全地点の取得
   */
  async getAllLocations(): Promise<Location[]> {
    return await this.locationRepository.findAll();
  }

  /**
   * ID による地点の取得
   */
  async getLocationById(id: number): Promise<Location | null> {
    return await this.locationRepository.findById(id);
  }

  /**
   * 新しい地点の作成
   * ユーザー入力値を優先し、未入力の場合のみ自動計算
   */
  async createLocation(
    data: CreateLocationRequest & {
      fujiAzimuth?: number;
      fujiElevation?: number;
      fujiDistance?: number;
      measurementNotes?: string;
    },
  ): Promise<Location> {
    logger.info("地点作成開始", {
      name: data.name,
      prefecture: data.prefecture,
    });

    // ユーザー入力値があるかチェック
    const hasUserInputs =
      data.fujiAzimuth !== undefined ||
      data.fujiElevation !== undefined ||
      data.fujiDistance !== undefined;

    let finalFujiAzimuth: number;
    let finalFujiElevation: number;
    let finalFujiDistance: number;

    if (hasUserInputs) {
      // ユーザー入力値を優先
      logger.info("ユーザー入力値を使用", {
        userFujiAzimuth: data.fujiAzimuth,
        userFujiElevation: data.fujiElevation,
        userFujiDistance: data.fujiDistance,
      });

      // 入力されていない項目のみ自動計算
      const calculatedMetrics = this.calculateFujiMetrics(
        data.latitude,
        data.longitude,
        data.elevation,
      );

      finalFujiAzimuth = data.fujiAzimuth ?? calculatedMetrics.azimuth;
      finalFujiDistance = data.fujiDistance ?? calculatedMetrics.distance;

      if (data.fujiElevation !== undefined) {
        finalFujiElevation = data.fujiElevation;
      } else {
        // 仰角を同期的に計算
        const locationObj = this.createLocationObject({
          latitude: data.latitude,
          longitude: data.longitude,
          elevation: data.elevation,
        });
        finalFujiElevation = this.calculateFujiElevationSafely(locationObj, "新規作成・ユーザー入力");
      }
    } else {
      // 従来通り全て自動計算
      logger.info("自動計算値を使用");
      const fujiMetrics = this.calculateFujiMetrics(
        data.latitude,
        data.longitude,
        data.elevation,
      );

      finalFujiAzimuth = fujiMetrics.azimuth;
      finalFujiDistance = fujiMetrics.distance;
      // 仰角を同期的に計算
      const locationObj = this.createLocationObject({
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
      });
      finalFujiElevation = this.calculateFujiElevationSafely(locationObj, "新規作成・自動計算");
    }

    // データベースに保存
    const locationData: CreateLocationRequest & {
      fujiAzimuth?: number;
      fujiElevation?: number;
      fujiDistance?: number;
      measurementNotes?: string;
    } = {
      ...data,
      fujiAzimuth: finalFujiAzimuth,
      fujiElevation: finalFujiElevation,
      fujiDistance: finalFujiDistance,
    };

    const location = await this.locationRepository.create(locationData);

    // 富士山関連データの更新（既に同期的に計算済み）
    await this.locationRepository.updateFujiMetrics(location.id, {
      fujiAzimuth: finalFujiAzimuth,
      fujiElevation: finalFujiElevation, // 同期的に計算済み
      fujiDistance: finalFujiDistance,
    });

    // キューに天体計算ジョブを追加（前年・当年・翌年の 3 年分）
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const nextYear = currentYear + 1;

    // 非同期でジョブを登録（レスポンスを待たない）
    this.queueService
      .scheduleLocationCalculation(
        location.id,
        previousYear,
        nextYear,
        "normal",
      )
      .then((jobId) => {
        if (jobId) {
          logger.info("天体計算ジョブ追加成功", {
            locationId: location.id,
            jobId,
            years: `${previousYear}-${nextYear}`,
          });
        } else {
          logger.warn("天体計算ジョブ追加失敗（キュー無効）", {
            locationId: location.id,
          });
        }
      })
      .catch((error) => {
        logger.error("天体計算ジョブ追加エラー", error, {
          locationId: location.id,
        });
      });

    logger.info("地点作成完了", {
      locationId: location.id,
      name: location.name,
      fujiDistance: location.fujiDistance,
      fujiAzimuth: location.fujiAzimuth,
      fujiElevation: location.fujiElevation,
    });

    return location;
  }

  /**
   * 地点の更新
   * ユーザー入力値を優先し、未入力の場合のみ自動計算
   */
  async updateLocation(
    id: number,
    data: Partial<CreateLocationRequest> & {
      fujiAzimuth?: number | null;
      fujiElevation?: number | null;
      fujiDistance?: number | null;
      measurementNotes?: string;
    },
  ): Promise<Location | null> {
    logger.info("地点更新開始", { locationId: id });

    const currentLocation = await this.locationRepository.findById(id);
    if (!currentLocation) {
      return null;
    }

    // 位置情報または fuji_*フィールドが変更された場合の処理
    const locationChanged =
      data.latitude !== undefined ||
      data.longitude !== undefined ||
      data.elevation !== undefined;
    const fujiDataProvided =
      data.fujiAzimuth !== undefined ||
      data.fujiElevation !== undefined ||
      data.fujiDistance !== undefined;

    if (locationChanged || fujiDataProvided) {
      const newLatitude = data.latitude ?? currentLocation.latitude;
      const newLongitude = data.longitude ?? currentLocation.longitude;
      const newElevation = data.elevation ?? currentLocation.elevation;

      // ユーザー入力値を優先、null の場合は自動計算
      let finalFujiAzimuth: number;
      let finalFujiElevation: number;
      let finalFujiDistance: number;

      if (fujiDataProvided) {
        // ユーザー入力値を処理
        const calculatedMetrics = this.calculateFujiMetrics(
          newLatitude,
          newLongitude,
          newElevation,
        );

        // null の場合は自動計算値を使用、undefined の場合は現在値を保持
        if (data.fujiAzimuth !== undefined) {
          finalFujiAzimuth = data.fujiAzimuth ?? calculatedMetrics.azimuth;
        } else {
          finalFujiAzimuth =
            currentLocation.fujiAzimuth ?? calculatedMetrics.azimuth;
        }

        if (data.fujiDistance !== undefined) {
          finalFujiDistance = data.fujiDistance ?? calculatedMetrics.distance;
        } else {
          finalFujiDistance =
            currentLocation.fujiDistance ?? calculatedMetrics.distance;
        }

        // 仰角を同期的に計算
        if (data.fujiElevation !== undefined) {
          if (data.fujiElevation === null) {
            // null の場合は自動計算
            const locationObj = this.createLocationObject({
              id: id,
              name: currentLocation.name,
              prefecture: currentLocation.prefecture,
              latitude: newLatitude,
              longitude: newLongitude,
              elevation: newElevation,
              description: currentLocation.description,
              accessInfo: currentLocation.accessInfo,
              measurementNotes: currentLocation.measurementNotes,
              createdAt: currentLocation.createdAt,
              updatedAt: new Date(),
            });
            finalFujiElevation = this.calculateFujiElevationSafely(locationObj, "更新・ null 指定");
          } else {
            // 値が指定されている場合はその値を使用
            finalFujiElevation = data.fujiElevation;
          }
        } else {
          // fujiElevation が undefined の場合は現在値を保持、または自動計算
          if (currentLocation.fujiElevation !== null) {
            finalFujiElevation = currentLocation.fujiElevation;
          } else {
            const locationObj = this.createLocationObject({
              id: id,
              name: currentLocation.name,
              prefecture: currentLocation.prefecture,
              latitude: newLatitude,
              longitude: newLongitude,
              elevation: newElevation,
              description: currentLocation.description,
              accessInfo: currentLocation.accessInfo,
              measurementNotes: currentLocation.measurementNotes,
              createdAt: currentLocation.createdAt,
              updatedAt: new Date(),
            });
            finalFujiElevation = this.calculateFujiElevationSafely(locationObj, "更新・既存値 null");
          }
        }

        logger.info("ユーザー入力値を更新に適用", {
          locationId: id,
          userFujiAzimuth: data.fujiAzimuth,
          userFujiElevation: data.fujiElevation,
          userFujiDistance: data.fujiDistance,
          finalFujiAzimuth,
          finalFujiElevation,
          finalFujiDistance,
        });
      } else {
        // 位置情報のみ変更の場合は自動計算
        const fujiMetrics = this.calculateFujiMetrics(
          newLatitude,
          newLongitude,
          newElevation,
        );

        finalFujiAzimuth = fujiMetrics.azimuth;
        finalFujiDistance = fujiMetrics.distance;
        // 仰角を同期的に計算
        const locationObj = this.createLocationObject({
          id: id,
          name: currentLocation.name,
          prefecture: currentLocation.prefecture,
          latitude: newLatitude,
          longitude: newLongitude,
          elevation: newElevation,
          description: currentLocation.description,
          accessInfo: currentLocation.accessInfo,
          measurementNotes: currentLocation.measurementNotes,
          createdAt: currentLocation.createdAt,
          updatedAt: new Date(),
        });
        finalFujiElevation = this.calculateFujiElevationSafely(locationObj, "位置変更");

        logger.info("位置変更により富士山関連データを自動計算", {
          locationId: id,
          calculatedFujiAzimuth: finalFujiAzimuth,
          calculatedFujiElevation: finalFujiElevation,
          calculatedFujiDistance: finalFujiDistance,
        });
      }

      // 富士山関連データを更新データに追加
      (data as any).fujiAzimuth = finalFujiAzimuth;
      (data as any).fujiElevation = finalFujiElevation;
      (data as any).fujiDistance = finalFujiDistance;
    }

    const updatedLocation = await this.locationRepository.update(id, data);

    if (updatedLocation) {
      logger.info("地点更新完了", { locationId: id });

      // 仰角は既に同期的に計算済み

      // 位置情報が変更された場合は天体計算を再実行（前年・当年・翌年の 3 年分）
      logger.debug("地点更新チェック", {
        locationId: id,
        hasLatitude: data.latitude !== undefined,
        hasLongitude: data.longitude !== undefined,
        hasElevation: data.elevation !== undefined,
        hasQueueService: !!this.queueService,
      });

      if (
        data.latitude !== undefined ||
        data.longitude !== undefined ||
        data.elevation !== undefined
      ) {
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        const nextYear = currentYear + 1;

        logger.info("位置情報変更を検出 - 天体計算ジョブを登録", {
          locationId: id,
          years: `${previousYear}-${nextYear}`,
          queueServiceExists: !!this.queueService,
        });

        // 非同期でジョブを登録（レスポンスを待たない）
        this.queueService
          .scheduleLocationCalculation(
            id,
            previousYear,
            nextYear,
            "high", // 更新時は高優先度
          )
          .then((jobId) => {
            if (jobId) {
              logger.info("位置変更による天体計算ジョブ追加成功", {
                locationId: id,
                jobId,
                years: `${previousYear}-${nextYear}`,
              });
            } else {
              logger.warn("天体計算ジョブ追加失敗（キュー無効）", {
                locationId: id,
              });
            }
          })
          .catch((error) => {
            logger.error("天体計算ジョブ追加エラー", error, { locationId: id });
          });
      }
    }

    return updatedLocation;
  }

  /**
   * 地点の削除
   */
  async deleteLocation(id: number): Promise<boolean> {
    logger.info("地点削除開始", { locationId: id });

    await this.locationRepository.delete(id);
    logger.info("地点削除完了", { locationId: id });

    return true;
  }

  /**
   * 条件による地点の検索
   */
  async searchLocations(condition: {
    prefecture?: string;
    minElevation?: number;
    maxElevation?: number;
  }): Promise<Location[]> {
    return await this.locationRepository.findByCondition(condition);
  }

  /**
   * 富士山への距離・方位角を計算
   */
  private calculateFujiMetrics(
    latitude: number,
    longitude: number,
    _elevation: number,
  ): {
    distance: number;
    azimuth: number;
  } {
    // 富士山の座標（山頂）
    const FUJI_LAT = 35.3606;
    const FUJI_LON = 138.7274;

    // Haversine 公式で距離を計算
    const R = 6371000; // 地球の半径（メートル）
    const dLat = this.toRadians(FUJI_LAT - latitude);
    const dLon = this.toRadians(FUJI_LON - longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(latitude)) *
        Math.cos(this.toRadians(FUJI_LAT)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // 方位角を計算
    const y =
      Math.sin(this.toRadians(FUJI_LON - longitude)) *
      Math.cos(this.toRadians(FUJI_LAT));
    const x =
      Math.cos(this.toRadians(latitude)) * Math.sin(this.toRadians(FUJI_LAT)) -
      Math.sin(this.toRadians(latitude)) *
        Math.cos(this.toRadians(FUJI_LAT)) *
        Math.cos(this.toRadians(FUJI_LON - longitude));

    let azimuth = Math.atan2(y, x);
    azimuth = this.toDegrees(azimuth);
    azimuth = (azimuth + 360) % 360; // 0-360 度に正規化

    return {
      distance: Math.round(distance),
      azimuth: Math.round(azimuth * 100) / 100, // 小数点以下 2 桁
    };
  }

  /**
   * 度をラジアンに変換
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * ラジアンを度に変換
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
