# インストールガイド

ダイヤモンド富士・パール富士カレンダーのインストールと初期設定手順について説明します。

## システム要件

### 推奨環境
- Docker 20.10以上 & Docker Compose v2
- 空きメモリ: 2GB以上
- 空きストレージ: 5GB以上

### ローカル開発環境
- Node.js 18以上
- PostgreSQL 14以上
- Redis 6以上

## Docker環境での設置（推奨）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd fuji-calendar
```

### 2. 開発環境の起動

```bash
# 開発環境起動（初回は自動でビルド）
./scripts/docker-dev.sh start

# ログの確認
./scripts/docker-dev.sh logs

# 停止
./scripts/docker-dev.sh stop
```

### 3. アクセス確認

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- API健康状態: http://localhost:8000/api/health

## 本番環境での設置

### 1. 環境変数の設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env

# 本番用の値を設定
nano .env
```

**必須設定項目:**
```bash
NODE_ENV=production
JWT_SECRET=your-very-secure-jwt-secret-here
REFRESH_SECRET=your-very-secure-refresh-secret-here
FRONTEND_URL=https://your-domain.com
```

### 2. 本番環境のデプロイ

```bash
# 本番環境をデプロイ
./scripts/docker-prod.sh deploy

# 起動確認
./scripts/docker-prod.sh health
```

### 3. SSL証明書の設定（オプション）

```bash
# Let's Encryptを使用する場合
docker run --rm \
  -v "${PWD}/nginx/ssl:/etc/letsencrypt" \
  -p 80:80 \
  certbot/certbot \
  certonly --standalone \
  -d your-domain.com
```

## ローカル環境での設置

### 1. Redisの起動

```bash
# Dockerを使用する場合
docker run -d --name redis-fuji -p 6379:6379 redis:7-alpine

# または、ローカルインストール
redis-server
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースの初期化

```bash
# PostgreSQLの起動（Dockerを使用する場合）
docker run -d --name postgres-fuji -e POSTGRES_PASSWORD=password -e POSTGRES_DB=fuji_calendar -p 5432:5432 postgres:14

# Prismaマイグレーション実行
npx prisma migrate dev

# 初回起動（サンプルデータが自動作成）
npm run start
```

### 4. 開発サーバーの起動

```bash
# フロントエンドとバックエンドを同時に起動
npm run dev

# または個別に起動
npm run dev:server  # バックエンドのみ
npm run dev:client  # フロントエンドのみ
```

## データベース初期設定

### サンプルデータの確認

初回起動時に以下の撮影地点が自動登録されます：

1. 竜ヶ岳（山梨県）
2. 三ツ峠山（山梨県）
3. 海ほたるPA（千葉県）
4. 江の島（神奈川県）
5. 房総スカイライン鋸山PA（千葉県）
6. 毛無山（静岡県）

### 管理者アカウントの作成

```bash
# 管理者アカウントを作成（admin/admin123）
node scripts/create-admin.js

# または、直接Prismaで作成
npx prisma db seed
```

## 設定ファイル

### 環境変数一覧

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `NODE_ENV` | 実行環境 | development | ○ |
| `PORT` | サーバーポート | 8000 | × |
| `DATABASE_URL` | PostgreSQL接続URL | postgresql://user:pass@localhost:5432/fuji_calendar | × |
| `JWT_SECRET` | JWT署名シークレット | ランダム生成 | 本番○ |
| `REFRESH_SECRET` | リフレッシュトークンシークレット | ランダム生成 | 本番○ |
| `FRONTEND_URL` | フロントエンドURL | localhost:3000 | 本番○ |
| `LOG_LEVEL` | ログレベル | info/debug | × |
| `ENABLE_FILE_LOGGING` | ファイルログ出力 | false | × |
| `LOG_DIR` | ログディレクトリ | ./logs | × |

### ログ設定

```bash
# ログレベルの設定
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal

# ファイル出力の有効化
ENABLE_FILE_LOGGING=true
LOG_DIR=/var/log/fuji-calendar
```

## トラブルシューティング

### よくある問題

#### 1. ポートが使用中のエラー

```bash
# 使用中のプロセスを確認
lsof -i :3000
lsof -i :8000

# プロセスを終了
kill -9 <PID>
```

#### 2. PostgreSQL接続エラー

```bash
# PostgreSQLの起動確認
psql -h localhost -U postgres -d fuji_calendar -c "\l"

# Prismaマイグレーション状態確認
npx prisma migrate status
```

#### 3. Redisの接続エラー

```bash
# Redis の起動確認
docker ps | grep redis
redis-cli ping  # "PONG" が返ればOK
```

#### 4. Docker関連のエラー

```bash
# Dockerイメージの再構築
./scripts/docker-dev.sh clean
./scripts/docker-dev.sh start

# ボリュームの削除（データ消失注意）
docker volume prune
```

### ログの確認

```bash
# 開発環境
./scripts/docker-dev.sh logs

# 本番環境
./scripts/docker-prod.sh logs

# ローカル環境
tail -f logs/app.log
```

### 再インストール

```bash
# 開発環境の完全クリーンアップ
./scripts/docker-dev.sh clean
npm run clean
rm -rf node_modules logs/*

# データベースのリセット
npx prisma migrate reset

# 再インストール
npm install
npm run dev
```

## パフォーマンス最適化

### 本番環境での推奨設定

1. **CPUコア数**: 2コア以上
2. **メモリ**: 4GB以上（複数地点の計算時）
3. **ストレージ**: SSD推奨
4. **プロキシ**: Nginx（同梱設定）

### モニタリング

```bash
# システムリソースの監視
./scripts/docker-prod.sh health

# ログの監視
tail -f logs/app.log | grep ERROR
```