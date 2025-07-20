# 環境変数設定ガイド

## 概要

富士山カレンダーの環境変数設定について説明します。開発環境・本番環境それぞれの推奨設定値と設定方法を記載しています。

## 設定ファイル

### .env.example
プロジェクトルートの `.env.example` をコピーして `.env` ファイルを作成してください。

```bash
cp .env.example .env
```

## 必須設定項目

### アプリケーション設定

#### NODE_ENV
- **説明**: 実行環境の指定
- **デフォルト**: `development`
- **設定値**:
  - `development`: 開発環境
  - `production`: 本番環境
  - `test`: テスト環境

```bash
# 開発環境
NODE_ENV=development

# 本番環境
NODE_ENV=production
```

#### PORT
- **説明**: アプリケーションサーバーのポート番号
- **デフォルト**: `8000`
- **範囲**: `1024-65535`

```bash
PORT=8000
```

### データベース設定

#### DB_PATH
- **説明**: SQLiteデータベースファイルのパス
- **デフォルト**: `./data/fuji-calendar.db`
- **注意**: ディレクトリが存在しない場合は自動作成されます

```bash
# 開発環境
DB_PATH=./data/fuji-calendar.db

# 本番環境（Dockerコンテナ内）
DB_PATH=/app/data/fuji-calendar.db
```

### Redis設定

#### REDIS_HOST
- **説明**: Redisサーバーのホスト名
- **デフォルト**: `localhost`

```bash
# ローカル環境
REDIS_HOST=localhost

# Docker環境
REDIS_HOST=redis
```

#### REDIS_PORT
- **説明**: Redisサーバーのポート番号
- **デフォルト**: `6379`

```bash
REDIS_PORT=6379
```

#### REDIS_URL (オプション)
- **説明**: Redis接続URL（ホスト・ポートより優先）
- **フォーマット**: `redis://[username:password@]host:port[/database]`

```bash
# ローカル環境
REDIS_URL=redis://localhost:6379

# 認証付き
REDIS_URL=redis://user:password@redis-server:6379/0
```

## セキュリティ設定（本番環境必須）

### JWT_SECRET
- **説明**: JWTアクセストークンの署名に使用する秘密鍵
- **要件**: **32文字以上の安全な文字列**
- **⚠️ 重要**: 本番環境では必ず変更してください

```bash
# 悪い例（デフォルト値のまま）
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters

# 良い例（安全な秘密鍵）
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### REFRESH_SECRET
- **説明**: JWTリフレッシュトークンの署名に使用する秘密鍵
- **要件**: **32文字以上の安全な文字列（JWT_SECRETとは異なる値）**
- **⚠️ 重要**: 本番環境では必ず変更してください

```bash
# 悪い例
REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-minimum-32-characters

# 良い例
REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
```

### 安全な秘密鍵の生成方法

```bash
# OpenSSLを使用した生成
openssl rand -base64 32

# Node.jsを使用した生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Pythonを使用した生成
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### TOKEN_EXPIRY / REFRESH_EXPIRY
- **説明**: トークンの有効期限
- **デフォルト**: `1h` / `7d`
- **フォーマット**: 時間文字列（例: `30m`, `2h`, `1d`, `7d`）

```bash
# アクセストークン有効期限（短めに設定）
TOKEN_EXPIRY=1h

# リフレッシュトークン有効期限（長めに設定）
REFRESH_EXPIRY=7d
```

## CORS設定

#### FRONTEND_URL
- **説明**: フロントエンドアプリケーションのURL（CORS設定用）
- **本番環境**: 実際のドメインを設定
- **開発環境**: 通常は不要

```bash
# 本番環境
FRONTEND_URL=https://fuji-calendar.your-domain.com

# 複数ドメイン対応の場合はコード内で配列として設定
# CORS_ORIGINS=https://domain1.com,https://domain2.com
```

## ログ設定

### LOG_LEVEL
- **説明**: ログ出力レベル
- **設定値**: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- **推奨**:
  - 開発環境: `debug`
  - 本番環境: `info`

```bash
# 開発環境
LOG_LEVEL=debug

# 本番環境
LOG_LEVEL=info
```

### ENABLE_FILE_LOGGING
- **説明**: ファイルへのログ出力を有効にするか
- **設定値**: `true` / `false`
- **推奨**: 本番環境では `true`

```bash
# 本番環境
ENABLE_FILE_LOGGING=true

# 開発環境
ENABLE_FILE_LOGGING=false
```

### LOG_DIR
- **説明**: ログファイルの出力ディレクトリ
- **デフォルト**: `./logs`
- **注意**: ディレクトリが存在しない場合は自動作成されます

```bash
# 開発環境
LOG_DIR=./logs

# 本番環境
LOG_DIR=/var/log/fuji-calendar
```

## パフォーマンス設定

### CALCULATION_BATCH_SIZE
- **説明**: 天体計算のバッチサイズ
- **デフォルト**: `10`
- **推奨**: `5-20`（サーバースペックに応じて調整）

```bash
CALCULATION_BATCH_SIZE=10
```

### キュー同時実行数設定

#### QUEUE_CONCURRENCY_LOCATION
- **説明**: 地点別計算の同時実行数
- **デフォルト**: `1`
- **推奨**: `1-2`

#### QUEUE_CONCURRENCY_MONTHLY
- **説明**: 月間計算の同時実行数
- **デフォルト**: `2`
- **推奨**: `2-4`

#### QUEUE_CONCURRENCY_DAILY
- **説明**: 日別計算の同時実行数
- **デフォルト**: `4`
- **推奨**: `4-8`

```bash
QUEUE_CONCURRENCY_LOCATION=1
QUEUE_CONCURRENCY_MONTHLY=2
QUEUE_CONCURRENCY_DAILY=4
```

## メンテナンス設定

### AUTO_CLEANUP_ENABLED
- **説明**: 自動クリーンアップの有効化
- **設定値**: `true` / `false`
- **推奨**: `true`

### CACHE_RETENTION_DAYS
- **説明**: キャッシュデータの保持日数
- **デフォルト**: `90`
- **推奨**: `30-180`

### HISTORICAL_RETENTION_YEARS
- **説明**: 履歴データの保持年数
- **デフォルト**: `10`
- **推奨**: `5-20`

```bash
AUTO_CLEANUP_ENABLED=true
CACHE_RETENTION_DAYS=90
HISTORICAL_RETENTION_YEARS=10
```

## 環境別設定例

### 開発環境 (.env.development)

```bash
# アプリケーション設定
NODE_ENV=development
PORT=8000

# データベース設定
DB_PATH=./data/fuji-calendar.db

# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379

# 認証設定（開発用）
JWT_SECRET=development-jwt-secret-32-characters-minimum
REFRESH_SECRET=development-refresh-secret-32-characters-minimum
TOKEN_EXPIRY=24h
REFRESH_EXPIRY=30d

# ログ設定
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=false

# パフォーマンス設定
CALCULATION_BATCH_SIZE=5
QUEUE_CONCURRENCY_LOCATION=1
QUEUE_CONCURRENCY_MONTHLY=1
QUEUE_CONCURRENCY_DAILY=2

# メンテナンス設定
AUTO_CLEANUP_ENABLED=false
CACHE_RETENTION_DAYS=7
HISTORICAL_RETENTION_YEARS=1
```

### 本番環境 (.env.production)

```bash
# アプリケーション設定
NODE_ENV=production
PORT=8000

# データベース設定
DB_PATH=/app/data/fuji-calendar.db

# Redis設定
REDIS_HOST=redis
REDIS_PORT=6379

# 認証設定（本番用 - 必ず変更）
JWT_SECRET=your-production-jwt-secret-must-be-32-chars-or-longer
REFRESH_SECRET=your-production-refresh-secret-must-be-32-chars-or-longer
TOKEN_EXPIRY=1h
REFRESH_EXPIRY=7d

# CORS設定
FRONTEND_URL=https://fuji-calendar.your-domain.com

# ログ設定
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_DIR=/app/logs

# パフォーマンス設定
CALCULATION_BATCH_SIZE=10
QUEUE_CONCURRENCY_LOCATION=1
QUEUE_CONCURRENCY_MONTHLY=2
QUEUE_CONCURRENCY_DAILY=4

# メンテナンス設定
AUTO_CLEANUP_ENABLED=true
CACHE_RETENTION_DAYS=90
HISTORICAL_RETENTION_YEARS=10
```

## Docker環境での設定

### docker-compose.yml

```yaml
services:
  app:
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-8000}
      - DB_PATH=${DB_PATH:-/app/data/fuji-calendar.db}
      - REDIS_HOST=${REDIS_HOST:-redis}
      - REDIS_PORT=${REDIS_PORT:-6379}
      - JWT_SECRET=${JWT_SECRET}
      - REFRESH_SECRET=${REFRESH_SECRET}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ENABLE_FILE_LOGGING=${ENABLE_FILE_LOGGING:-true}
```

### 環境変数ファイルの指定

```bash
# 特定の環境ファイルを使用
docker-compose --env-file .env.production up -d

# 複数ファイルの組み合わせ
docker-compose --env-file .env --env-file .env.local up -d
```

## 設定値検証

### 起動時チェック項目

アプリケーション起動時に以下が自動チェックされます：

1. **JWT秘密鍵の長さ**: 32文字以上
2. **データベースファイルアクセス**: 読み書き権限
3. **Redis接続**: 接続可能性
4. **ログディレクトリ**: 書き込み権限

### 手動検証コマンド

```bash
# 設定値の確認
npm run check:config

# データベース接続テスト
npm run test:db

# Redis接続テスト
npm run test:redis

# 全体ヘルスチェック
curl http://localhost:8000/api/health
```

## トラブルシューティング

### よくある設定ミス

#### 1. JWT秘密鍵が短い
```bash
# エラー: JWT secret must be at least 32 characters
# 対処: 32文字以上の秘密鍵を設定
JWT_SECRET=$(openssl rand -base64 32)
```

#### 2. Redis接続できない
```bash
# エラー: Redis connection failed
# 対処: Redis設定確認
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

#### 3. ログディレクトリの権限エラー
```bash
# エラー: Permission denied
# 対処: ディレクトリ権限の修正
sudo mkdir -p /var/log/fuji-calendar
sudo chown $USER:$USER /var/log/fuji-calendar
```

#### 4. データベースファイルロック
```bash
# エラー: Database is locked
# 対処: プロセス確認・再起動
lsof | grep fuji-calendar.db
sudo systemctl restart fuji-calendar
```

## セキュリティベストプラクティス

### 秘密情報の管理

1. **バージョン管理から除外**
```bash
# .gitignore に追加
.env
.env.local
.env.production
```

2. **Docker Secrets使用**（本番環境推奨）
```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  refresh_secret:
    file: ./secrets/refresh_secret.txt

services:
  app:
    secrets:
      - jwt_secret
      - refresh_secret
```

3. **環境変数の暗号化**
```bash
# sops使用例
sops -e .env.production > .env.production.enc
```

### 定期的な秘密鍵ローテーション

```bash
# 新しい秘密鍵生成
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_REFRESH_SECRET=$(openssl rand -base64 32)

# 段階的な更新（ダウンタイムなし）
# 1. 新しい秘密鍵を追加設定
# 2. 古い秘密鍵での検証も一時的に許可
# 3. 全てのトークンが新しい秘密鍵になったら古い秘密鍵を削除
```