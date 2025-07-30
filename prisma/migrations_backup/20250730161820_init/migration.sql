-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('diamond_sunrise', 'diamond_sunset', 'pearl_moonrise', 'pearl_moonset');

-- CreateEnum
CREATE TYPE "public"."Accuracy" AS ENUM ('perfect', 'excellent', 'good', 'fair');

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "public"."location_fuji_events" (
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

    CONSTRAINT "location_fuji_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "public"."admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE INDEX "locations_fuji_azimuth_fuji_elevation_idx" ON "public"."locations"("fuji_azimuth", "fuji_elevation");

-- CreateIndex
CREATE INDEX "idx_locations_coords" ON "public"."locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_locations_prefecture" ON "public"."locations"("prefecture");

-- CreateIndex
CREATE INDEX "idx_location_date" ON "public"."location_fuji_events"("location_id", "event_date");

-- CreateIndex
CREATE INDEX "idx_event_date" ON "public"."location_fuji_events"("event_date");

-- CreateIndex
CREATE INDEX "idx_event_type_date" ON "public"."location_fuji_events"("event_type", "event_date");

-- CreateIndex
CREATE INDEX "idx_quality_score" ON "public"."location_fuji_events"("quality_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_location_event" ON "public"."location_fuji_events"("location_id", "event_date", "event_time", "event_type");

-- AddForeignKey
ALTER TABLE "public"."location_fuji_events" ADD CONSTRAINT "location_fuji_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
