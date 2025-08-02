/**
 * 統合型定義（モノレポ複雑性削減版）
 * 全ての型定義を直接定義してパッケージ依存を回避
 */

/**
 * 基本的な Location 型
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
 * Location 型（BaseLocation と同一）
 */
export interface Location extends BaseLocation {}

/**
 * 地点作成リクエスト型
 */
export interface CreateLocationRequest {
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string | null;
  accessInfo?: string | null;
  warnings?: string;
  parkingInfo?: string | null;
  measurementNotes?: string | null;
}

/**
 * 基本的な FujiEvent 型
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
 * FujiEvent 型（BaseFujiEvent と同一）
 */
export interface FujiEvent extends BaseFujiEvent {}

/**
 * カレンダーイベント型
 */
export interface CalendarEvent {
  date: string;
  events: FujiEvent[];
  count: number;
  hasEvents: boolean;
}

/**
 * カレンダー統計型
 */
export interface CalendarStats {
  totalEvents: number;
  diamondEvents: number;
  pearlEvents: number;
  locations: number;
  averageEventsPerDay: number;
}

/**
 * 天体位置型
 */
export interface SunPosition {
  azimuth: number;
  elevation: number;
  time: Date;
}

export interface MoonPosition {
  azimuth: number;
  elevation: number;
  time: Date;
  phase: number;
  illumination: number;
}

/**
 * 管理者型
 */
export interface Admin {
  id: number;
  username: string;
  passwordHash: string;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * システム設定型
 */
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
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