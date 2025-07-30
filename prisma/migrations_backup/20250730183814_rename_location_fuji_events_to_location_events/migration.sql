/*
  Warnings:

  - You are about to drop the `location_fuji_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."location_fuji_events" DROP CONSTRAINT "location_fuji_events_location_id_fkey";

-- DropTable
DROP TABLE "public"."location_fuji_events";

-- CreateTable
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

-- CreateIndex
CREATE INDEX "idx_location_date" ON "public"."location_events"("location_id", "event_date");

-- CreateIndex
CREATE INDEX "idx_event_date" ON "public"."location_events"("event_date");

-- CreateIndex
CREATE INDEX "idx_event_type_date" ON "public"."location_events"("event_type", "event_date");

-- CreateIndex
CREATE INDEX "idx_quality_score" ON "public"."location_events"("quality_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_location_event" ON "public"."location_events"("location_id", "event_date", "event_time", "event_type");

-- AddForeignKey
ALTER TABLE "public"."location_events" ADD CONSTRAINT "location_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
