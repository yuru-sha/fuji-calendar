-- ダイヤモンド富士・パール富士カレンダー最終統合スキーマ
-- 作成日: 2025-07-31
-- 説明: Prisma スキーマと完全一致する統合マイグレーション

-- 1. Enum 型の作成
CREATE TYPE "EventType" AS ENUM ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset');
CREATE TYPE "Accuracy" AS ENUM ('perfect', 'excellent', 'good', 'fair');

-- 2. 管理者テーブル
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- 3. 撮影地点テーブル
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefecture" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION NOT NULL,
    "fuji_azimuth" DOUBLE PRECISION,
    "fuji_elevation" DOUBLE PRECISION,
    "fuji_distance" DOUBLE PRECISION,
    "description" TEXT,
    "access_info" TEXT,
    "parking_info" TEXT,
    "measurement_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- 4. 地点別イベントテーブル
CREATE TABLE "location_events" (
    "id" BIGSERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "event_type" "EventType" NOT NULL,
    "event_date" DATE NOT NULL,
    "event_time" TIMESTAMPTZ(6) NOT NULL,
    "azimuth" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION NOT NULL,
    "accuracy" "Accuracy",
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "moon_phase" DOUBLE PRECISION,
    "moon_illumination" DOUBLE PRECISION,
    "calculation_year" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "location_events_pkey" PRIMARY KEY ("id")
);

-- 5. ユニーク制約の作成
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- 6. パフォーマンス用インデックス
-- locations テーブル
CREATE INDEX "locations_fuji_azimuth_fuji_elevation_idx" ON "locations"("fuji_azimuth", "fuji_elevation");
CREATE INDEX "idx_locations_coords" ON "locations"("latitude", "longitude");
CREATE INDEX "idx_locations_prefecture" ON "locations"("prefecture");

-- location_events テーブル
CREATE INDEX "idx_location_date" ON "location_events"("location_id", "event_date");
CREATE INDEX "idx_event_date" ON "location_events"("event_date");
CREATE INDEX "idx_event_type_date" ON "location_events"("event_type", "event_date");
CREATE INDEX "idx_quality_score" ON "location_events"("quality_score" DESC);

-- 7. ユニーク制約（重複イベント防止）
CREATE UNIQUE INDEX "unique_location_event" ON "location_events"("location_id", "event_date", "event_time", "event_type");

-- 8. 外部キー制約
ALTER TABLE "location_events" 
ADD CONSTRAINT "location_events_location_id_fkey" 
FOREIGN KEY ("location_id") REFERENCES "locations"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. データ品質制約
ALTER TABLE "location_events" 
ADD CONSTRAINT "quality_score_range" CHECK ("quality_score" >= 0.0 AND "quality_score" <= 1.0);

ALTER TABLE "location_events" 
ADD CONSTRAINT "moon_phase_range" CHECK ("moon_phase" IS NULL OR ("moon_phase" >= 0.0 AND "moon_phase" <= 1.0));

ALTER TABLE "location_events" 
ADD CONSTRAINT "moon_illumination_range" CHECK ("moon_illumination" IS NULL OR ("moon_illumination" >= 0.0 AND "moon_illumination" <= 1.0));

-- 10. 更新トリガー関数
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. 各テーブルに更新トリガーを設定
CREATE TRIGGER update_admins_timestamp 
    BEFORE UPDATE ON "admins" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_locations_timestamp 
    BEFORE UPDATE ON "locations" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_location_events_timestamp 
    BEFORE UPDATE ON "location_events" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 12. コメント追加
COMMENT ON TABLE "admins" IS '管理者アカウント';
COMMENT ON TABLE "locations" IS '撮影地点マスタ';
COMMENT ON TABLE "location_events" IS '地点別ダイヤモンド富士・パール富士イベント';

COMMENT ON COLUMN "locations"."fuji_azimuth" IS '撮影地点から富士山への方位角（度）';
COMMENT ON COLUMN "locations"."fuji_elevation" IS '撮影地点から富士山への仰角（度）';
COMMENT ON COLUMN "locations"."fuji_distance" IS '撮影地点から富士山までの距離（メートル）';
COMMENT ON COLUMN "locations"."measurement_notes" IS '測定に関する注釈・メモ';

COMMENT ON COLUMN "location_events"."quality_score" IS '品質スコア（0.0-1.0）';
COMMENT ON COLUMN "location_events"."moon_phase" IS '月相（0.0-1.0、新月=0、満月=1）';
COMMENT ON COLUMN "location_events"."moon_illumination" IS '月の照度率（0.0-1.0）';
COMMENT ON COLUMN "location_events"."accuracy" IS '方位角精度レベル';