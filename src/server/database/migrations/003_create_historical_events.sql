-- 過去データ用テーブルの作成
-- 長期保存用の圧縮されたイベントデータ

CREATE TABLE IF NOT EXISTS historical_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('diamond', 'pearl')),
  sub_type TEXT NOT NULL CHECK (sub_type IN ('sunrise', 'sunset')),
  event_time TEXT NOT NULL, -- ISO 8601 format in JST
  azimuth REAL NOT NULL,
  elevation REAL NOT NULL,
  moon_phase REAL, -- パール富士の場合のみ (0-1, 1が満月)
  weather_condition TEXT, -- 実際の天候記録（オプション）
  visibility_rating INTEGER, -- 視界評価 1-5 (オプション)
  photo_success_reported BOOLEAN DEFAULT FALSE, -- 撮影成功報告があったか
  calculation_accuracy REAL DEFAULT 1.0, -- 計算精度評価
  data_source TEXT DEFAULT 'calculated', -- 'calculated', 'observed', 'reported'
  notes TEXT, -- 追加情報
  archived_at DATETIME DEFAULT (datetime('now', '+9 hours')),
  created_at DATETIME DEFAULT (datetime('now', '+9 hours'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_historical_events_location_year ON historical_events(location_id, year);
CREATE INDEX IF NOT EXISTS idx_historical_events_date ON historical_events(year, month, day);
CREATE INDEX IF NOT EXISTS idx_historical_events_type ON historical_events(event_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_historical_events_success ON historical_events(photo_success_reported);

-- 統計用ビュー
CREATE VIEW IF NOT EXISTS historical_events_stats AS
SELECT 
  location_id,
  year,
  event_type,
  sub_type,
  COUNT(*) as total_events,
  COUNT(CASE WHEN photo_success_reported = TRUE THEN 1 END) as successful_photos,
  ROUND(
    CAST(COUNT(CASE WHEN photo_success_reported = TRUE THEN 1 END) AS FLOAT) / COUNT(*) * 100, 
    2
  ) as success_rate_percent,
  AVG(visibility_rating) as avg_visibility,
  MIN(event_time) as earliest_event,
  MAX(event_time) as latest_event
FROM historical_events
GROUP BY location_id, year, event_type, sub_type;

-- 月別集計ビュー
CREATE VIEW IF NOT EXISTS monthly_historical_summary AS
SELECT 
  location_id,
  year,
  month,
  event_type,
  COUNT(*) as event_count,
  COUNT(CASE WHEN photo_success_reported = TRUE THEN 1 END) as success_count,
  AVG(visibility_rating) as avg_visibility,
  GROUP_CONCAT(day, ',') as event_days
FROM historical_events
GROUP BY location_id, year, month, event_type
ORDER BY location_id, year, month;