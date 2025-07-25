-- ダイヤモンド富士・パール富士カレンダー: PostgreSQL用データベーススキーマ v2
-- 実行日: 2025-07-23

-- 既存のテーブルを削除（開発環境のみ）
-- DROP TABLE IF EXISTS location_fuji_events CASCADE;
-- DROP TABLE IF EXISTS astronomical_data CASCADE;
-- DROP TABLE IF EXISTS celestial_orbit_data CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;
-- DROP TABLE IF EXISTS admins CASCADE;

-- 1. 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 2. 地点マスタテーブル
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefecture VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION NOT NULL,
    description TEXT,
    access_info TEXT,
    parking_info TEXT,
    
    -- 富士山への方位・距離情報
    fuji_azimuth DOUBLE PRECISION,
    fuji_elevation DOUBLE PRECISION,
    fuji_distance DOUBLE PRECISION,
    
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 3. 天体軌道データ（5分刻み基本データ）
CREATE TABLE IF NOT EXISTS celestial_orbit_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TIMESTAMPTZ NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    minute INTEGER NOT NULL CHECK (minute IN (0,5,10,15,20,25,30,35,40,45,50,55)),
    
    -- 天体種類
    celestial_type VARCHAR(10) NOT NULL CHECK (celestial_type IN ('sun', 'moon')),
    
    -- 軌道データ
    azimuth DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT false,
    
    -- 月専用データ
    moon_phase DOUBLE PRECISION,
    moon_illumination DOUBLE PRECISION,
    
    -- メタデータ
    season VARCHAR(10) CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    time_of_day VARCHAR(10) CHECK (time_of_day IN ('dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night')),
    
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    
    UNIQUE(date, hour, minute, celestial_type)
);

-- 4. 天文データ（中間データ：富士現象候補）
CREATE TABLE IF NOT EXISTS astronomical_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    pattern VARCHAR(10) NOT NULL CHECK (pattern IN ('diamond', 'pearl')),
    elevation INTEGER NOT NULL,
    time_of_day VARCHAR(10) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon')),
    
    -- 現象時刻と位置
    precise_time TIMESTAMPTZ NOT NULL,
    azimuth DOUBLE PRECISION NOT NULL,
    
    -- 月データ（パール富士用）
    moon_elevation DOUBLE PRECISION,
    moon_azimuth DOUBLE PRECISION,
    moon_phase DOUBLE PRECISION,
    
    -- 品質評価
    quality VARCHAR(10) CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
    atmospheric_factor DOUBLE PRECISION,
    
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    
    UNIQUE(date, pattern, elevation, time_of_day)
);

-- 5. 地点別富士現象イベント（探索結果）
CREATE TABLE IF NOT EXISTS location_fuji_events (
    id BIGSERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset')),
    
    -- 天体の位置情報
    azimuth DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    
    -- 品質・精度情報
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    accuracy VARCHAR(10) CHECK (accuracy IN ('perfect', 'excellent', 'good', 'fair')),
    
    -- パール富士の場合の月情報
    moon_phase DOUBLE PRECISION CHECK (moon_phase IS NULL OR (moon_phase >= 0.0 AND moon_phase <= 1.0)),
    moon_illumination DOUBLE PRECISION CHECK (moon_illumination IS NULL OR (moon_illumination >= 0.0 AND moon_illumination <= 1.0)),
    
    -- メタデータ
    calculation_year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    
    UNIQUE(location_id, event_date, event_time, event_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

CREATE INDEX IF NOT EXISTS idx_locations_prefecture ON locations(prefecture);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_fuji_data ON locations(fuji_azimuth, fuji_elevation) WHERE fuji_azimuth IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_celestial_orbit_date_type ON celestial_orbit_data(date, celestial_type);
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_visible ON celestial_orbit_data(celestial_type, visible) WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_moon ON celestial_orbit_data(date, moon_phase) WHERE celestial_type = 'moon';

CREATE INDEX IF NOT EXISTS idx_astronomical_date_pattern ON astronomical_data(date, pattern);
CREATE INDEX IF NOT EXISTS idx_astronomical_quality ON astronomical_data(quality, date) WHERE quality IN ('excellent', 'good');
CREATE INDEX IF NOT EXISTS idx_astronomical_time ON astronomical_data(precise_time);

CREATE INDEX IF NOT EXISTS idx_location_fuji_events_lookup ON location_fuji_events(location_id, event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_date ON location_fuji_events(event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_type ON location_fuji_events(event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_quality ON location_fuji_events(quality_score DESC) WHERE quality_score >= 0.7;

-- 更新トリガー（全テーブル共通）
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに更新トリガーを設定
DROP TRIGGER IF EXISTS update_admins_timestamp ON admins;
CREATE TRIGGER update_admins_timestamp BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_locations_timestamp ON locations;
CREATE TRIGGER update_locations_timestamp BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_celestial_orbit_timestamp ON celestial_orbit_data;
CREATE TRIGGER update_celestial_orbit_timestamp BEFORE UPDATE ON celestial_orbit_data FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_astronomical_timestamp ON astronomical_data;
CREATE TRIGGER update_astronomical_timestamp BEFORE UPDATE ON astronomical_data FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_location_fuji_timestamp ON location_fuji_events;
CREATE TRIGGER update_location_fuji_timestamp BEFORE UPDATE ON location_fuji_events FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- テーブルコメント
COMMENT ON TABLE admins IS '管理者情報';
COMMENT ON TABLE locations IS '撮影地点マスタ';
COMMENT ON TABLE celestial_orbit_data IS '天体軌道データ（5分刻みの太陽・月の位置）';
COMMENT ON TABLE astronomical_data IS '天文データ（富士現象候補の中間データ）';
COMMENT ON TABLE location_fuji_events IS '地点別富士現象イベント（探索結果）';

-- カラムコメント
COMMENT ON COLUMN locations.fuji_azimuth IS '地点から富士山への方位角（度）';
COMMENT ON COLUMN locations.fuji_elevation IS '地点から富士山への仰角（度）';
COMMENT ON COLUMN locations.fuji_distance IS '地点から富士山までの距離（メートル）';

COMMENT ON COLUMN celestial_orbit_data.time IS 'JST時刻（例：2025-07-24T14:30:00+09:00）';
COMMENT ON COLUMN celestial_orbit_data.celestial_type IS '天体種別：sun（太陽）またはmoon（月）';
COMMENT ON COLUMN celestial_orbit_data.visible IS '視認可能状態（薄明・地平線を考慮）';

COMMENT ON COLUMN astronomical_data.pattern IS '現象パターン：diamond（ダイヤモンド富士）またはpearl（パール富士）';
COMMENT ON COLUMN astronomical_data.quality IS '撮影品質評価';
COMMENT ON COLUMN astronomical_data.atmospheric_factor IS '大気透明度予測（0.0-1.0）';

COMMENT ON COLUMN location_fuji_events.event_type IS '現象タイプ：diamond_sunrise/sunset, pearl_moonrise/moonset';
COMMENT ON COLUMN location_fuji_events.quality_score IS '品質スコア（0.0-1.0）';
COMMENT ON COLUMN location_fuji_events.accuracy IS '精度評価';
COMMENT ON COLUMN location_fuji_events.calculation_year IS 'どの年の計算で生成されたか';