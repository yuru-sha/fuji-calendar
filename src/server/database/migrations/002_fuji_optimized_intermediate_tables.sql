-- 富士山カレンダー: 富士現象特化型中間データテーブル
-- 目的: 大量の天体データから富士現象に関連するデータのみを事前抽出
-- 実行日: 2025-07-23

-- 1. 富士現象候補時刻テーブル（事前フィルタリング済み）
CREATE TABLE IF NOT EXISTS fuji_candidate_times (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    candidate_date DATE NOT NULL,
    candidate_time TIMESTAMPTZ NOT NULL,
    phenomenon_type VARCHAR(10) NOT NULL CHECK (phenomenon_type IN ('diamond', 'pearl')),
    celestial_body VARCHAR(10) NOT NULL CHECK (celestial_body IN ('sun', 'moon')),
    -- 天体位置データ（富士現象に関連する範囲のみ）
    azimuth DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    -- 富士現象条件
    is_fuji_direction BOOLEAN NOT NULL DEFAULT false, -- 富士山方向か（方位角250-280度）
    is_suitable_altitude BOOLEAN NOT NULL DEFAULT false, -- 適切な高度か（-2度〜10度）
    -- 月の場合のみ
    moon_illumination DOUBLE PRECISION, -- 輝面比（パール富士用）
    moon_phase DOUBLE PRECISION, -- 月相
    is_bright_enough BOOLEAN DEFAULT false, -- 十分明るいか（輝面比0.15以上）
    -- 季節・時間帯フィルタ
    is_diamond_season BOOLEAN NOT NULL DEFAULT false, -- ダイヤモンド富士シーズンか（10月-2月）
    is_optimal_time BOOLEAN NOT NULL DEFAULT false, -- 最適時間帯か（日の出・日の入り前後）
    -- スコアリング
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0, -- 総合品質スコア(0-1)
    -- インデックス用
    azimuth_bucket INTEGER, -- 方位角を5度単位でバケット化
    altitude_bucket INTEGER, -- 高度を1度単位でバケット化
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 2. 富士現象最適候補テーブル（高品質のみ）
CREATE TABLE IF NOT EXISTS fuji_optimal_candidates (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    event_date DATE NOT NULL,
    phenomenon_type VARCHAR(10) NOT NULL CHECK (phenomenon_type IN ('diamond', 'pearl')),
    -- 最適時間窓
    optimal_start_time TIMESTAMPTZ NOT NULL,
    optimal_end_time TIMESTAMPTZ NOT NULL,
    peak_time TIMESTAMPTZ NOT NULL, -- 最も条件の良い時刻
    -- 天体データ
    peak_azimuth DOUBLE PRECISION NOT NULL,
    peak_altitude DOUBLE PRECISION NOT NULL,
    -- 富士現象品質指標
    azimuth_precision DOUBLE PRECISION NOT NULL, -- 方位角の富士山方向への精度
    altitude_suitability DOUBLE PRECISION NOT NULL, -- 仰角の適切さ
    overall_quality DOUBLE PRECISION NOT NULL, -- 総合品質(0-1)
    -- 月データ（パール富士のみ）
    moon_illumination DOUBLE PRECISION,
    moon_phase_description VARCHAR(20), -- 'waxing_gibbous', 'full', etc.
    is_supermoon BOOLEAN DEFAULT false,
    -- 特別条件
    is_equinox_period BOOLEAN DEFAULT false, -- 春分・秋分前後±2週間
    is_weekend BOOLEAN DEFAULT false, -- 土日フラグ
    weather_favorability DOUBLE PRECISION, -- 気象条件（将来拡張用）
    -- メタデータ
    notes TEXT, -- 特記事項
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 3. 日別富士現象サマリーテーブル（カレンダー表示用）
CREATE TABLE IF NOT EXISTS daily_fuji_summary (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    summary_date DATE NOT NULL,
    -- 当日の富士現象概要
    has_diamond_sunrise BOOLEAN DEFAULT false,
    has_diamond_sunset BOOLEAN DEFAULT false,
    has_pearl_events BOOLEAN DEFAULT false,
    -- 品質情報
    best_diamond_quality DOUBLE PRECISION, -- 最高品質のダイヤモンド富士スコア
    best_pearl_quality DOUBLE PRECISION, -- 最高品質のパール富士スコア
    total_events_count INTEGER DEFAULT 0,
    high_quality_events_count INTEGER DEFAULT 0, -- スコア0.7以上
    -- 推奨情報
    recommended_phenomenon VARCHAR(10), -- その日の最推奨現象
    recommended_time TIMESTAMPTZ, -- 推奨観測時刻
    difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    -- 月情報（パール富士日のみ）
    moon_phase_name VARCHAR(20),
    moon_brightness VARCHAR(10), -- 'dim', 'moderate', 'bright'
    -- カレンダー表示用
    display_priority INTEGER DEFAULT 0, -- 表示優先度（高いほど目立つ）
    icon_type VARCHAR(20), -- 'diamond_sun', 'pearl_moon', 'mixed'
    short_description VARCHAR(100), -- カレンダー表示用短縮説明
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    -- 一意制約
    UNIQUE(calculation_year, summary_date)
);

-- インデックス作成（パフォーマンス最適化）

-- fuji_candidate_times用インデックス
CREATE INDEX IF NOT EXISTS idx_candidate_times_year_type ON fuji_candidate_times(calculation_year, phenomenon_type);
CREATE INDEX IF NOT EXISTS idx_candidate_times_date_time ON fuji_candidate_times(candidate_date, candidate_time);
CREATE INDEX IF NOT EXISTS idx_candidate_times_fuji_direction ON fuji_candidate_times(is_fuji_direction, is_suitable_altitude) WHERE is_fuji_direction = true;
CREATE INDEX IF NOT EXISTS idx_candidate_times_quality ON fuji_candidate_times(quality_score DESC) WHERE quality_score > 0.5;
CREATE INDEX IF NOT EXISTS idx_candidate_times_azimuth_bucket ON fuji_candidate_times(azimuth_bucket, altitude_bucket);
CREATE INDEX IF NOT EXISTS idx_candidate_times_pearl_brightness ON fuji_candidate_times(is_bright_enough, moon_illumination DESC) WHERE phenomenon_type = 'pearl';

-- fuji_optimal_candidates用インデックス  
CREATE INDEX IF NOT EXISTS idx_optimal_candidates_year_type ON fuji_optimal_candidates(calculation_year, phenomenon_type);
CREATE INDEX IF NOT EXISTS idx_optimal_candidates_date ON fuji_optimal_candidates(event_date);
CREATE INDEX IF NOT EXISTS idx_optimal_candidates_quality ON fuji_optimal_candidates(overall_quality DESC);
CREATE INDEX IF NOT EXISTS idx_optimal_candidates_peak_time ON fuji_optimal_candidates(peak_time);
CREATE INDEX IF NOT EXISTS idx_optimal_candidates_equinox ON fuji_optimal_candidates(is_equinox_period, event_date) WHERE is_equinox_period = true;

-- daily_fuji_summary用インデックス
CREATE INDEX IF NOT EXISTS idx_daily_summary_year_date ON daily_fuji_summary(calculation_year, summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_has_events ON daily_fuji_summary(has_diamond_sunrise, has_diamond_sunset, has_pearl_events);
CREATE INDEX IF NOT EXISTS idx_daily_summary_quality ON daily_fuji_summary(best_diamond_quality DESC, best_pearl_quality DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_priority ON daily_fuji_summary(display_priority DESC, summary_date);

-- パーティショニング（年別）
CREATE TABLE IF NOT EXISTS fuji_candidate_times_2025 PARTITION OF fuji_candidate_times
    FOR VALUES FROM (2025) TO (2026);
CREATE TABLE IF NOT EXISTS fuji_candidate_times_2026 PARTITION OF fuji_candidate_times
    FOR VALUES FROM (2026) TO (2027);

CREATE TABLE IF NOT EXISTS fuji_optimal_candidates_2025 PARTITION OF fuji_optimal_candidates
    FOR VALUES FROM (2025) TO (2026);
CREATE TABLE IF NOT EXISTS fuji_optimal_candidates_2026 PARTITION OF fuji_optimal_candidates
    FOR VALUES FROM (2026) TO (2027);

-- トリガー関数（日別サマリーの自動更新）
CREATE OR REPLACE FUNCTION update_daily_fuji_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- optimal_candidatesが更新された時、daily_summaryを自動更新
    INSERT INTO daily_fuji_summary (
        calculation_year, summary_date,
        has_diamond_sunrise, has_diamond_sunset, has_pearl_events,
        best_diamond_quality, best_pearl_quality,
        total_events_count, high_quality_events_count,
        recommended_phenomenon, recommended_time,
        display_priority, short_description
    )
    SELECT 
        calculation_year,
        event_date,
        bool_or(phenomenon_type = 'diamond' AND peak_time::time BETWEEN '05:00' AND '08:00') as has_diamond_sunrise,
        bool_or(phenomenon_type = 'diamond' AND peak_time::time BETWEEN '16:00' AND '19:00') as has_diamond_sunset,
        bool_or(phenomenon_type = 'pearl') as has_pearl_events,
        max(CASE WHEN phenomenon_type = 'diamond' THEN overall_quality END) as best_diamond_quality,
        max(CASE WHEN phenomenon_type = 'pearl' THEN overall_quality END) as best_pearl_quality,
        count(*) as total_events_count,
        count(*) FILTER (WHERE overall_quality >= 0.7) as high_quality_events_count,
        (array_agg(phenomenon_type ORDER BY overall_quality DESC))[1] as recommended_phenomenon,
        (array_agg(peak_time ORDER BY overall_quality DESC))[1] as recommended_time,
        greatest(1, floor(max(overall_quality) * 10)) as display_priority,
        case 
            when bool_or(phenomenon_type = 'diamond' AND overall_quality >= 0.8) then 'ダイヤモンド富士好機'
            when bool_or(phenomenon_type = 'pearl' AND overall_quality >= 0.8) then 'パール富士好機'
            when count(*) > 1 then '複数現象あり'
            else '富士現象あり'
        end as short_description
    FROM fuji_optimal_candidates 
    WHERE event_date = NEW.event_date AND calculation_year = NEW.calculation_year
    GROUP BY calculation_year, event_date
    ON CONFLICT (calculation_year, summary_date) 
    DO UPDATE SET
        has_diamond_sunrise = EXCLUDED.has_diamond_sunrise,
        has_diamond_sunset = EXCLUDED.has_diamond_sunset,
        has_pearl_events = EXCLUDED.has_pearl_events,
        best_diamond_quality = EXCLUDED.best_diamond_quality,
        best_pearl_quality = EXCLUDED.best_pearl_quality,
        total_events_count = EXCLUDED.total_events_count,
        high_quality_events_count = EXCLUDED.high_quality_events_count,
        recommended_phenomenon = EXCLUDED.recommended_phenomenon,
        recommended_time = EXCLUDED.recommended_time,
        display_priority = EXCLUDED.display_priority,
        short_description = EXCLUDED.short_description;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_summary
    AFTER INSERT OR UPDATE ON fuji_optimal_candidates
    FOR EACH ROW EXECUTE FUNCTION update_daily_fuji_summary();

-- コメント
COMMENT ON TABLE fuji_candidate_times IS '大量天体データから富士現象候補を事前フィルタリングした中間テーブル';
COMMENT ON TABLE fuji_optimal_candidates IS '高品質な富士現象候補のみを格納（地点計算の入力用）';  
COMMENT ON TABLE daily_fuji_summary IS 'カレンダー表示用の日別富士現象サマリー（高速表示用）';

COMMENT ON COLUMN fuji_candidate_times.azimuth_bucket IS '方位角を5度刻みでバケット化（250-280度が富士山方向）';
COMMENT ON COLUMN fuji_candidate_times.quality_score IS '富士現象品質の総合スコア：方位角×高度×季節×明るさ';
COMMENT ON COLUMN fuji_optimal_candidates.overall_quality IS '0.7以上が推奨レベル、0.8以上が絶好調';
COMMENT ON COLUMN daily_fuji_summary.display_priority IS 'カレンダー表示優先度：10が最高、1が最低';