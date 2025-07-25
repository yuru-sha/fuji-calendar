-- ダイヤモンド富士・パール富士カレンダー: 天体データ事前計算テーブル追加
-- 実行日: 2025-07-23

-- 1. locationsテーブルに富士山への方位角・仰角・距離を追加
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fuji_azimuth DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fuji_elevation DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS fuji_distance DOUBLE PRECISION;

-- 2. 天体データ事前計算テーブル
CREATE TABLE IF NOT EXISTS celestial_data (
    id BIGSERIAL PRIMARY KEY,
    calculation_year INTEGER NOT NULL,
    datetime_jst TIMESTAMPTZ NOT NULL,
    -- 太陽データ
    sun_azimuth DOUBLE PRECISION NOT NULL,
    sun_altitude DOUBLE PRECISION NOT NULL,
    sun_distance_au DOUBLE PRECISION, -- 天文単位での距離
    -- 月データ  
    moon_azimuth DOUBLE PRECISION NOT NULL,
    moon_altitude DOUBLE PRECISION NOT NULL,
    moon_phase DOUBLE PRECISION NOT NULL, -- 0.0(新月) - 1.0(満月)
    moon_illumination DOUBLE PRECISION NOT NULL, -- 輝面比
    moon_distance_km DOUBLE PRECISION, -- キロメートルでの距離
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 3. 富士現象イベントテーブル  
CREATE TABLE IF NOT EXISTS fuji_phenomena (
    id BIGSERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    phenomenon_time TIMESTAMPTZ NOT NULL,
    phenomenon_type VARCHAR(20) NOT NULL CHECK (phenomenon_type IN ('diamond', 'pearl')),
    -- 精度データ
    azimuth_difference DOUBLE PRECISION NOT NULL, -- 方位角差（度）
    altitude_difference DOUBLE PRECISION NOT NULL, -- 高度差（度）
    total_difference DOUBLE PRECISION NOT NULL, -- 総合誤差
    -- 天体データ
    celestial_azimuth DOUBLE PRECISION NOT NULL,
    celestial_altitude DOUBLE PRECISION NOT NULL,
    fuji_azimuth DOUBLE PRECISION NOT NULL,
    fuji_elevation DOUBLE PRECISION NOT NULL,
    -- 月データ（パール富士のみ）
    moon_phase DOUBLE PRECISION,
    moon_illumination DOUBLE PRECISION,
    -- メタデータ
    calculation_accuracy VARCHAR(20) DEFAULT 'high',
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_celestial_data_year_time ON celestial_data(calculation_year, datetime_jst);
CREATE INDEX IF NOT EXISTS idx_celestial_data_time ON celestial_data(datetime_jst);

CREATE INDEX IF NOT EXISTS idx_fuji_phenomena_location_time ON fuji_phenomena(location_id, phenomenon_time);
CREATE INDEX IF NOT EXISTS idx_fuji_phenomena_type_time ON fuji_phenomena(phenomenon_type, phenomenon_time);
CREATE INDEX IF NOT EXISTS idx_fuji_phenomena_location_type ON fuji_phenomena(location_id, phenomenon_type);

-- パーティショニング（PostgreSQLの場合）
-- 年別パーティションでパフォーマンス向上
CREATE TABLE IF NOT EXISTS celestial_data_2025 PARTITION OF celestial_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS celestial_data_2026 PARTITION OF celestial_data  
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- 富士山座標定数（参考）
-- 緯度: 35.3606, 経度: 138.7274, 標高: 3776m

COMMENT ON TABLE celestial_data IS '5分間隔の天体データ事前計算結果';
COMMENT ON TABLE fuji_phenomena IS 'ダイヤモンド富士・パール富士現象の検出結果';
COMMENT ON COLUMN locations.fuji_azimuth IS '富士山頂への方位角（度、北を0として時計回り）';
COMMENT ON COLUMN locations.fuji_elevation IS '富士山頂への仰角（度）';
COMMENT ON COLUMN locations.fuji_distance IS '富士山頂までの距離（メートル）';