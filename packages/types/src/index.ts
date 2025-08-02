// 共通型定義をインポート
export * from "./common";

// 詳細な Location インターフェース
export interface Location {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string | null;
  accessInfo?: string | null;
  parkingInfo?: string | null; // 駐車場情報
  // 富士山への事前計算値（高速化のため）
  fujiAzimuth?: number | null; // 富士山への方位角（度）
  fujiElevation?: number | null; // 富士山頂への仰角（度）
  fujiDistance?: number | null; // 富士山までの距離（km）
  measurementNotes?: string | null; // 測定メモ（ユーザー入力）
  createdAt: Date;
  updatedAt: Date;
}

export interface FujiEvent {
  id: string;
  type: "diamond" | "pearl";
  subType: "sunrise" | "sunset" | "rising" | "setting";
  time: Date;
  location: Location;
  azimuth: number;
  elevation?: number;
  qualityScore?: number;
  accuracy?: "perfect" | "excellent" | "good" | "fair";
  moonPhase?: number;
  moonIllumination?: number;
}

export interface CalendarEvent {
  date: Date;
  type: "diamond" | "pearl" | "both";
  events: FujiEvent[];
}

// API response 用の型（日付文字列版）
export interface CalendarEventResponse {
  date: string;
  type: "diamond" | "pearl" | "both";
  events: FujiEventResponse[];
  diamondFujiSeason?: boolean; // ダイヤモンド富士の観測期間かどうか
  seasonMessage?: string; // 観測期間外の場合のメッセージ
}

export interface FujiEventResponse {
  id: string;
  type: "diamond" | "pearl";
  subType: "sunrise" | "sunset" | "rising" | "setting";
  time: string;
  location: Location;
  azimuth: number;
  elevation?: number;
}

// 過去データ用の型定義
export interface HistoricalEvent {
  id: number;
  locationId: number;
  year: number;
  month: number;
  day: number;
  eventType: "diamond" | "pearl";
  subType: "sunrise" | "sunset";
  eventTime: Date;
  azimuth: number;
  elevation: number;
  moonPhase?: number; // パール富士の場合のみ
  visibilityRating?: number; // 1-5
  photoSuccessReported: boolean;
  calculationAccuracy: number;
  dataSource: "calculated" | "observed" | "reported";
  notes?: string;
  archivedAt: Date;
  createdAt: Date;
}

export interface HistoricalEventResponse {
  id: number;
  locationId: number;
  year: number;
  month: number;
  day: number;
  eventType: "diamond" | "pearl";
  subType: "sunrise" | "sunset";
  eventTime: string;
  azimuth: number;
  elevation: number;
  moonPhase?: number;
  visibilityRating?: number;
  photoSuccessReported: boolean;
  calculationAccuracy: number;
  dataSource: "calculated" | "observed" | "reported";
  notes?: string;
  archivedAt: string;
  createdAt: string;
}

export interface HistoricalStats {
  locationId: number;
  year: number;
  eventType: "diamond" | "pearl";
  subType: "sunrise" | "sunset";
  totalEvents: number;
  successfulPhotos: number;
  successRatePercent: number;
  avgVisibility: number;
  earliestEvent: string;
  latestEvent: string;
}

export interface MonthlyHistoricalSummary {
  locationId: number;
  year: number;
  month: number;
  eventType: "diamond" | "pearl";
  eventCount: number;
  successCount: number;
  avgVisibility: number;
  eventDays: number[];
}

export interface HistoricalSearchOptions {
  locationId?: number;
  yearStart?: number;
  yearEnd?: number;
  eventType?: "diamond" | "pearl";
  subType?: "sunrise" | "sunset";
  photoSuccessOnly?: boolean;
  minVisibility?: number;
  dataSource?: "calculated" | "observed" | "reported";
  limit?: number;
  offset?: number;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  failedLoginCount?: number;
  lockedUntil?: Date;
}

export interface LocationRequest {
  id: number;
  name: string;
  prefecture: string;
  description: string;
  suggestedLatitude?: number;
  suggestedLongitude?: number;
  requesterIp: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  processedAt?: Date;
  processedBy?: number;
}


// API レスポンス型
export interface CalendarResponse {
  year: number;
  month: number;
  events: CalendarEvent[];
}

export interface EventsResponse {
  date: string;
  events: FujiEvent[];
}

export interface LocationsResponse {
  locations: Location[];
}

// API リクエスト型
export interface CreateLocationRequest {
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string;
  accessInfo?: string;
  fujiAzimuth?: number;
  fujiElevation?: number;
  fujiDistance?: number;
  measurementNotes?: string;
}

export interface LocationRequestBody {
  name: string;
  prefecture: string;
  description: string;
  suggestedCoordinates?: {
    latitude: number;
    longitude: number;
  };
  captchaToken: string;
}

// 認証関連型
export interface AuthResult {
  success: boolean;
  token?: string;
  admin?: Admin;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// エラー型
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

// 天体計算関連型
export interface SunPosition {
  azimuth: number;
  elevation: number;
  distance: number; // 地球からの距離（AU 単位）
}

export interface MoonPosition {
  azimuth: number;
  elevation: number;
  distance: number; // 地球からの距離（AU 単位）
  phase: number; // 0-1 (0: 新月, 0.5: 満月)
  illumination: number; // 照度（0-1）
}

// 富士山座標と JST 定数は common.ts から継承

// 統計関連型
export interface MonthlyStats {
  month: number;
  totalEvents: number;
  diamondEvents: number;
  pearlEvents: number;
}

export interface CalendarStats {
  year: number;
  totalEvents: number;
  diamondEvents: number;
  pearlEvents: number;
  activeLocations: number;
  monthlyBreakdown?: MonthlyStats[];
}

// お気に入り機能関連の型定義
export interface FavoriteLocation {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  addedAt: string; // ISO 文字列
}

export interface FavoriteEvent {
  id: string;
  type: "diamond" | "pearl";
  subType: string;
  time: string; // ISO 文字列
  locationId: number;
  locationName: string;
  azimuth: number;
  elevation: number;
  addedAt: string; // ISO 文字列
}

export interface Favorites {
  locations: FavoriteLocation[];
  events: FavoriteEvent[];
}

// システム設定関連型
export interface SystemSetting {
  id: number;
  settingKey: string;
  settingType: "number" | "string" | "boolean";
  numberValue?: number | null;
  stringValue?: string | null;
  booleanValue?: boolean | null;
  description?: string | null;
  category: string;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
}

// キャッシュ関連の型定義をエクスポート
export * from "./cache";
