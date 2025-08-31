import { getComponentLogger } from "@fuji-calendar/utils";
import { injectable } from "tsyringe";

/**
 * 季節・可視性判定を担当するクラス
 * ダイアモンド富士の撮影シーズン判定
 */
@injectable()
export class SeasonCalculator {
  private logger = getComponentLogger("SeasonCalculator");

  /**
   * ダイアモンド富士の撮影シーズンかを判定
   */
  isDiamondFujiSeason(date: Date): boolean {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // 冬季シーズン：12 月中旬～1 月上旬（年末年始）
    const winterStartThisYear = this.createDateInYear(
      date.getFullYear(),
      12,
      15,
    );
    const winterEndThisYear = this.createDateInYear(date.getFullYear(), 12, 31);
    const winterStartNextYear = this.createDateInYear(date.getFullYear(), 1, 1);
    const winterEndNextYear = this.createDateInYear(date.getFullYear(), 1, 10);

    // 春季シーズン：2 月中旬～4 月末
    const springStart = this.createDateInYear(date.getFullYear(), 2, 15);
    const springEnd = this.createDateInYear(date.getFullYear(), 4, 30);

    // 夏季シーズン：6 月中旬～7 月上旬
    const summerStart = this.createDateInYear(date.getFullYear(), 6, 15);
    const summerEnd = this.createDateInYear(date.getFullYear(), 7, 10);

    // 秋季シーズン：8 月中旬～10 月末
    const autumnStart = this.createDateInYear(date.getFullYear(), 8, 15);
    const autumnEnd = this.createDateInYear(date.getFullYear(), 10, 31);

    const currentDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const isWinterSeason =
      (currentDate >= winterStartThisYear &&
        currentDate <= winterEndThisYear) ||
      (currentDate >= winterStartNextYear && currentDate <= winterEndNextYear);
    const isSpringSeason =
      currentDate >= springStart && currentDate <= springEnd;
    const isSummerSeason =
      currentDate >= summerStart && currentDate <= summerEnd;
    const isAutumnSeason =
      currentDate >= autumnStart && currentDate <= autumnEnd;

    this.logger.debug("ダイアモンド富士シーズン判定", {
      date: date.toISOString().split("T")[0],
      month,
      day,
      isWinterSeason,
      isSpringSeason,
      isSummerSeason,
      isAutumnSeason,
      isDiamondSeason:
        isWinterSeason || isSpringSeason || isSummerSeason || isAutumnSeason,
    });

    return isWinterSeason || isSpringSeason || isSummerSeason || isAutumnSeason;
  }

  /**
   * ダイアモンド富士シーズンメッセージを取得
   */
  getDiamondFujiSeasonMessage(date: Date): string {
    if (!this.isDiamondFujiSeason(date)) {
      return "ダイアモンド富士の撮影シーズンではありません（12 月中旬～1 月上旬、2 月中旬～4 月末、6 月中旬～7 月上旬、8 月中旬～10 月末が最適）";
    }

    const month = date.getMonth() + 1;
    if (month >= 2 && month <= 4) {
      return "春のダイアモンド富士シーズンです（日の出時刻）";
    } else if (month >= 8 && month <= 10) {
      return "秋のダイアモンド富士シーズンです（日の入り時刻）";
    }

    return "ダイアモンド富士の撮影に適した時期です";
  }

  /**
   * 年内の指定月日の Date オブジェクトを作成
   */
  private createDateInYear(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
  }

  /**
   * 月相による撮影適性を判定
   */
  isFavorableLunarCondition(moonIllumination: number): boolean {
    // 月の照度が 30% 以上で撮影に適している
    return moonIllumination >= 0.3;
  }


  /**
   * 総合的な撮影条件を評価
   */
  evaluateShootingConditions(
    date: Date,
    moonIllumination?: number,
    _cloudCover?: number,
    _visibility?: number,
  ): {
    rating: "excellent" | "good" | "fair" | "poor";
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    // シーズン判定（最重要）
    if (this.isDiamondFujiSeason(date)) {
      score += 40;
      reasons.push("ダイアモンド富士シーズン");
    } else {
      reasons.push("シーズン外");
    }

    // 月相判定（パール富士の場合）
    if (moonIllumination !== undefined) {
      if (this.isFavorableLunarCondition(moonIllumination)) {
        score += 30;
        reasons.push("良好な月相");
      } else {
        reasons.push("月が暗い");
      }
    } else {
      score += 20; // ダイアモンド富士の場合は月相を考慮しない
    }


    // 評価判定
    let rating: "excellent" | "good" | "fair" | "poor";
    if (score >= 85) {
      rating = "excellent";
    } else if (score >= 65) {
      rating = "good";
    } else if (score >= 40) {
      rating = "fair";
    } else {
      rating = "poor";
    }

    return { rating, reasons };
  }
}
