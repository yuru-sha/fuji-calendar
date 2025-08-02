import {
  Location,
  FujiEvent,
  SunPosition,
  MoonPosition,
} from "../../shared";

/**
 * 天体計算インターフェース
 * ダイヤモンド富士・パール富士の計算を抽象化
 */
export interface AstronomicalCalculator {
  /**
   * ダイヤモンド富士イベントを計算
   */
  calculateDiamondFuji(date: Date, locations: Location[]): Promise<FujiEvent[]>;

  /**
   * パール富士イベントを計算
   */
  calculatePearlFuji(date: Date, locations: Location[]): Promise<FujiEvent[]>;

  /**
   * 月間イベントを計算
   */
  calculateMonthlyEvents(
    year: number,
    month: number,
    locations: Location[],
  ): Promise<FujiEvent[]>;

  /**
   * 特定地点の年間イベントを計算
   */
  calculateLocationYearlyEvents(
    location: Location,
    year: number,
  ): Promise<FujiEvent[]>;

  /**
   * 太陽の位置を取得
   */
  getSunPosition(
    date: Date,
    latitude: number,
    longitude: number,
  ): SunPosition | null;

  /**
   * 月の位置を取得
   */
  getMoonPosition(
    date: Date,
    latitude: number,
    longitude: number,
  ): MoonPosition | null;

  /**
   * 撮影地点から富士山への方位角を計算
   */
  calculateAzimuthToFuji(fromLocation: Location): number;

  /**
   * 撮影地点から富士山頂への仰角を計算
   */
  calculateElevationToFuji(fromLocation: Location): number;

  /**
   * 天体が可視範囲にあるかチェック
   */
  isVisible(
    fromLocation: Location,
    targetAzimuth: number,
    celestialBody?: "sun" | "moon",
  ): boolean;

  /**
   * ダイヤモンド富士の観測期間かチェック
   */
  isDiamondFujiSeason(date: Date, location: Location): boolean;

  /**
   * 太陽の最大仰角を取得
   */
  getSunMaxElevation(date: Date, location: Location): number;

  /**
   * ダイヤモンド富士の観測期間メッセージを取得
   */
  getDiamondFujiSeasonMessage(date: Date, location: Location): string | null;

  /**
   * 月相が観測に適しているかチェック
   */
  isVisibleMoonPhase(date: Date): boolean;
}

/**
 * 天体計算の依存関係インターフェース
 */
export interface AstronomicalCalculatorDependencies {
  coordinateCalculator: CoordinateCalculator;
  celestialPositionCalculator: CelestialPositionCalculator;
  fujiAlignmentCalculator: FujiAlignmentCalculator;
  seasonCalculator: SeasonCalculator;
}

/**
 * 座標計算インターフェース
 */
export interface CoordinateCalculator {
  calculateAzimuth(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number;
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number;
  calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number;
}

/**
 * 天体位置計算インターフェース
 */
export interface CelestialPositionCalculator {
  getSunPosition(
    date: Date,
    latitude: number,
    longitude: number,
  ): SunPosition | null;
  getMoonPosition(
    date: Date,
    latitude: number,
    longitude: number,
  ): MoonPosition | null;
  calculateSunTimes(
    date: Date,
    latitude: number,
    longitude: number,
  ): {
    sunrise: Date | null;
    sunset: Date | null;
    solarNoon: Date | null;
  };
}

/**
 * 富士山アライメント計算インターフェース
 */
export interface FujiAlignmentCalculator {
  calculateElevationToFuji(fromLocation: Location): number;
  isAlignedWithFuji(
    date: Date,
    location: Location,
    celestialBody: "sun" | "moon",
  ): boolean;
  calculateOptimalViewingTime(
    date: Date,
    location: Location,
    eventType: "diamond" | "pearl",
  ): Date | null;
}

/**
 * 季節計算インターフェース
 */
export interface SeasonCalculator {
  isDiamondFujiSeason(date: Date, location: Location): boolean;
  getPearlFujiVisibility(date: Date): number; // 0-1
  getSeasonMessage(date: Date, location: Location): string | null;
}
