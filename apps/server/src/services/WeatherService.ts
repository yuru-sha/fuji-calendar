import { WeatherInfo } from "@fuji-calendar/types";
import { getComponentLogger, StructuredLogger } from "@fuji-calendar/utils";

/**
 * OpenMeteo API を使用した天気予報サービス
 */
export class WeatherService {
  private logger: StructuredLogger;
  private readonly apiBaseUrl = "https://api.open-meteo.com/v1/forecast";

  constructor() {
    this.logger = getComponentLogger("weather-service");
  }

  /**
   * 指定地点・日付の天気情報を取得
   */
  async getWeatherInfo(
    latitude: number,
    longitude: number,
    date: Date,
  ): Promise<WeatherInfo | undefined> {
    try {
      const now = new Date();
      const diffDays = Math.floor(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 7 日以内の未来の日付のみ対応
      if (diffDays < 0 || diffDays > 7) {
        return undefined;
      }

      // OpenMeteo API を呼び出し
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        daily: "weather_code,cloud_cover_mean,visibility_mean",
        current: "weather_code,cloud_cover,visibility",
        timezone: "Asia/Tokyo",
        forecast_days: "7",
      });

      const response = await fetch(`${this.apiBaseUrl}?${params}`);
      if (!response.ok) {
        throw new Error(`OpenMeteo API error: ${response.status}`);
      }

      const data: any = await response.json();

      // 当日の場合は現在の天気、未来の場合は該当日の予報を使用
      let weatherCode: number;
      let cloudCover: number;
      let visibility: number;

      if (diffDays === 0) {
        // 当日は現在の天気
        weatherCode = data.current?.weather_code || 0;
        cloudCover = data.current?.cloud_cover || 0;
        visibility = (data.current?.visibility || 15000) / 1000; // m を km に変換
      } else {
        // 未来の日付は日別予報
        const dayIndex = diffDays;
        weatherCode = data.daily?.weather_code?.[dayIndex] || 0;
        cloudCover = data.daily?.cloud_cover_mean?.[dayIndex] || 0;
        visibility = (data.daily?.visibility_mean?.[dayIndex] || 15000) / 1000; // m を km に変換
      }

      // 天気コードを日本語に変換
      const condition = this.mapWeatherCodeToCondition(weatherCode);

      // 撮影条件を判定
      const recommendation = this.calculateRecommendation(
        condition,
        cloudCover,
        visibility,
      );

      this.logger.debug("天気情報取得完了", {
        latitude,
        longitude,
        date: date.toISOString().split("T")[0],
        weatherCode,
        condition,
        cloudCover,
        visibility: Math.round(visibility),
        recommendation,
      });

      return {
        condition,
        cloudCover,
        visibility: Math.round(visibility),
        recommendation,
      };
    } catch (error) {
      this.logger.error("天気情報取得エラー", error, {
        latitude,
        longitude,
        date: date.toISOString().split("T")[0],
      });
      return undefined;
    }
  }

  /**
   * WMO 天気コードを日本語の天候に変換
   * https://open-meteo.com/en/docs
   */
  private mapWeatherCodeToCondition(code: number): string {
    switch (code) {
      case 0:
        return "晴れ";
      case 1:
        return "概ね晴れ";
      case 2:
        return "一部曇り";
      case 3:
        return "曇り";
      case 45:
      case 48:
        return "霧";
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return "小雨";
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
        return "雨";
      case 71:
      case 73:
      case 75:
      case 77:
        return "雪";
      case 80:
      case 81:
      case 82:
        return "にわか雨";
      case 85:
      case 86:
        return "にわか雪";
      case 95:
      case 96:
      case 99:
        return "雷雨";
      default:
        return "不明";
    }
  }

  /**
   * 撮影条件を判定
   */
  private calculateRecommendation(
    condition: string,
    cloudCover: number,
    visibility: number,
  ): "excellent" | "good" | "fair" | "poor" {
    // 雨・雲・雷雨は撮影困難
    if (
      condition.includes("雨") ||
      condition.includes("雪") ||
      condition.includes("雷")
    ) {
      return "poor";
    }

    // 霧は視界不良
    if (condition === "霧") {
      return "poor";
    }

    // 晴れで雲量少なく、視界良好
    if (
      (condition === "晴れ" || condition === "概ね晴れ") &&
      cloudCover < 30 &&
      visibility > 15
    ) {
      return "excellent";
    }

    // 晴れ系または雲量少な目の曇り
    if (
      condition === "晴れ" ||
      condition === "概ね晴れ" ||
      condition === "一部曇り" ||
      (condition === "曇り" && cloudCover < 50)
    ) {
      return visibility > 10 ? "good" : "fair";
    }

    // 曇り
    if (condition === "曇り") {
      return visibility > 10 ? "fair" : "poor";
    }

    return "fair";
  }
}

// シングルトンインスタンス
export const weatherService = new WeatherService();
