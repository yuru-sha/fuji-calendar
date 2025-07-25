# Docker 環境構成

ダイヤモンド富士・パール富士カレンダーのDocker環境を構築するための設定ファイル群です。

## 構成オプション

### 本番環境 (推奨)
PostgreSQL + Redis + Nginx による高性能構成。

```bash
# 本番環境起動
docker-compose up -d

# または管理スクリプト使用
bash scripts/config/docker-prod.sh start
```

**コンテナ:**
- `postgres`: PostgreSQL 15 データベース
- `backend`: Express.js API サーバー (Node.js)
- `nginx`: リバースプロキシ + 静的ファイル配信
- `redis`: キューシステム (BullMQ)

### 開発環境
ホットリロード対応の開発用構成。

```bash
# 開発環境起動
docker-compose -f docker-compose.dev.yml up

# または管理スクリプト使用
bash scripts/config/docker-dev.sh start
```

**コンテナ:**
- `postgres`: PostgreSQL 15 データベース (開発用)
- `app`: Express.js + React 開発サーバー
- `redis`: キューシステム (開発用)

## ディレクトリ構造

```
docker/
├── README.md                    # このファイル
├── Dockerfile.monolith          # 本番環境用 (統合ビルド)
├── Dockerfile.dev               # 開発環境用 (ホットリロード)
├── backend/
│   └── Dockerfile              # バックエンド専用 (マイクロサービス用)
└── frontend/
    ├── Dockerfile              # フロントエンド用 (Nginx)
    ├── nginx.conf              # Nginx メイン設定
    └── default.conf            # サイト設定 + APIプロキシ
```

## 開発フロー

### 1. 初回セットアップ
```bash
# 環境変数設定
cp .env.example .env
nano .env

# 開発環境起動
docker-compose -f docker-compose.dev.yml up
```

### 2. 本番環境デプロイ
```bash
# 本番用ビルドとデプロイ
bash scripts/config/docker-prod.sh deploy

# ヘルスチェック
bash scripts/config/docker-prod.sh health
```

## 環境変数

必須の環境変数:

```bash
# データベース設定
DB_NAME=fuji_calendar
DB_USER=fuji_user
DB_PASSWORD=prod_password_change_me

# JWT設定
JWT_SECRET=your-super-secret-jwt-key
REFRESH_SECRET=your-super-secret-refresh-key

# ログ設定
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true

# 本番環境用
FRONTEND_URL=https://your-domain.com
```

## ネットワーク構成

- **本番環境**: `fuji_calendar_network`
- **開発環境**: `fuji_calendar_network`

## ボリューム管理

```bash
# PostgreSQLバックアップ
docker exec fuji_calendar_postgres_prod pg_dump -U fuji_user fuji_calendar > backup-$(date +%Y%m%d).sql

# ログ確認
docker exec fuji-calendar-backend tail -f /app/logs/fuji-calendar-$(date +%Y-%m-%d).log

# データベース接続テスト
docker exec fuji_calendar_postgres_prod psql -U fuji_user -d fuji_calendar -c "SELECT COUNT(*) FROM locations;"
```

## トラブルシューティング

### よくある問題

1. **ポート競合**
   ```bash
   # 使用中ポートの確認
   lsof -i :8000
   ```

2. **ビルド失敗**
   ```bash
   # キャッシュクリア
   docker system prune -f
   docker-compose build --no-cache
   ```

3. **データベース初期化**
   ```bash
   # ボリューム削除 (データ消失注意)
   docker-compose down -v
   ```

### デバッグコマンド

```bash
# コンテナ内シェル
docker exec -it fuji-calendar-app sh

# ログ確認
docker-compose logs -f app

# リソース使用量
docker stats
```

## パフォーマンス調整

### PostgreSQL設定
- **バージョン**: PostgreSQL 15 Alpine
- **文字エンコーディング**: UTF-8
- **タイムゾーン**: Asia/Tokyo

### Redis設定
- **メモリ制限**: 512MB
- **削除ポリシー**: `allkeys-lru`
- **永続化**: AOF有効

### Nginx設定
- **Gzip圧縮**: 有効 (レベル6)
- **静的ファイルキャッシュ**: 1年
- **Worker数**: CPU自動検出

## セキュリティ

### 設定済み保護
- セキュリティヘッダー (X-Frame-Options, CSP等)
- サーバー情報隠蔽
- 不要ファイルアクセス禁止
- ヘルスチェックログ除外

### 推奨設定
- JWT秘密鍵の定期ローテーション
- HTTPS証明書の設定
- ファイアウォール設定