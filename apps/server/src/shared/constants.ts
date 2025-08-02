/**
 * 富士山の座標定数（お鉢中央）
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