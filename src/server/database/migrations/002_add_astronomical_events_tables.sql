-- ダイヤモンド富士・パール富士カレンダー: 天文イベント中間データテーブル
-- 実行日: 2025-07-23

-- 1. 太陽イベントテーブル（日の出・日の入り・春分・秋分）
CREATE TABLE IF NOT EXISTS solar_events (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('sunrise', 'sunset', 'spring_equinox', 'autumn_equinox', 'summer_solstice', 'winter_solstice')),
    event_time TIMESTAMPTZ NOT NULL,
    -- 太陽位置データ
    azimuth DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    declination DOUBLE PRECISION, -- 赤緯（春分・秋分で重要）
    equation_of_time DOUBLE PRECISION, -- 均時差
    -- メタデータ  
    is_seasonal_marker BOOLEAN DEFAULT false, -- 春分・秋分・至点のマーカー
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 2. 月イベントテーブル（月の出・月の入り・月相）
CREATE TABLE IF NOT EXISTS lunar_events (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('moonrise', 'moonset', 'new_moon', 'first_quarter', 'full_moon', 'last_quarter')),
    event_time TIMESTAMPTZ NOT NULL,
    -- 月位置データ
    azimuth DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    phase DOUBLE PRECISION NOT NULL, -- 月相 (0.0-1.0)
    illumination DOUBLE PRECISION NOT NULL, -- 輝面比
    distance_km DOUBLE PRECISION, -- 地球からの距離
    -- 月の軌道データ
    age_days DOUBLE PRECISION, -- 月齢（日）
    angular_diameter DOUBLE PRECISION, -- 視直径（角秒）
    is_supermoon BOOLEAN DEFAULT false, -- スーパームーンフラグ
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 3. 富士現象候補テーブル（事前フィルタリング済み）
CREATE TABLE IF NOT EXISTS fuji_phenomena_candidates (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    event_date DATE NOT NULL,
    phenomenon_type VARCHAR(20) NOT NULL CHECK (phenomenon_type IN ('diamond_sunrise', 'diamond_sunset', 'pearl_rise', 'pearl_set', 'pearl_transit')),
    -- 時間範囲（地点によって微調整が必要）
    time_window_start TIMESTAMPTZ NOT NULL,
    time_window_end TIMESTAMPTZ NOT NULL,
    optimal_time TIMESTAMPTZ NOT NULL, -- 最適観測時刻
    -- 天体データ
    celestial_azimuth DOUBLE PRECISION NOT NULL,
    celestial_altitude DOUBLE PRECISION NOT NULL,
    -- 品質指標
    visibility_score DOUBLE PRECISION, -- 観測条件スコア(0-1)
    moon_illumination DOUBLE PRECISION, -- 月の場合のみ
    weather_favorability DOUBLE PRECISION, -- 気象条件（将来拡張用）
    -- メタデータ
    is_seasonal_special BOOLEAN DEFAULT false, -- 春分・秋分近辺のフラグ
    notes TEXT, -- 特記事項
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 4. 季節マーカーテーブル（春分・秋分等の詳細データ）
CREATE TABLE IF NOT EXISTS seasonal_markers (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    marker_type VARCHAR(30) NOT NULL CHECK (marker_type IN ('spring_equinox', 'summer_solstice', 'autumn_equinox', 'winter_solstice')),
    exact_time TIMESTAMPTZ NOT NULL, -- 正確な瞬間
    marker_date DATE NOT NULL,
    -- 太陽データ
    sun_declination DOUBLE PRECISION NOT NULL, -- 赤緯
    day_length_hours DOUBLE PRECISION, -- 昼の長さ（東京基準）
    -- ダイヤモンド富士への影響
    diamond_fuji_peak_period_start DATE, -- ダイヤモンド富士好機開始
    diamond_fuji_peak_period_end DATE,   -- ダイヤモンド富士好機終了
    -- 解説
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_solar_events_year_date ON solar_events(calculation_year, event_date);
CREATE INDEX IF NOT EXISTS idx_solar_events_type_time ON solar_events(event_type, event_time);
CREATE INDEX IF NOT EXISTS idx_solar_events_seasonal ON solar_events(is_seasonal_marker, event_date) WHERE is_seasonal_marker = true;

CREATE INDEX IF NOT EXISTS idx_lunar_events_year_date ON lunar_events(calculation_year, event_date);  
CREATE INDEX IF NOT EXISTS idx_lunar_events_type_time ON lunar_events(event_type, event_time);
CREATE INDEX IF NOT EXISTS idx_lunar_events_phase ON lunar_events(phase, illumination);
CREATE INDEX IF NOT EXISTS idx_lunar_events_supermoon ON lunar_events(is_supermoon, event_date) WHERE is_supermoon = true;

CREATE INDEX IF NOT EXISTS idx_fuji_candidates_year_type ON fuji_phenomena_candidates(calculation_year, phenomenon_type);
CREATE INDEX IF NOT EXISTS idx_fuji_candidates_date_time ON fuji_phenomena_candidates(event_date, optimal_time);
CREATE INDEX IF NOT EXISTS idx_fuji_candidates_quality ON fuji_phenomena_candidates(visibility_score DESC, moon_illumination DESC);

CREATE INDEX IF NOT EXISTS idx_seasonal_markers_year ON seasonal_markers(calculation_year);
CREATE INDEX IF NOT EXISTS idx_seasonal_markers_type ON seasonal_markers(marker_type, exact_time);

-- パーティショニング
CREATE TABLE IF NOT EXISTS solar_events_2025 PARTITION OF solar_events
    FOR VALUES FROM (2025) TO (2026);
CREATE TABLE IF NOT EXISTS solar_events_2026 PARTITION OF solar_events
    FOR VALUES FROM (2026) TO (2027);

CREATE TABLE IF NOT EXISTS lunar_events_2025 PARTITION OF lunar_events
    FOR VALUES FROM (2025) TO (2026);
CREATE TABLE IF NOT EXISTS lunar_events_2026 PARTITION OF lunar_events
    FOR VALUES FROM (2026) TO (2027);

-- コメント
COMMENT ON TABLE solar_events IS '太陽の出入り・春分秋分等の天文イベント';
COMMENT ON TABLE lunar_events IS '月の出入り・月相変化等の月イベント';
COMMENT ON TABLE fuji_phenomena_candidates IS '富士現象の候補時間帯（地点別調整前）';  
COMMENT ON TABLE seasonal_markers IS '春分・秋分・至点の詳細データと富士現象への影響';

COMMENT ON COLUMN solar_events.declination IS '太陽の赤緯（度）- 春分秋分で0度';
COMMENT ON COLUMN lunar_events.age_days IS '月齢 - 新月から数えた日数';
COMMENT ON COLUMN fuji_phenomena_candidates.visibility_score IS '観測条件総合スコア(0-1) - 高いほど好条件';
COMMENT ON COLUMN seasonal_markers.diamond_fuji_peak_period_start IS '春分秋分前後のダイヤモンド富士最適期間';