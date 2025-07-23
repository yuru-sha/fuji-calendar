-- 富士山カレンダー: 天体別軌道データテーブル（5分刻み）
-- ユーザー提案のPrismaスキーマをSQLに変換
-- 実行日: 2025-07-23

-- 1. 天体別軌道データ（太陽・月を分離、5分刻み）
CREATE TABLE IF NOT EXISTS celestial_orbit_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TIMESTAMPTZ NOT NULL, -- JST統一：2025-07-24T14:30:00+09:00
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23), -- JST時刻の時間部分（0-23）
    minute INTEGER NOT NULL CHECK (minute IN (0,5,10,15,20,25,30,35,40,45,50,55)), -- JST時刻の分部分（5分刻み）
    
    -- 天体種類
    celestial_type VARCHAR(10) NOT NULL CHECK (celestial_type IN ('sun', 'moon')),
    
    -- 軌道データ
    azimuth DOUBLE PRECISION NOT NULL, -- 方位角（度、北を0度として時計回り）
    elevation DOUBLE PRECISION NOT NULL, -- 高度（度、水平線を0度）
    visible BOOLEAN NOT NULL DEFAULT false, -- 見える状態（薄明・地平線考慮）
    
    -- 月専用データ（太陽の場合はnull）
    moon_phase DOUBLE PRECISION, -- 月相（0.0-1.0、満ち欠け）
    moon_illumination DOUBLE PRECISION, -- 照度（0.0-1.0、明るさ）
    
    -- メタデータ
    season VARCHAR(10) CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    time_of_day VARCHAR(10) CHECK (time_of_day IN ('dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night')),
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    
    -- 高速検索用インデックス
    UNIQUE(date, hour, minute, celestial_type)
);

-- 2. 年間天体データ（高精度事前計算済み）
CREATE TABLE IF NOT EXISTS astronomical_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL, -- 撮影日（YYYY-MM-DD、JST基準）
    pattern VARCHAR(10) NOT NULL CHECK (pattern IN ('diamond', 'pearl')), -- ShootingPattern
    elevation INTEGER NOT NULL,
    time_of_day VARCHAR(10) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon')),
    
    -- 太陽データ（高精度）
    precise_time TIMESTAMPTZ NOT NULL, -- JST統一：撮影最適時刻
    azimuth DOUBLE PRECISION NOT NULL, -- 方位角（度、0.1度精度）
    
    -- 月データ
    moon_elevation DOUBLE PRECISION, -- 月の高度
    moon_azimuth DOUBLE PRECISION, -- 月の方位角
    moon_phase DOUBLE PRECISION, -- 月相（0.0-1.0）
    
    -- 撮影品質
    quality VARCHAR(10) CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
    atmospheric_factor DOUBLE PRECISION, -- 大気透明度予測（0.0-1.0）
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    
    -- 複合一意制約
    UNIQUE(date, pattern, elevation, time_of_day)
);

-- インデックス作成（celestial_orbit_data）
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_date_celestial ON celestial_orbit_data(date, celestial_type);
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_celestial_visible ON celestial_orbit_data(celestial_type, visible);
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_elevation_celestial ON celestial_orbit_data(elevation, celestial_type);
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_moon_phase_date ON celestial_orbit_data(moon_phase, date) WHERE celestial_type = 'moon';
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_season_timeofday ON celestial_orbit_data(season, time_of_day);

-- インデックス作成（astronomical_data）
CREATE INDEX IF NOT EXISTS idx_astro_date_pattern ON astronomical_data(date, pattern);
CREATE INDEX IF NOT EXISTS idx_astro_pattern_elevation ON astronomical_data(pattern, elevation);
CREATE INDEX IF NOT EXISTS idx_astro_quality_date ON astronomical_data(quality, date);

-- パーティショニング設定（年別）
-- celestial_orbit_dataの年別パーティション
CREATE TABLE IF NOT EXISTS celestial_orbit_data_2025 PARTITION OF celestial_orbit_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS celestial_orbit_data_2026 PARTITION OF celestial_orbit_data
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- astronomical_dataの年別パーティション
CREATE TABLE IF NOT EXISTS astronomical_data_2025 PARTITION OF astronomical_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS astronomical_data_2026 PARTITION OF astronomical_data
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_celestial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_celestial_orbit_updated_at
    BEFORE UPDATE ON celestial_orbit_data
    FOR EACH ROW EXECUTE FUNCTION update_celestial_updated_at();

CREATE TRIGGER trigger_update_astronomical_updated_at
    BEFORE UPDATE ON astronomical_data
    FOR EACH ROW EXECUTE FUNCTION update_celestial_updated_at();

-- コメント
COMMENT ON TABLE celestial_orbit_data IS '天体別軌道データ（5分刻み）：太陽・月の位置を高精度で記録';
COMMENT ON TABLE astronomical_data IS '年間天体データ：富士現象の高精度事前計算結果';

COMMENT ON COLUMN celestial_orbit_data.time IS 'JST統一時刻（例：2025-07-24T14:30:00+09:00）';
COMMENT ON COLUMN celestial_orbit_data.celestial_type IS '天体種別：太陽(sun)または月(moon)';
COMMENT ON COLUMN celestial_orbit_data.visible IS '視認可能状態：薄明・地平線を考慮';
COMMENT ON COLUMN celestial_orbit_data.moon_phase IS '月相：0.0（新月）〜1.0（満月）';

COMMENT ON COLUMN astronomical_data.pattern IS '撮影パターン：ダイヤモンド富士(diamond)またはパール富士(pearl)';
COMMENT ON COLUMN astronomical_data.quality IS '撮影品質評価：excellent/good/fair/poor';
COMMENT ON COLUMN astronomical_data.atmospheric_factor IS '大気透明度予測：0.0（悪い）〜1.0（良い）';