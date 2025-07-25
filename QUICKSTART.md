# クイックスタートガイド

ダイヤモンド富士・パール富士カレンダーを最速で動かすための手順です。

## 🚀 5分で起動

### 前提条件
- Docker 20.10以上 & Docker Compose v2
- Node.js 18以上（初期設定のみ）

### 1. リポジトリクローン

```bash
git clone <repository-url>
cd fuji-calendar
```

### 2. 初期設定（自動）

```bash
# 環境変数コピー
cp .env.example .env

# データベース起動 & マイグレーション
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 10
npx prisma migrate deploy

# 管理者アカウント作成（admin/admin123）
node scripts/admin/create-admin.js

# サンプルデータ生成
node scripts/setup-initial-data.js
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

## 📋 初期データ

起動時に6つのサンプル撮影地点が自動登録されます：

1. **竜ヶ岳**（山梨県） - 富士五湖エリアの定番
2. **三ツ峠山**（山梨県） - 河口湖を含む絶景
3. **海ほたるPA**（千葉県） - 東京湾越しのダイヤモンド富士
4. **江の島**（神奈川県） - 湘南からの夕日富士
5. **房総スカイライン鋸山PA**（千葉県） - 東京湾の絶景スポット
6. **毛無山**（静岡県） - 朝霧高原からのパール富士

## 🛠️ トラブルシューティング

### データベース接続エラー
```bash
# PostgreSQL接続テスト
node scripts/testing/test-postgres-connection.js

# データベース状態確認
node scripts/testing/check_db_status.js
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