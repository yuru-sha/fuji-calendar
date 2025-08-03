import { FujiEvent, Location, MoonPosition } from "@fuji-calendar/types";
import { getComponentLogger, timeUtils } from "@fuji-calendar/utils";
import { CoordinateCalculator } from "./CoordinateCalculator";
import { CelestialPositionCalculator } from "./CelestialPositionCalculator";
import { SeasonCalculator } from "./SeasonCalculator";
import { SystemSettingsService } from "../SystemSettingsService";

/**
 * 富士山との整列計算を担当するクラス
 * ダイアモンド富士・パール富士の検出
 * システム設定を DB から動的に取得して計算精度を調整可能
 */
export class FujiAlignmentCalculator {
  private logger = getComponentLogger("FujiAlignmentCalculator");
  private coordinateCalc = new CoordinateCalculator();
  private celestialCalc = new CelestialPositionCalculator();
  private seasonCalc = new SeasonCalculator();
  private settingsService: SystemSettingsService;

  constructor(settingsService: SystemSettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * ダイアモンド富士イベントを検索
   */
  async findDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];
    const fujiAzimuth = this.coordinateCalc.calculateAzimuthToFuji(location);

    // 富士山の方位角に基づいて日の出・日の入りどちらが可能かを判定
    const canSeeSunrise = this.canObserveSunrise(fujiAzimuth);
    const canSeeSunset = this.canObserveSunset(fujiAzimuth);

    let sunriseEvents: FujiEvent[] = [];
    let sunsetEvents: FujiEvent[] = [];

    // 日の出ダイヤモンド富士（東側）
    if (canSeeSunrise) {
      sunriseEvents = await this.searchCelestialAlignment(
        date,
        location,
        "sunrise",
        "diamond_sunrise",
      );
    }

    // 日の入りダイヤモンド富士（西側）
    if (canSeeSunset) {
      sunsetEvents = await this.searchCelestialAlignment(
        date,
        location,
        "sunset",
        "diamond_sunset",
      );
    }

    events.push(...sunriseEvents, ...sunsetEvents);

    this.logger.debug("ダイアモンド富士検索完了", {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      fujiAzimuth,
      canSeeSunrise,
      canSeeSunset,
      sunriseEvents: sunriseEvents.length,
      sunsetEvents: sunsetEvents.length,
    });

    return events;
  }

  /**
   * パール富士イベントを検索
   */
  async findPearlFuji(date: Date, location: Location): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];

    // 月の出イベントを検索
    const moonriseEvents = await this.searchCelestialAlignment(
      date,
      location,
      "moonrise",
      "pearl_moonrise",
    );

    // 月の入りイベントを検索
    const moonsetEvents = await this.searchCelestialAlignment(
      date,
      location,
      "moonset",
      "pearl_moonset",
    );

    events.push(...moonriseEvents, ...moonsetEvents);

    this.logger.debug("パール富士検索完了", {
      date: timeUtils.formatDateString(date),
      locationId: location.id,
      moonriseEvents: moonriseEvents.length,
      moonsetEvents: moonsetEvents.length,
    });

    return events;
  }

  /**
   * 天体と富士山の整列を検索
   */
  private async searchCelestialAlignment(
    date: Date,
    location: Location,
    eventPhase: "sunrise" | "sunset" | "moonrise" | "moonset",
    eventType:
      | "diamond_sunrise"
      | "diamond_sunset"
      | "pearl_moonrise"
      | "pearl_moonset",
  ): Promise<FujiEvent[]> {
    const events: FujiEvent[] = [];
    const fujiAzimuth = this.coordinateCalc.calculateAzimuthToFuji(location);

    // 検索時間範囲を設定
    const { startTime, endTime } = this.getSearchTimeRange(
      date,
      eventPhase,
      location,
    );

    let bestCandidate: {
      time: Date;
      azimuthDiff: number;
      elevationDiff: number;
      position: { azimuth: number; elevation: number };
      moonPhase?: number;
      moonIllumination?: number;
    } | null = null;

    // 設定値に基づく間隔で検索
    const searchInterval = await this.settingsService.getNumberSetting(
      "search_interval",
      10,
    );
    for (
      let time = new Date(startTime);
      time <= endTime;
      time.setSeconds(time.getSeconds() + searchInterval)
    ) {
      const position = eventType.includes("diamond")
        ? this.celestialCalc.calculateSunPosition(time, location)
        : this.celestialCalc.calculateMoonPosition(time, location);

      if (!position || !this.celestialCalc.isVisible(position.elevation)) {
        continue;
      }

      const azimuthDiff = this.coordinateCalc.getAzimuthDifference(
        position.azimuth,
        fujiAzimuth,
      );

      // 富士山頂への仰角を取得（地点の富士山仰角データを使用）
      const fujiElevation = location.fujiElevation || 0;
      const elevationDiff = Math.abs(position.elevation - fujiElevation);

      // 許容範囲内かチェック（方位角・高度の両方を考慮）
      const azimuthTolerance = await this.settingsService.getNumberSetting(
        "azimuth_tolerance",
        1.5,
      );
      const elevationTolerance = await this.settingsService.getNumberSetting(
        "elevation_tolerance",
        1.0,
      );
      if (
        azimuthDiff <= azimuthTolerance &&
        elevationDiff <= elevationTolerance
      ) {
        // 総合精度スコアで最良候補を選択
        const totalScore = azimuthDiff + elevationDiff * 2; // 高度差を重視
        const currentScore = !bestCandidate
          ? Infinity
          : bestCandidate.azimuthDiff + bestCandidate.elevationDiff * 2;

        if (totalScore < currentScore) {
          bestCandidate = {
            time: new Date(time),
            azimuthDiff,
            elevationDiff,
            position,
            moonPhase:
              "phase" in position
                ? (position as MoonPosition).phase
                : undefined,
            moonIllumination:
              "illumination" in position
                ? (position as MoonPosition).illumination
                : undefined,
          };
        }
      }
    }

    // 最良候補が見つかった場合、イベントを作成
    if (bestCandidate) {
      // パール富士の場合は月相チェック
      if (
        eventType.includes("pearl") &&
        bestCandidate.moonIllumination !== undefined
      ) {
        if (
          !this.celestialCalc.isVisibleMoonPhase(bestCandidate.moonIllumination)
        ) {
          return events; // 月が暗すぎる場合はスキップ
        }
      }

      // 富士山の方向に基づいて昇る・沈むを判定
      let subType: "sunrise" | "sunset" | "rising" | "setting";
      
      if (eventType.includes("diamond")) {
        // ダイヤモンド富士の場合も富士山の方向で判定
        if (fujiAzimuth < 180) {
          // 富士山が東側（0-180度）→ 太陽も東側 → sunrise
          subType = "sunrise";
        } else {
          // 富士山が西側（180-360度）→ 太陽も西側 → sunset
          subType = "sunset";
        }
      } else {
        // パール富士の場合は富士山の方向で判定
        if (fujiAzimuth < 180) {
          // 富士山が東側（0-180度）→ 月も東側 → moonrise → rising
          subType = "rising";
        } else {
          // 富士山が西側（180-360度）→ 月も西側 → moonset → setting
          subType = "setting";
        }
      }

      events.push({
        id: `${location.id}-${timeUtils.formatDateString(date)}-${eventType}`,
        type: eventType.includes("diamond") ? "diamond" : "pearl",
        subType,
        time: bestCandidate.time,
        location: location,
        azimuth: bestCandidate.position.azimuth,
        elevation: bestCandidate.position.elevation,
        accuracy: await this.getOverallAccuracy(
          bestCandidate.azimuthDiff,
          bestCandidate.elevationDiff,
        ),
        qualityScore: await this.calculateQualityScore(
          bestCandidate.azimuthDiff,
          bestCandidate.position.elevation,
        ),
        moonPhase: bestCandidate.moonPhase,
        moonIllumination: bestCandidate.moonIllumination,
      });
    }

    return events;
  }

  /**
   * 検索時間範囲を取得
   */
  private getSearchTimeRange(
    date: Date,
    eventPhase: string,
    location: Location,
  ): { startTime: Date; endTime: Date } {
    const baseDate = new Date(date);

    switch (eventPhase) {
      case "sunrise":
        return {
          startTime: new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            4,
            0,
          ),
          endTime: new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            8,
            0,
          ),
        };
      case "sunset":
        return {
          startTime: new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            16,
            0,
          ),
          endTime: new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            20,
            0,
          ),
        };
      case "moonrise":
        return this.getMoonriseSearchRange(date, location);
      case "moonset":
        return this.getMoonsetSearchRange(date, location);
      default:
        return {
          startTime: baseDate,
          endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        };
    }
  }

  /**
   * 月の出の検索時間範囲を取得
   * 太陽・月が出ている時間で計算する（24 時間全体を検索）
   */
  private getMoonriseSearchRange(
    date: Date,
    _location: Location,
  ): { startTime: Date; endTime: Date } {
    const baseDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    );

    // 24 時間全体を検索範囲とする（月の出・月の入り時刻の制約を外す）
    return {
      startTime: baseDate,
      endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * 月の入りの検索時間範囲を取得
   * 太陽・月が出ている時間で計算する（24 時間全体を検索）
   */
  private getMoonsetSearchRange(
    date: Date,
    _location: Location,
  ): { startTime: Date; endTime: Date } {
    const baseDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    );

    // 24 時間全体を検索範囲とする（月の出・月の入り時刻の制約を外す）
    return {
      startTime: baseDate,
      endTime: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * 精度レベルを取得（DB 設定値対応）
   */
  private async getAccuracyLevel(
    azimuthDiff: number,
  ): Promise<"perfect" | "excellent" | "good" | "fair"> {
    // システム設定から精度閾値を取得
    const perfectThreshold = await this.settingsService.getNumberSetting(
      "accuracy_perfect_threshold",
      0.1,
    );
    const excellentThreshold = await this.settingsService.getNumberSetting(
      "accuracy_excellent_threshold",
      0.25,
    );
    const goodThreshold = await this.settingsService.getNumberSetting(
      "accuracy_good_threshold",
      0.4,
    );
    const fairThreshold = await this.settingsService.getNumberSetting(
      "accuracy_fair_threshold",
      0.6,
    );

    if (azimuthDiff <= perfectThreshold) return "perfect";
    if (azimuthDiff <= excellentThreshold) return "excellent";
    if (azimuthDiff <= goodThreshold) return "good";
    if (azimuthDiff <= fairThreshold) return "fair";
    return "fair"; // 許容範囲を超える（実際には除外される）
  }

  /**
   * 仰角の精度レベルを取得（DB 設定値対応）
   */
  private async getElevationAccuracyLevel(
    elevationDiff: number,
  ): Promise<"perfect" | "excellent" | "good" | "fair"> {
    // システム設定から精度閾値を取得（仰角用）
    const perfectThreshold = await this.settingsService.getNumberSetting(
      "elevation_accuracy_perfect_threshold",
      0.1,
    );
    const excellentThreshold = await this.settingsService.getNumberSetting(
      "elevation_accuracy_excellent_threshold",
      0.25,
    );
    const goodThreshold = await this.settingsService.getNumberSetting(
      "elevation_accuracy_good_threshold",
      0.4,
    );
    const fairThreshold = await this.settingsService.getNumberSetting(
      "elevation_accuracy_fair_threshold",
      0.6,
    );

    if (elevationDiff <= perfectThreshold) return "perfect";
    if (elevationDiff <= excellentThreshold) return "excellent";
    if (elevationDiff <= goodThreshold) return "good";
    if (elevationDiff <= fairThreshold) return "fair";
    return "fair"; // 許容範囲を超える（実際には除外される）
  }

  /**
   * 方位角と仰角の総合的な精度レベルを取得（DB 設定値対応）
   */
  private async getOverallAccuracy(
    azimuthDiff: number,
    elevationDiff: number,
  ): Promise<"perfect" | "excellent" | "good" | "fair"> {
    const azimuthAccuracy = await this.getAccuracyLevel(azimuthDiff);
    const elevationAccuracy =
      await this.getElevationAccuracyLevel(elevationDiff);

    // 両方の精度のうち、より低い方を総合精度とする
    const accuracyOrder = ["perfect", "excellent", "good", "fair"];
    const azimuthIndex = accuracyOrder.indexOf(azimuthAccuracy);
    const elevationIndex = accuracyOrder.indexOf(elevationAccuracy);

    return accuracyOrder[Math.max(azimuthIndex, elevationIndex)] as
      | "perfect"
      | "excellent"
      | "good"
      | "fair";
  }

  /**
   * 日の出ダイヤモンド富士が観測可能かチェック
   * 西側地域から富士山が東側（70-110 度）に見える場合のみ観測可能
   */
  private canObserveSunrise(fujiAzimuth: number): boolean {
    // 西側地域: 日の出時のダイヤモンド富士（方位角 70-130 度）
    return fujiAzimuth >= 70 && fujiAzimuth <= 130;
  }

  /**
   * 日の入りダイヤモンド富士が観測可能かチェック
   * 東側地域から富士山が西側（250-280 度）に見える場合のみ観測可能
   */
  private canObserveSunset(fujiAzimuth: number): boolean {
    // 東側地域: 日没時のダイヤモンド富士（方位角 230-280 度）
    return fujiAzimuth >= 230 && fujiAzimuth <= 280;
  }

  /**
   * 月没パール富士が観測可能かチェック
   * 富士山の西側エリア（方位角 180-360 度）では月没は見えない
   */
  private canObserveMoonset(fujiAzimuth: number): boolean {
    // 富士山が西側（180-360 度）にある場合は月没は観測不可
    // 月は東から昇って西に沈むため、富士山が西側にあると月没時に富士山の向こう側に沈む
    return fujiAzimuth < 180;
  }

  /**
   * 月の出パール富士が観測可能かチェック
   * 富士山の東側エリア（方位角 0-180 度）では月の出は見えない
   */
  private canObserveMoonrise(fujiAzimuth: number): boolean {
    // 富士山が東側（0-180 度）にある場合は月の出は観測不可
    // 月は東から昇るため、富士山が東側にあると月の出時に富士山の向こう側から昇る
    return fujiAzimuth >= 180;
  }

  /**
   * イベントタイプから subType を取得
   */
  private getSubType(
    eventType: string,
  ): "sunrise" | "sunset" | "rising" | "setting" {
    switch (eventType) {
      case "diamond_sunrise":
        return "sunrise";
      case "diamond_sunset":
        return "sunset";
      case "pearl_moonrise":
        return "rising";
      case "pearl_moonset":
        return "setting";
      default:
        return "sunrise";
    }
  }

  private async calculateQualityScore(
    azimuthDiff: number,
    elevation: number,
  ): Promise<number> {
    // 方位角精度スコア（0-50 点）
    const azimuthTolerance = await this.settingsService.getNumberSetting(
      "azimuth_tolerance",
      1.5,
    );
    const azimuthScore = Math.max(
      0,
      50 - (azimuthDiff / azimuthTolerance) * 50,
    );

    // 高度スコア（0-30 点）：高度 1 度以上で満点
    const elevationScore = Math.min(30, Math.max(0, elevation + 2) * 15);

    // 可視性スコア（0-20 点）：高度が高いほど高スコア
    const visibilityScore = Math.min(20, Math.max(0, elevation) * 2);

    return Math.round(azimuthScore + elevationScore + visibilityScore);
  }
}
