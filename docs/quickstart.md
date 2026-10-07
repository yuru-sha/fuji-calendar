# クイックスタートガイド

ダイヤモンド富士・パール富士カレンダーを最速で動かすための手順です。

## 🚀 5分で起動

### 前提条件
- Docker 20.10以上 & Docker Compose v2
- Node.js 26.10.0以上 / npm 11.19.1以上（ローカル開発・初期設定用）

### 超高速セットアップ（ワンライナー）
```bash
# 全て一行で実行
git clone <repository-url> && cd fuji-calendar && cp .env.example .env && mkdir -p data/postgres data/redis && docker-compose -f docker-compose.dev.yml up postgres -d && sleep 20 && DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" npx prisma migrate deploy && DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/admin/create-admin.js && docker-compose -f docker-compose.dev.yml up -d
```

### 1. リポジトリクローン

```bash
git clone <repository-url>
cd fuji-calendar
```

### 2. 初期設定（自動）

```bash
# 環境変数コピー
cp .env.example .env

# データディレクトリ作成
mkdir -p data/postgres data/redis

# データベース起動
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 15

# 環境変数を一時的にローカル接続用に設定してマイグレーション実行
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" npx prisma migrate deploy

# 管理者アカウント作成（admin/admin123）
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/admin/create-admin.js
```

### 3. アプリケーション起動

```bash
# 開発環境起動
docker-compose -f docker-compose.dev.yml up -d

# アクセス確認
curl http://localhost:3000/api/health
```

### 4. アクセス

- **フロントエンド**: http://localhost:3000
- **管理者ログイン**: admin / admin123

## 📋 初期セットアップ後の作業

セットアップ完了後、管理者画面で撮影地点を登録してください：

1. **管理者ログイン**: http://localhost:3000 (admin / admin123)
2. **地点登録**: 管理画面から正確な撮影地点データを手動登録
3. **データ生成**: 地点登録時に自動でダイヤモンド富士・パール富士のイベントデータが計算されます

## 🛠️ トラブルシューティング

### データベース接続エラー
```bash
# PostgreSQLコンテナが起動しているか確認
docker ps | grep postgres

# PostgreSQL接続テスト（ローカルポート経由）
docker exec $(docker ps --filter name=postgres --format "{{.ID}}") psql -U fuji_user -d fuji_calendar -c "SELECT version();"

# マイグレーション再実行（接続情報を明示）
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" npx prisma migrate deploy
```

### Prismaエラー (P1001: Can't reach database server)
```bash
# PostgreSQLが完全に起動するまで待機
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 20

# ローカルホスト経由で接続確認
psql -h localhost -U fuji_user -d fuji_calendar -c "SELECT 1;"
# パスワード: dev_password_123

# それでもエラーの場合は、コンテナを再起動
docker-compose -f docker-compose.dev.yml restart postgres
```

### ポート競合エラー
```bash
# 使用中ポートの確認
lsof -i :3000
lsof -i :5432

# コンテナ停止
docker-compose -f docker-compose.dev.yml down
```

### データリセット
```bash
# 完全クリーンアップ
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f

# 再セットアップ
# 上記の手順2から再実行
```

## 📚 詳細ドキュメント

- [完全インストールガイド](docs/installation.md)
- [Docker環境詳細](docker/README.md)
- [スクリプト一覧](scripts/README.md)
- [API仕様](docs/api.md)

## 🔧 開発者向け

### コードチェック
```bash
npm run typecheck  # TypeScript型チェック
npm run lint       # ESLint実行
```

### データベース管理
```bash
npx prisma studio  # Prisma Studio起動
npx prisma db push # スキーマ同期
```

### デバッグ
```bash
# 天体計算デバッグ
node scripts/debug/debug-diamond-fuji.js

# パフォーマンス分析
node scripts/utilities/performance-analysis.js
```