-- PostgreSQL版データベーススキーマ定義
-- 全ての時刻はJST（日本標準時）で保存

-- 撮影地点テーブル
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  prefecture VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  elevation DECIMAL(8, 2) NOT NULL,
  description TEXT,
  access_info TEXT,
  warnings TEXT,
  -- 富士山への事前計算値（高速化のため）
  fuji_azimuth DECIMAL(8, 5),    -- 富士山への方位角（度）
  fuji_elevation DECIMAL(8, 5),  -- 富士山頂への仰角（度）
  fuji_distance DECIMAL(10, 3),   -- 富士山までの距離（km）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo')
);

-- 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  last_login TIMESTAMP WITH TIME ZONE,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE
);

-- 撮影地点リクエストテーブル
CREATE TABLE IF NOT EXISTS location_requests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  prefecture VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  suggested_latitude DECIMAL(10, 8),
  suggested_longitude DECIMAL(11, 8),
  requester_ip INET NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by INTEGER REFERENCES admins(id)
);

-- リクエスト制限テーブル
CREATE TABLE IF NOT EXISTS request_limits (
  ip_address INET PRIMARY KEY,
  last_request_at TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 1
);

-- キャッシュテーブル（既存SQLiteスキーマに準拠）
CREATE TABLE IF NOT EXISTS events_cache (
  -- 主キー
  cache_key VARCHAR(255) PRIMARY KEY,
  
  -- 期間情報
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER,
  
  -- 地点情報
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- イベントデータ（JSON形式）
  events_data TEXT NOT NULL, -- FujiEvent[]をJSONシリアライズ
  
  -- メタデータ
  event_count INTEGER NOT NULL DEFAULT 0,
  calculation_duration_ms INTEGER, -- 計算にかかった時間
  
  -- キャッシュ管理
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Tokyo'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_valid BOOLEAN DEFAULT true
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_locations_prefecture ON locations(prefecture);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_fuji_distance ON locations(fuji_distance);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_location_requests_status ON location_requests(status);
CREATE INDEX IF NOT EXISTS idx_location_requests_created ON location_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_request_limits_ip ON request_limits(ip_address);

-- キャッシュテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_events_cache_year_month ON events_cache(year, month);
CREATE INDEX IF NOT EXISTS idx_events_cache_location ON events_cache(location_id);
CREATE INDEX IF NOT EXISTS idx_events_cache_date ON events_cache(year, month, day);
CREATE INDEX IF NOT EXISTS idx_events_cache_expires ON events_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_cache_valid ON events_cache(is_valid) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_events_cache_monthly ON events_cache(year, month, is_valid, expires_at);
CREATE INDEX IF NOT EXISTS idx_events_cache_daily ON events_cache(year, month, day, location_id, is_valid);

-- 地理空間インデックス（PostGIS拡張を使用する場合）
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);
-- UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;
-- CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(geom);

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (NOW() AT TIME ZONE 'Asia/Tokyo');
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データ挿入
-- デフォルト管理者アカウント (password: admin123)
INSERT INTO admins (username, email, password_hash) 
VALUES ('admin', 'admin@fuji-calendar.local', '$2b$10$rOvHGXwVJ5F9gK8FvGQ9O.8FKA8tXKoLhcOqJLt4QzYpx8YOA8YcG')
ON CONFLICT (username) DO NOTHING;