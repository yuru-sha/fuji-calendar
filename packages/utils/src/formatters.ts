/**
 * 共通フォーマッター関数
 */

/**
 * 数値を日本語の単位付きでフォーマット
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}千`;
  }
  return num.toString();
}

/**
 * 距離をフォーマット（km単位）
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 100) {
    return `${Math.round(km)}km`;
  } else if (km >= 10) {
    return `${km.toFixed(1)}km`;
  } else {
    return `${km.toFixed(2)}km`;
  }
}

/**
 * 角度をフォーマット（度単位）
 */
export function formatAngle(degrees: number): string {
  return `${degrees.toFixed(1)}°`;
}

/**
 * 標高をフォーマット
 */
export function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`;
}

/**
 * パーセンテージをフォーマット
 */
export function formatPercentage(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * 月の満ち欠けをフォーマット
 */
export function formatMoonPhase(phase: number): string {
  if (phase < 0.1) return "新月";
  if (phase < 0.3) return "三日月";
  if (phase < 0.4) return "上弦の月";
  if (phase < 0.6) return "十三夜月";
  if (phase < 0.9) return "満月";
  return "下弦の月";
}

/**
 * 品質スコアをフォーマット
 */
export function formatQualityScore(score?: number): string {
  if (!score) return "未評価";
  if (score >= 0.9) return "最高";
  if (score >= 0.8) return "優秀";
  if (score >= 0.7) return "良好";
  if (score >= 0.6) return "普通";
  return "要注意";
}

/**
 * 都道府県名を短縮形にフォーマット
 */
export function formatPrefecture(prefecture: string): string {
  return prefecture.replace(/[都道府県]$/, "");
}

/**
 * 座標をフォーマット（度分秒形式）
 */
export function formatCoordinates(lat: number, lng: number): string {
  const formatDMS = (coord: number, isLatitude: boolean): string => {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;

    const direction = isLatitude
      ? coord >= 0
        ? "N"
        : "S"
      : coord >= 0
        ? "E"
        : "W";

    return `${degrees}°${minutes}'${seconds.toFixed(1)}"${direction}`;
  };

  return `${formatDMS(lat, true)}, ${formatDMS(lng, false)}`;
}

/**
 * ファイルサイズをフォーマット
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * 期間をフォーマット（ミリ秒から人間が読みやすい形式へ）
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}分`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)}時間`;
}
