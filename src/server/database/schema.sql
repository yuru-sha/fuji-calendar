-- データベーススキーマ定義
-- 全ての時刻はJST（日本標準時）で保存

-- 撮影地点テーブル
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation REAL NOT NULL,
  description TEXT,
  access_info TEXT,
  warnings TEXT,
  -- 富士山への事前計算値（高速化のため）
  fuji_azimuth REAL,    -- 富士山への方位角（度）
  fuji_elevation REAL,  -- 富士山頂への仰角（度）
  fuji_distance REAL,   -- 富士山までの距離（km）
  created_at DATETIME DEFAULT (datetime('now', '+9 hours')),
  updated_at DATETIME DEFAULT (datetime('now', '+9 hours'))
);

-- 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now', '+9 hours')),
  last_login DATETIME,
  failed_login_count INTEGER DEFAULT 0,
  locked_until DATETIME
);

-- 撮影地点リクエストテーブル
CREATE TABLE IF NOT EXISTS location_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_latitude REAL,
  suggested_longitude REAL,
  requester_ip TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at DATETIME DEFAULT (datetime('now', '+9 hours')),
  processed_at DATETIME,
  processed_by INTEGER REFERENCES admins(id)
);

-- リクエスト制限テーブル
CREATE TABLE IF NOT EXISTS request_limits (
  ip_address TEXT PRIMARY KEY,
  last_request_at DATETIME NOT NULL,
  request_count INTEGER DEFAULT 1
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_locations_prefecture ON locations(prefecture);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_location_requests_status ON location_requests(status);
CREATE INDEX IF NOT EXISTS idx_location_requests_created ON location_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_request_limits_ip ON request_limits(ip_address);

-- 初期データ挿入
-- デフォルト管理者アカウント (password: admin123)
INSERT OR IGNORE INTO admins (username, password_hash) 
VALUES ('admin', '$2b$10$rOvHGXwVJ5F9gK8FvGQ9O.8FKA8tXKoLhcOqJLt4QzYpx8YOA8YcG');

-- サンプル撮影地点データは削除されました
-- 必要に応じて管理画面から手動で追加してください