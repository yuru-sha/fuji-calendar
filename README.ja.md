# ダイヤモンド富士・パール富士カレンダー - ダイヤモンド富士・パール富士撮影ガイド
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yuru-sha/fuji-calendar)

**バージョン 0.1.0**

ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示するカレンダーアプリケーション。写真愛好家が効率的に撮影計画を立てられるよう、Astronomy Engineによる高精度な天体計算に基づいた正確な情報を提供します。

![ダイヤモンド富士](docs/images/diamond_fuji_small.png) ![パール富士](docs/images/pearl_fuji_small.png)

## 特徴

- 📅 **月間カレンダー表示**: ダイヤモンド富士・パール富士の発生日を視覚的に表示
- 🏔️ **撮影地点情報**: 全国の撮影スポットの詳細情報とアクセス方法
- ⏰ **高精度天体計算**: Astronomy Engineを使用した精密な天体位置計算
- 🗺️ **地図表示**: Leafletを使用した撮影地点と富士山の位置関係表示
- 🚗 **ルートナビゲーション**: Google Maps連携による現在地からの最適ルート案内
- ⭐ **お気に入り機能**: 撮影地点・イベントの保存・管理・エクスポート機能
- 🌤️ **天気予報連携**: 7日間天気予報と撮影条件レコメンデーション
- 📊 **撮影推奨度**: 天体計算に基づく撮影条件の評価
- 🔐 **管理機能**: 管理者による撮影地点の登録・管理
- 🕐 **JST時刻対応**: 日本標準時での正確な時刻表示
- 🎯 **パール富士精密検索**: 月の出入り時刻前後の詳細検索
- 🚀 **高性能**: Pino構造化ログ・Redisキャッシュによる最適化

## 技術スタック

### フロントエンド
- React 18
- TypeScript (strict mode)
- Tailwind CSS v3.4.17 (utility-first styling)
- CSS Modules (component-specific styles)
- Leaflet (地図表示)
- LocalStorage API (お気に入り機能)

### バックエンド
- Node.js
- Express
- TypeScript (strict mode)
- PostgreSQL 15 + Prisma ORM (データベース)
- Redis (キャッシュ・キューシステム with BullMQ)
- Astronomy Engine (高精度天体計算)
- Pino (構造化ログ with パフォーマンス最適化)
- bcrypt (パスワードハッシュ化)
- JWT (認証 with リフレッシュトークン)

### セキュリティ・インフラ
- Helmet (セキュリティヘッダー)
- Rate limiting (100req/min 公開, 60req/min 管理, 5req/15min 認証)
- CSRF保護
- XSS対策
- SQLインジェクション対策
- ブルートフォース攻撃対策
- Docker & Docker Compose
- nginx (リバースプロキシ)

## 🚀 クイックスタート

**5分で動かす**: [QUICKSTART.md](QUICKSTART.md)

### 必要な環境
- Docker & Docker Compose v2 **推奨**
- Node.js 18+ (初期設定のみ)

## インストール・セットアップ

### Docker環境（推奨）

```bash
# 1. Clone & Setup
git clone <repository-url>
cd fuji-calendar
cp .env.example .env

# 2. Database Migration
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 10
npx prisma migrate deploy

# 3. Initial Setup
node scripts/admin/create-admin.js          # admin/admin123
node scripts/setup-initial-data.js          # Sample locations

# 4. Start Application
docker-compose -f docker-compose.dev.yml up -d
```

### アクセス
- **フロントエンド**: http://localhost:3000
- **管理者ログイン**: admin / admin123

### 本番環境

1. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを編集して本番用の値を設定（JWT_SECRET等）
```

2. 本番環境をデプロイ
```bash
# 本番環境起動
docker-compose up -d

# または管理スクリプト使用
bash scripts/config/docker-prod.sh deploy
```

3. アクセス
- アプリケーション: http://localhost

### Docker管理コマンド

```bash
# 開発環境
bash scripts/config/docker-dev.sh start      # 開発環境起動
bash scripts/config/docker-dev.sh stop       # 停止
bash scripts/config/docker-dev.sh logs       # ログ表示
bash scripts/config/docker-dev.sh status     # 状態確認
bash scripts/config/docker-dev.sh clean      # クリーンアップ

# 本番環境
bash scripts/config/docker-prod.sh deploy    # デプロイ
bash scripts/config/docker-prod.sh start     # 起動
bash scripts/config/docker-prod.sh stop      # 停止
bash scripts/config/docker-prod.sh backup    # データベースバックアップ
bash scripts/config/docker-prod.sh health    # ヘルスチェック
```

## ローカル環境（Dockerなし）

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd fuji-calendar
```

2. Redisを起動
```bash
# Dockerでの起動
docker run -d --name redis-fuji -p 6379:6379 redis:7-alpine

# またはローカルインストール
redis-server
```

3. 依存関係をインストール
```bash
npm install
```

4. 環境変数を設定（オプション）
```bash
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定
```

5. データベースを初期化
```bash
npm run build:server
npm run start
# 初回起動時にデータベースとサンプルデータが自動作成されます
```

## 開発

### 開発サーバーの起動

フロントエンドとバックエンドを同時に起動:
```bash
npm run dev
```

個別に起動する場合:
```bash
# バックエンドのみ
npm run dev:server

# フロントエンドのみ
npm run dev:client
```

### ビルド

```bash
# 本番ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint
npm run lint:fix
```

### テスト

```bash
# テスト実行
npm test

# テスト監視モード
npm run test:watch
```

## API エンドポイント

### カレンダーAPI

- `GET /api/calendar/:year/:month` - 月間カレンダーデータ
- `GET /api/events/:date` - 特定日のイベント詳細
- `GET /api/events/upcoming` - 今後のイベント
- `GET /api/calendar/:year/:month/best` - おすすめ撮影日
- `POST /api/calendar/suggest` - 撮影計画サジェスト

### 撮影地点API

- `GET /api/locations` - 撮影地点一覧
- `GET /api/locations/:id` - 撮影地点詳細
- `GET /api/locations/:id/yearly/:year` - 特定地点の年間イベント

### 管理者API

- `POST /api/auth/login` - 管理者ログイン
- `POST /api/auth/logout` - ログアウト
- `POST /api/auth/refresh` - トークンリフレッシュ
- `POST /api/admin/locations` - 撮影地点作成
- `PUT /api/admin/locations/:id` - 撮影地点更新
- `DELETE /api/admin/locations/:id` - 撮影地点削除

### システムAPI

- `GET /api/health` - ヘルスチェック
- 天気予報データ連携（模擬実装）

## ディレクトリ構造

```
fuji-calendar/
├── src/
│   ├── client/          # フロントエンドコード
│   │   ├── components/  # Reactコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── hooks/       # カスタムフック
│   │   ├── services/    # API・お気に入りサービス
│   │   ├── types/       # 型定義
│   │   └── assets/      # 静的リソース
│   ├── server/          # バックエンドコード
│   │   ├── controllers/ # APIコントローラー
│   │   ├── models/      # データモデル
│   │   ├── services/    # ビジネスロジック
│   │   ├── middleware/  # Express ミドルウェア
│   │   └── database/    # データベース設定
│   └── shared/          # 共通型定義・ユーティリティ
│       ├── types/       # TypeScript型定義
│       └── utils/       # 共通ユーティリティ
├── tests/               # テストファイル
├── data/                # データベースファイル
└── dist/                # ビルド出力
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーポート | 8000 |
| `NODE_ENV` | 実行環境 | development |
| `DATABASE_URL` | PostgreSQL接続URL | postgresql://user:pass@localhost:5432/fuji_calendar |
| `JWT_SECRET` | JWT署名シークレット ⚠️ **本番要変更** | デフォルト値 |
| `REFRESH_SECRET` | リフレッシュトークンシークレット ⚠️ **本番要変更** | デフォルト値 |
| `REDIS_HOST` | Redisホスト | localhost |
| `REDIS_PORT` | Redisポート | 6379 |
| `FRONTEND_URL` | フロントエンドURL（本番用） | - |
| `LOG_LEVEL` | ログレベル | info (本番), debug (開発) |
| `ENABLE_FILE_LOGGING` | ファイルログ出力 | false |
| `LOG_DIR` | ログディレクトリパス | ./logs |

## 機能詳細

### ダイヤモンド富士撮影
ダイヤモンド富士は太陽が富士山頂に重なってダイヤモンドのような効果を作る現象です。アプリケーションはこの現象を観測・撮影できる正確な時刻と場所を計算します。

### パール富士撮影
パール富士は月が富士山頂に重なる現象です。アプリケーションは月の出入り時刻と最適な観測地点の詳細な計算を提供します。

### 高精度計算
- Astronomy Engineによる正確な天体力学計算
- 大気屈折補正
- 地球楕円体モデル考慮
- 最適観測期間の自動シーズン検出
- ±1.5度以内の方位角精度
- 最適タイミングの10秒間隔計算

### 天気情報システム
- 7日間天気予報連携（模擬実装）
- 天気に基づく撮影条件レコメンデーション
- 天気アイコンとカラーコード付きレコメンデーション
- イベント詳細表示との統合

### 管理機能
- ページネーション・検索付き地点管理
- 一括操作用JSON インポート・エクスポート
- パスワード変更機能
- 28箇所以上の有名観測地点を収録した包括的地点データベース
- アカウントロック保護付きJWT認証
- ブルートフォース攻撃防止

### UI/UX改善
- 1280px最大幅レイアウトのレスポンシブデザイン
- 統一されたスタイリングのためのTailwind CSS統合
- より良いイベントアイコンでカレンダー視認性向上
- スムーズなアニメーションとホバー効果
- アクセシブルなキーボードナビゲーション
- 🗺️ アイコン統合による直感的ルートナビゲーション
- 撮影地点へのワンクリックルートプランニング

## 貢献

プルリクエストや Issue の報告を歓迎します。

## サポート

質問や問題がある場合は、GitHub Issues でお気軽にお尋ねください。

## ライセンス

MIT License

## 謝辞

- 精密な天体計算を提供するAstronomy Engine
- 撮影地点データベースへの貢献者
- 貴重なフィードバックと提案をいただいた写真コミュニティ