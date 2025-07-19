-- 事前計算イベントキャッシュテーブル
-- パフォーマンス向上のため、天体計算結果を事前に計算して保存

CREATE TABLE IF NOT EXISTS events_cache (
    -- 主キー（複合）
    cache_key TEXT PRIMARY KEY,
    
    -- 期間情報
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NULL,
    
    -- 地点情報
    location_id INTEGER NOT NULL,
    
    -- イベントデータ（JSON形式）
    events_data TEXT NOT NULL, -- FujiEvent[]をJSONシリアライズ
    
    -- メタデータ
    event_count INTEGER NOT NULL DEFAULT 0,
    calculation_duration_ms INTEGER, -- 計算にかかった時間
    
    -- キャッシュ管理
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_valid BOOLEAN DEFAULT 1,
    
    -- 外部キー制約
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- インデックス作成（高速検索用）
CREATE INDEX IF NOT EXISTS idx_events_cache_year_month 
    ON events_cache(year, month);

CREATE INDEX IF NOT EXISTS idx_events_cache_location 
    ON events_cache(location_id);

CREATE INDEX IF NOT EXISTS idx_events_cache_date 
    ON events_cache(year, month, day);

CREATE INDEX IF NOT EXISTS idx_events_cache_expires 
    ON events_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_events_cache_valid 
    ON events_cache(is_valid) WHERE is_valid = 1;

-- 複合インデックス（最重要：月間カレンダー取得用）
CREATE INDEX IF NOT EXISTS idx_events_cache_monthly 
    ON events_cache(year, month, is_valid, expires_at);

-- 日次取得用複合インデックス
CREATE INDEX IF NOT EXISTS idx_events_cache_daily 
    ON events_cache(year, month, day, location_id, is_valid);

-- 月間集計ビュー（オプション：さらなる高速化）
CREATE VIEW IF NOT EXISTS monthly_events_summary AS
SELECT 
    year,
    month,
    location_id,
    COUNT(*) as total_cache_entries,
    SUM(event_count) as total_events,
    MIN(created_at) as oldest_cache,
    MAX(updated_at) as newest_cache,
    AVG(calculation_duration_ms) as avg_calculation_time
FROM events_cache 
WHERE is_valid = 1 AND expires_at > CURRENT_TIMESTAMP
GROUP BY year, month, location_id;

-- 自動クリーンアップ用のトリガー（期限切れキャッシュの削除）
CREATE TRIGGER IF NOT EXISTS cleanup_expired_cache
    AFTER INSERT ON events_cache
    WHEN NEW.expires_at < CURRENT_TIMESTAMP
BEGIN
    DELETE FROM events_cache 
    WHERE expires_at < datetime('now', '-1 day');
END;