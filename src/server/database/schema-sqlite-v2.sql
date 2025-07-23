-- 富士山カレンダー: SQLite用データベーススキーマ v2
-- 実行日: 2025-07-23

-- 既存のテーブルを削除（開発環境のみ）
-- DROP TABLE IF EXISTS location_fuji_events;
-- DROP TABLE IF EXISTS astronomical_data;
-- DROP TABLE IF EXISTS celestial_orbit_data;
-- DROP TABLE IF EXISTS locations;
-- DROP TABLE IF EXISTS admins;

-- 1. 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', '+9 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 2. 地点マスタテーブル
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    prefecture TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation REAL NOT NULL,
    description TEXT,
    access_info TEXT,
    parking_info TEXT,
    
    -- 富士山への方位・距離情報
    fuji_azimuth REAL,
    fuji_elevation REAL,
    fuji_distance REAL,
    
    created_at TEXT DEFAULT (datetime('now', '+9 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 3. 天体軌道データ（5分刻み基本データ）
CREATE TABLE IF NOT EXISTS celestial_orbit_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    minute INTEGER NOT NULL CHECK (minute IN (0,5,10,15,20,25,30,35,40,45,50,55)),
    
    -- 天体種類
    celestial_type TEXT NOT NULL CHECK (celestial_type IN ('sun', 'moon')),
    
    -- 軌道データ
    azimuth REAL NOT NULL,
    elevation REAL NOT NULL,
    visible INTEGER NOT NULL DEFAULT 0,
    
    -- 月専用データ
    moon_phase REAL,
    moon_illumination REAL,
    
    -- メタデータ
    season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    time_of_day TEXT CHECK (time_of_day IN ('dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night')),
    
    created_at TEXT DEFAULT (datetime('now', '+9 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+9 hours')),
    
    UNIQUE(date, hour, minute, celestial_type)
);

-- 4. 天文データ（中間データ：富士現象候補）
CREATE TABLE IF NOT EXISTS astronomical_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    pattern TEXT NOT NULL CHECK (pattern IN ('diamond', 'pearl')),
    elevation INTEGER NOT NULL,
    time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon')),
    
    -- 現象時刻と位置
    precise_time TEXT NOT NULL,
    azimuth REAL NOT NULL,
    
    -- 月データ（パール富士用）
    moon_elevation REAL,
    moon_azimuth REAL,
    moon_phase REAL,
    
    -- 品質評価
    quality TEXT CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
    atmospheric_factor REAL,
    
    created_at TEXT DEFAULT (datetime('now', '+9 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+9 hours')),
    
    UNIQUE(date, pattern, elevation, time_of_day)
);

-- 5. 地点別富士現象イベント（探索結果）
CREATE TABLE IF NOT EXISTS location_fuji_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset')),
    
    -- 天体の位置情報
    azimuth REAL NOT NULL,
    altitude REAL NOT NULL,
    
    -- 品質・精度情報
    quality_score REAL NOT NULL DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    accuracy TEXT CHECK (accuracy IN ('perfect', 'excellent', 'good', 'fair')),
    
    -- パール富士の場合の月情報
    moon_phase REAL CHECK (moon_phase IS NULL OR (moon_phase >= 0.0 AND moon_phase <= 1.0)),
    moon_illumination REAL CHECK (moon_illumination IS NULL OR (moon_illumination >= 0.0 AND moon_illumination <= 1.0)),
    
    -- メタデータ
    calculation_year INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now', '+9 hours')),
    updated_at TEXT DEFAULT (datetime('now', '+9 hours')),
    
    UNIQUE(location_id, event_date, event_time, event_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

CREATE INDEX IF NOT EXISTS idx_locations_prefecture ON locations(prefecture);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_fuji_data ON locations(fuji_azimuth, fuji_elevation) WHERE fuji_azimuth IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_celestial_orbit_date_type ON celestial_orbit_data(date, celestial_type);
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_visible ON celestial_orbit_data(celestial_type, visible) WHERE visible = 1;
CREATE INDEX IF NOT EXISTS idx_celestial_orbit_moon ON celestial_orbit_data(date, moon_phase) WHERE celestial_type = 'moon';

CREATE INDEX IF NOT EXISTS idx_astronomical_date_pattern ON astronomical_data(date, pattern);
CREATE INDEX IF NOT EXISTS idx_astronomical_quality ON astronomical_data(quality, date) WHERE quality IN ('excellent', 'good');
CREATE INDEX IF NOT EXISTS idx_astronomical_time ON astronomical_data(precise_time);

CREATE INDEX IF NOT EXISTS idx_location_fuji_events_lookup ON location_fuji_events(location_id, event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_date ON location_fuji_events(event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_type ON location_fuji_events(event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_location_fuji_events_quality ON location_fuji_events(quality_score DESC) WHERE quality_score >= 0.7;

-- 更新トリガー（SQLiteではTRIGGERで実装）
CREATE TRIGGER IF NOT EXISTS update_admins_timestamp 
AFTER UPDATE ON admins
BEGIN
    UPDATE admins SET updated_at = datetime('now', '+9 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_locations_timestamp 
AFTER UPDATE ON locations
BEGIN
    UPDATE locations SET updated_at = datetime('now', '+9 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_celestial_orbit_timestamp 
AFTER UPDATE ON celestial_orbit_data
BEGIN
    UPDATE celestial_orbit_data SET updated_at = datetime('now', '+9 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_astronomical_timestamp 
AFTER UPDATE ON astronomical_data
BEGIN
    UPDATE astronomical_data SET updated_at = datetime('now', '+9 hours') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_location_fuji_timestamp 
AFTER UPDATE ON location_fuji_events
BEGIN
    UPDATE location_fuji_events SET updated_at = datetime('now', '+9 hours') WHERE id = NEW.id;
END;