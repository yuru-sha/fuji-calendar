// JST時刻処理ユーティリティ

export const JST_TIMEZONE = 'Asia/Tokyo';
export const JST_OFFSET = 9; // UTC+9

export interface TimeUtils {
  // 現在のJST時刻を取得
  getCurrentJst(): Date;
  // JST時刻の文字列フォーマット
  formatJstTime(date: Date): string; // "4時33分" 形式
  // データベース保存用JST時刻
  toJstForStorage(date: Date): Date;
  // JST文字列をDateオブジェクトに変換
  parseJstString(jstString: string): Date;
  // UTCからJSTに変換
  utcToJst(utcDate: Date): Date;
  // JSTからUTCに変換
  jstToUtc(jstDate: Date): Date;
}

export class TimeUtilsImpl implements TimeUtils {
  getCurrentJst(): Date {
    return new Date(new Date().toLocaleString("en-US", {timeZone: JST_TIMEZONE}));
  }
  
  formatJstTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}時${minutes.toString().padStart(2, '0')}分`;
  }
  
  toJstForStorage(date: Date): Date {
    // JST時刻として保存
    return new Date(date.toLocaleString("en-US", {timeZone: JST_TIMEZONE}));
  }
  
  parseJstString(jstString: string): Date {
    // "2025-01-19 04:33:00" 形式のJST文字列をDateに変換
    // JST文字列をUTC Dateオブジェクトとして解釈し、その後JSTとして扱う
    const date = new Date(jstString + ' UTC');
    return this.utcToJst(date);
  }

  utcToJst(utcDate: Date): Date {
    // UTCの時刻にJSTオフセット（9時間）を加算
    return new Date(utcDate.getTime() + JST_OFFSET * 60 * 60 * 1000);
  }

  jstToUtc(jstDate: Date): Date {
    // JSTの時刻からJSTオフセット（9時間）を減算
    return new Date(jstDate.getTime() - JST_OFFSET * 60 * 60 * 1000);
  }

  // 日付を YYYY-MM-DD 形式の文字列に変換
  formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 日付を YYYY-MM-DD HH:mm:ss 形式の文字列に変換
  formatDateTimeString(date: Date): string {
    const dateStr = this.formatDateString(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  }

  // 時刻を HH:mm:ss 形式の文字列に変換
  formatTimeString(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // 月の最初の日を取得
  getMonthStart(year: number, month: number): Date {
    return new Date(year, month - 1, 1);
  }

  // 月の最後の日を取得
  getMonthEnd(year: number, month: number): Date {
    return new Date(year, month, 0);
  }

  // 日付が同じ日かどうかを判定
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // 日付が範囲内かどうかを判定
  isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  // 相対的な時刻表示（"1時間前"、"明日"など）
  getRelativeTimeString(date: Date, referenceDate?: Date): string {
    const ref = referenceDate || this.getCurrentJst();
    const diffMs = date.getTime() - ref.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffHours) < 1) {
      return 'まもなく';
    } else if (Math.abs(diffHours) < 24) {
      if (diffHours > 0) {
        return `${diffHours}時間後`;
      } else {
        return `${Math.abs(diffHours)}時間前`;
      }
    } else {
      if (diffDays === 1) {
        return '明日';
      } else if (diffDays === -1) {
        return '昨日';
      } else if (diffDays > 1) {
        return `${diffDays}日後`;
      } else {
        return `${Math.abs(diffDays)}日前`;
      }
    }
  }
}

// シングルトンインスタンス
export const timeUtils = new TimeUtilsImpl();