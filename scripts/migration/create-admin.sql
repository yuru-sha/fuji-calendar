-- デフォルト管理者アカウントを作成
-- パスワード: FujiAdmin2024! (bcryptハッシュ)
INSERT OR IGNORE INTO admins (username, email, password_hash, created_at)
VALUES (
  'admin', 
  'admin@fuji-calendar.local', 
  '$2b$12$Wh95sr4yKK2x84SET.hvM..eKksZZ7hOSHnng0QwB17eCmLrfF5FS',
  datetime('now', '+9 hours')
);
