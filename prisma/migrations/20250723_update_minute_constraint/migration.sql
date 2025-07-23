-- 1分間隔データに対応するためのマイグレーション

-- 既存のCHECK制約を削除
ALTER TABLE celestial_orbit_data 
DROP CONSTRAINT IF EXISTS celestial_orbit_data_minute_check;

-- 新しいCHECK制約を追加（0-59の任意の分を許可）
ALTER TABLE celestial_orbit_data 
ADD CONSTRAINT celestial_orbit_data_minute_check 
CHECK (minute >= 0 AND minute <= 59);