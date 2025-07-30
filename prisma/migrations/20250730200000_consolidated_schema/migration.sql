-- ダイヤモンド富士・パール富士カレンダー統合スキーマ
-- 作成日: 2025-07-30
-- 説明: 既存の 2 つのマイグレーションと手動 SQL を統合し、現在の Prisma スキーマと完全一致させる

-- 1. Enum 型の作成
CREATE TYPE "public"."EventType" AS ENUM ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset');
CREATE TYPE "public"."Accuracy" AS ENUM ('perfect', 'excellent', 'good', 'fair');

-- 2. 管理者テーブル
CREATE TABLE "public"."admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- 3. 撮影地点テーブル
CREATE TABLE "public"."locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefecture" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "access_info" TEXT,
    "fuji_azimuth" DOUBLE PRECISION,
    "fuji_elevation" DOUBLE PRECISION,
    "fuji_distance" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parking_info" TEXT,
    
    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- 4. 地点別イベントテーブル（最新の location_events テーブル名を使用）
CREATE TABLE "public"."location_events" (
    "id" BIGSERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "event_date" DATE NOT NULL,
    "event_time" TIMESTAMPTZ(6) NOT NULL,
    "azimuth" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "moon_phase" DOUBLE PRECISION,
    "moon_illumination" DOUBLE PRECISION,
    "calculation_year" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" "public"."EventType" NOT NULL,
    "accuracy" "public"."Accuracy",
    
    CONSTRAINT "location_events_pkey" PRIMARY KEY ("id")
);

-- 5. ユニーク制約の作成
CREATE UNIQUE INDEX "admins_username_key" ON "public"."admins"("username");
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- 6. パフォーマンス用インデックス
-- locations テーブル
CREATE INDEX "locations_fuji_azimuth_fuji_elevation_idx" ON "public"."locations"("fuji_azimuth", "fuji_elevation");
CREATE INDEX "idx_locations_coords" ON "public"."locations"("latitude", "longitude");
CREATE INDEX "idx_locations_prefecture" ON "public"."locations"("prefecture");

-- location_events テーブル
CREATE INDEX "idx_location_date" ON "public"."location_events"("location_id", "event_date");
CREATE INDEX "idx_event_date" ON "public"."location_events"("event_date");
CREATE INDEX "idx_event_type_date" ON "public"."location_events"("event_type", "event_date");
CREATE INDEX "idx_quality_score" ON "public"."location_events"("quality_score" DESC);

-- 7. ユニーク制約（重複イベント防止）
CREATE UNIQUE INDEX "unique_location_event" ON "public"."location_events"("location_id", "event_date", "event_time", "event_type");

-- 8. 外部キー制約
ALTER TABLE "public"."location_events" 
ADD CONSTRAINT "location_events_location_id_fkey" 
FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. 更新トリガー関数
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 各テーブルに更新トリガーを設定
CREATE TRIGGER update_admins_timestamp 
    BEFORE UPDATE ON "public"."admins" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_locations_timestamp 
    BEFORE UPDATE ON "public"."locations" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_location_events_timestamp 
    BEFORE UPDATE ON "public"."location_events" 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 11. データ品質制約
ALTER TABLE "public"."location_events" 
ADD CONSTRAINT "quality_score_range" CHECK ("quality_score" >= 0.0 AND "quality_score" <= 1.0);

ALTER TABLE "public"."location_events" 
ADD CONSTRAINT "moon_phase_range" CHECK ("moon_phase" IS NULL OR ("moon_phase" >= 0.0 AND "moon_phase" <= 1.0));

ALTER TABLE "public"."location_events" 
ADD CONSTRAINT "moon_illumination_range" CHECK ("moon_illumination" IS NULL OR ("moon_illumination" >= 0.0 AND "moon_illumination" <= 1.0));