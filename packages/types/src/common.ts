/**
 * プロジェクト全体で共通使用される基本型定義
 * 循環依存を避けるため、他のファイルからインポートされる基本型のみを含む
 */

/**
 * 基本的な Location 型（循環依存回避用）
 */
export interface BaseLocation {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string | null;
  accessInfo?: string | null;
  warnings?: string;
  parkingInfo?: string | null;
  fujiAzimuth?: number | null;
  fujiElevation?: number | null;
  fujiDistance?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 基本的な FujiEvent 型（循環依存回避用）
 */
export interface BaseFujiEvent {
  id: string;
  type: "diamond" | "pearl";
  subType: "sunrise" | "sunset" | "rising" | "setting";
  time: Date;
  azimuth: number;
  elevation?: number;
  qualityScore?: number;
  accuracy?: "perfect" | "excellent" | "good" | "fair";
  moonPhase?: number;
  moonIllumination?: number;
}

/**
 * 天体計算の結果精度
 */
export type CalculationAccuracy = "perfect" | "excellent" | "good" | "fair";

/**
 * イベントタイプ
 */
export type EventType = "diamond" | "pearl";

/**
 * イベントサブタイプ
 */
export type EventSubType = "sunrise" | "sunset" | "rising" | "setting";

/**
 * 富士山の座標定数（お鉢中央）
 * お鉢（火口）中央の座標: 35°21'46.08" N, 138°43'50.81" E
 * ダイヤモンド富士・パール富士の視覚的な基準点として使用
 */
export const FUJI_COORDINATES = {
  latitude: 35.3628, // 35°21'46.08" = 35.362800°
  longitude: 138.730781, // 138°43'50.81" = 138.730781°
  elevation: 3776, // 富士山山頂の標高
} as const;

/**
 * JST 関連定数
 */
export const JST_TIMEZONE = "Asia/Tokyo";
export const JST_OFFSET = 9; // UTC+9

/**
 * 天気推奨度
 */
export type WeatherRecommendation = "excellent" | "good" | "fair" | "poor";

/**
 * エラー型
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
}

/**
 * API エラー
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}
