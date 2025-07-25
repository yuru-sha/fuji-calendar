-- ダイヤモンド富士・パール富士カレンダー: 既存データベースから新5テーブル構成への移行
-- 実行日: 2025-07-23

-- 1. 既存の不要なテーブルを削除（注意: データは事前にバックアップ済み）
DROP TABLE IF EXISTS events_cache CASCADE;
DROP TABLE IF EXISTS location_requests CASCADE;
DROP TABLE IF EXISTS request_limits CASCADE;
DROP TABLE IF EXISTS historical_events CASCADE;

-- 2. adminsテーブルの調整（emailカラムがなければ追加、不要なカラムを削除）
ALTER TABLE admins 
  DROP COLUMN IF EXISTS last_login,
  DROP COLUMN IF EXISTS failed_login_count,
  DROP COLUMN IF EXISTS locked_until;

-- emailカラムがない場合は追加（usernameをデフォルト値として使用）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admins' AND column_name = 'email') THEN
    ALTER TABLE admins ADD COLUMN email VARCHAR(255);
    UPDATE admins SET email = username || '@fuji-calendar.local' WHERE email IS NULL;
    ALTER TABLE admins ALTER COLUMN email SET NOT NULL;
    ALTER TABLE admins ADD CONSTRAINT admins_email_unique UNIQUE (email);
  END IF;
END $$;

-- updated_atカラムを追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admins' AND column_name = 'updated_at') THEN
    ALTER TABLE admins ADD COLUMN updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo');
  END IF;
END $$;

-- 3. locationsテーブルの調整
-- warningsカラムを削除（不要）
ALTER TABLE locations DROP COLUMN IF EXISTS warnings;

-- parking_infoカラムを追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'locations' AND column_name = 'parking_info') THEN
    ALTER TABLE locations ADD COLUMN parking_info TEXT;
  END IF;
END $$;

-- データ型の変換（DECIMAL → DOUBLE PRECISION）
ALTER TABLE locations 
  ALTER COLUMN latitude TYPE DOUBLE PRECISION USING latitude::DOUBLE PRECISION,
  ALTER COLUMN longitude TYPE DOUBLE PRECISION USING longitude::DOUBLE PRECISION,
  ALTER COLUMN elevation TYPE DOUBLE PRECISION USING elevation::DOUBLE PRECISION,
  ALTER COLUMN fuji_azimuth TYPE DOUBLE PRECISION USING fuji_azimuth::DOUBLE PRECISION,
  ALTER COLUMN fuji_elevation TYPE DOUBLE PRECISION USING fuji_elevation::DOUBLE PRECISION,
  ALTER COLUMN fuji_distance TYPE DOUBLE PRECISION USING fuji_distance::DOUBLE PRECISION;

-- 4. 新しいテーブルの作成
-- 天体軌道データテーブル
CREATE TABLE IF NOT EXISTS celestial_orbit_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TIMESTAMPTZ NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    minute INTEGER NOT NULL CHECK (minute IN (0,5,10,15,20,25,30,35,40,45,50,55)),
    celestial_type VARCHAR(10) NOT NULL CHECK (celestial_type IN ('sun', 'moon')),
    azimuth DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT false,
    moon_phase DOUBLE PRECISION,
    moon_illumination DOUBLE PRECISION,
    season VARCHAR(10) CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    time_of_day VARCHAR(10) CHECK (time_of_day IN ('dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night')),
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    UNIQUE(date, hour, minute, celestial_type)
);

-- Enumの作成
CREATE TYPE pattern AS ENUM ('diamond', 'pearl');
CREATE TYPE quality AS ENUM ('excellent', 'good', 'fair', 'poor');
CREATE TYPE event_type AS ENUM ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset');
CREATE TYPE accuracy AS ENUM ('perfect', 'excellent', 'good', 'fair');

-- 天文データテーブル
CREATE TABLE IF NOT EXISTS astronomical_data (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    pattern pattern NOT NULL,
    elevation INTEGER NOT NULL,
    time_of_day VARCHAR(10) NOT NULL CHECK (time_of_day IN ('morning', 'afternoon')),
    precise_time TIMESTAMPTZ NOT NULL,
    azimuth DOUBLE PRECISION NOT NULL,
    moon_elevation DOUBLE PRECISION,
    moon_azimuth DOUBLE PRECISION,
    moon_phase DOUBLE PRECISION,
    quality quality,
    atmospheric_factor DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    UNIQUE(date, pattern, elevation, time_of_day)
);

-- 地点別富士現象イベントテーブル
CREATE TABLE IF NOT EXISTS location_fuji_events (
    id BIGSERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type event_type NOT NULL,
    azimuth DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION NOT NULL,
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    accuracy accuracy,
    moon_phase DOUBLE PRECISION CHECK (moon_phase IS NULL OR (moon_phase >= 0.0 AND moon_phase <= 1.0)),
    moon_illumination DOUBLE PRECISION CHECK (moon_illumination IS NULL OR (moon_illumination >= 0.0 AND moon_illumination <= 1.0)),
    calculation_year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
    UNIQUE(location_id, event_date, event_time, event_type)
);

-- 5. インデックスの作成
-- celestial_orbit_data
CREATE INDEX idx_date_celestial ON celestial_orbit_data(date, celestial_type);
CREATE INDEX idx_celestial_visible ON celestial_orbit_data(celestial_type, visible);
CREATE INDEX idx_elevation_celestial ON celestial_orbit_data(elevation, celestial_type);
CREATE INDEX idx_moon_phase_date ON celestial_orbit_data(moon_phase, date);
CREATE INDEX idx_season_timeofday ON celestial_orbit_data(season, time_of_day);

-- astronomical_data
CREATE INDEX idx_astro_date_pattern ON astronomical_data(date, pattern);
CREATE INDEX idx_astro_pattern_elevation ON astronomical_data(pattern, elevation);
CREATE INDEX idx_astro_quality_date ON astronomical_data(quality, date);

-- location_fuji_events
CREATE INDEX idx_location_date ON location_fuji_events(location_id, event_date);
CREATE INDEX idx_event_date ON location_fuji_events(event_date);
CREATE INDEX idx_event_type_date ON location_fuji_events(event_type, event_date);
CREATE INDEX idx_quality_score ON location_fuji_events(quality_score DESC);

-- 6. 更新トリガーの作成
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに更新トリガーを設定
CREATE TRIGGER update_admins_timestamp BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_locations_timestamp BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_celestial_orbit_timestamp BEFORE UPDATE ON celestial_orbit_data FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_astronomical_timestamp BEFORE UPDATE ON astronomical_data FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_location_fuji_timestamp BEFORE UPDATE ON location_fuji_events FOR EACH ROW EXECUTE FUNCTION update_timestamp();