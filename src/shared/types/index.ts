// 共通型定義

export interface Location {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string;
  accessInfo?: string;
  warnings?: string;
  // 富士山への事前計算値（高速化のため）
  fujiAzimuth?: number;    // 富士山への方位角（度）
  fujiElevation?: number;  // 富士山頂への仰角（度）
  fujiDistance?: number;   // 富士山までの距離（km）
  createdAt: Date;
  updatedAt: Date;
}

export interface FujiEvent {
  id: string;
  type: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset' | 'rising' | 'setting';
  time: Date;
  location: Location;
  azimuth: number;
  elevation?: number;
}

export interface CalendarEvent {
  date: Date;
  type: 'diamond' | 'pearl' | 'both';
  events: FujiEvent[];
}

// API response用の型（日付文字列版）
export interface CalendarEventResponse {
  date: string;
  type: 'diamond' | 'pearl' | 'both';
  events: FujiEventResponse[];
  diamondFujiSeason?: boolean; // ダイヤモンド富士の観測期間かどうか
  seasonMessage?: string; // 観測期間外の場合のメッセージ
}

export interface FujiEventResponse {
  id: string;
  type: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset' | 'rising' | 'setting';
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
  eventType: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset';
  eventTime: Date;
  azimuth: number;
  elevation: number;
  moonPhase?: number; // パール富士の場合のみ
  weatherCondition?: string;
  visibilityRating?: number; // 1-5
  photoSuccessReported: boolean;
  calculationAccuracy: number;
  dataSource: 'calculated' | 'observed' | 'reported';
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
  eventType: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset';
  eventTime: string;
  azimuth: number;
  elevation: number;
  moonPhase?: number;
  weatherCondition?: string;
  visibilityRating?: number;
  photoSuccessReported: boolean;
  calculationAccuracy: number;
  dataSource: 'calculated' | 'observed' | 'reported';
  notes?: string;
  archivedAt: string;
  createdAt: string;
}

export interface HistoricalStats {
  locationId: number;
  year: number;
  eventType: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset';
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
  eventType: 'diamond' | 'pearl';
  eventCount: number;
  successCount: number;
  avgVisibility: number;
  eventDays: number[];
}

export interface HistoricalSearchOptions {
  locationId?: number;
  yearStart?: number;
  yearEnd?: number;
  eventType?: 'diamond' | 'pearl';
  subType?: 'sunrise' | 'sunset';
  photoSuccessOnly?: boolean;
  minVisibility?: number;
  dataSource?: 'calculated' | 'observed' | 'reported';
  limit?: number;
  offset?: number;
}

export interface Admin {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin?: Date;
  failedLoginCount: number;
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
  processedBy?: number;
}

export interface WeatherInfo {
  condition: string;
  cloudCover: number;
  visibility: number;
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
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
  weather?: WeatherInfo;
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
  warnings?: string;
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
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
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
  sunrise: Date;
  sunset: Date;
}

export interface MoonPosition {
  azimuth: number;
  elevation: number;
  moonrise: Date;
  moonset: Date;
  phase: number; // 0-1 (0: 新月, 0.5: 満月)
}

// 富士山の座標定数（剣ヶ峰）
export const FUJI_COORDINATES = {
  latitude: 35.3606,
  longitude: 138.7274,
  elevation: 3776  // 剣ヶ峰の標高
} as const;

// JST関連定数
export const JST_TIMEZONE = 'Asia/Tokyo';
export const JST_OFFSET = 9; // UTC+9