-- 管理者セキュリティ強化マイグレーション
-- 作成日: 2025-08-07
-- 説明: Admin テーブルにセキュリティ関連フィールドを追加し、RefreshToken テーブルと AdminRole enum を作成

-- 1. AdminRole enum の作成
CREATE TYPE "AdminRole" AS ENUM ('admin', 'super');

-- 2. Admin テーブルのセキュリティ強化
-- 既存のカラムを更新
ALTER TABLE "admins" 
  ALTER COLUMN "username" TYPE VARCHAR(50),
  ALTER COLUMN "email" TYPE VARCHAR(100);

-- 新しいセキュリティフィールドを追加
ALTER TABLE "admins" 
  ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'admin',
  ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMPTZ(6),
  ADD COLUMN "last_login_at" TIMESTAMPTZ(6),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- 3. RefreshToken テーブルの作成
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(1000) NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- 4. インデックスの追加
-- Admin テーブル用インデックス
CREATE INDEX "admins_username_idx" ON "admins"("username");
CREATE INDEX "admins_email_idx" ON "admins"("email");
CREATE INDEX "admins_is_active_idx" ON "admins"("is_active");

-- RefreshToken テーブル用インデックス
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_admin_id_idx" ON "refresh_tokens"("admin_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE INDEX "refresh_tokens_is_revoked_idx" ON "refresh_tokens"("is_revoked");

-- 5. 外部キー制約の追加
ALTER TABLE "refresh_tokens" 
  ADD CONSTRAINT "refresh_tokens_admin_id_fkey" 
  FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;