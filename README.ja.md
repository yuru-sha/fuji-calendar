# ダイヤモンド富士・パール富士カレンダー
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yuru-sha/fuji-calendar)

**バージョン 0.3.0** - モノレポ構成・高性能版

ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示する Web アプリケーション。写真愛好家が効率的に撮影計画を立てられるよう、Astronomy Engine による高精度な天体計算と現代的なモノレポアーキテクチャに基づいた高性能なプラットフォームを提供します。

## 特徴

- 📅 **月間カレンダー表示**: ダイヤモンド富士・パール富士の発生日を視覚的に表示
- 🏔️ **撮影地点情報**: 全国の撮影スポットの詳細情報とアクセス方法
- ⏰ **高精度天体計算**: Astronomy Engine を使用した精密な天体位置計算
- 🗺️ **地図表示**: Leaflet を使用した撮影地点と富士山の位置関係表示
- 🚗 **ルートナビゲーション**: Google Maps 連携による現在地からの最適ルート案内
- ⭐ **お気に入り機能**: 撮影地点・イベントの保存・管理・エクスポート機能
- 🌤️ **天気予報連携**: 7 日間天気予報と撮影条件レコメンデーション
- 📊 **撮影推奨度**: 天体計算に基づく撮影条件の評価
- 🔐 **管理機能**: 管理者による撮影地点の登録・管理
- 🕐 **JST 時刻対応**: 日本標準時での正確な時刻表示
- 🎯 **パール富士精密検索**: 月の出入り時刻前後の詳細検索
- 🚀 **高性能**: Pino 構造化ログ・ Redis キャッシュによる最適化
- 🏗️ **モノレポ構成**: 効率的な開発・型安全な共有パッケージ
- ⚡ **非同期処理**: BullMQ によるバックグラウンド天体計算

## v0.3.0 の主要改善点

### アーキテクチャ刷新
- **モノレポ化**: npm workspaces による効率的なパッケージ管理
- **PostgreSQL + Prisma**: SQLite から PostgreSQL への移行で本格運用対応
- **Redis + BullMQ**: 高性能キューシステムによる非同期処理
- **依存性注入**: DIContainer による保守性向上
- **厳密な型安全性**: 全パッケージで TypeScript strict mode

### パフォーマンス大幅向上
- **構造化ログ**: Pino による 5-10 倍のログ性能向上
- **非同期計算**: 重い天体計算をバックグラウンド処理化
- **最適化されたキャッシュ**: Redis による高速データアクセス
- **効率的なビルド**: Vite による高速フロントエンド開発

### 開発体験向上
- **コード整理**: ルートディレクトリのスクリプトファイルを scripts/ に整理
- **型安全な開発**: 共有パッケージによる一貫した型定義
- **統一された品質管理**: モノレポ全体での lint ・ typecheck
- **開発効率化**: 包括的なデバッグスクリプト群

## 技術スタック

### アーキテクチャ
- **モノレポ構成**: npm workspaces による効率的なパッケージ管理
- **型安全な開発**: TypeScript strict mode でフロント・バック・共有パッケージ全体

### フロントエンド (@fuji-calendar/client)
- React 18 + TypeScript (strict mode)
- Tailwind CSS v3.4.17 (utility-first styling)
- CSS Modules (component-specific styles)
- Leaflet (地図表示・ルート描画)
- Vite (高速ビルドツール)
- LocalStorage API (お気に入り機能)

### バックエンド (@fuji-calendar/server)
- Node.js + Express + TypeScript (strict mode)
- PostgreSQL 15 + Prisma ORM (データベース)
- Redis + BullMQ (キャッシュ・非同期キューシステム)
- Astronomy Engine (高精度天体計算)
- Pino (構造化ログ・ 5-10 倍パフォーマンス向上)
- bcrypt (パスワードハッシュ化)
- JWT (Access + Refresh Token 認証)

### 共有パッケージ
- **@fuji-calendar/types**: 共通型定義・インターフェース
- **@fuji-calendar/utils**: 時刻処理、ログ、フォーマッター
- **@fuji-calendar/ui**: 再利用可能 React コンポーネント
- **@fuji-calendar/shared**: 共通ビジネスロジック

### セキュリティ・インフラ
- Helmet (セキュリティヘッダー)
- Rate limiting (100req/min 公開, 60req/min 管理, 5req/15min 認証)
- CSRF 保護
- XSS 対策
- SQL インジェクション対策
- ブルートフォース攻撃対策
- Docker & Docker Compose
- nginx (リバースプロキシ)

## 🚀 クイックスタート

**5 分で動かす**: [QUICKSTART.md](QUICKSTART.md)

### 必要な環境
- Docker & Docker Compose v2 **推奨**
- Node.js 18+ (初期設定のみ)

## インストール・セットアップ

### Docker 環境（推奨）

```bash
# 1. Clone & Setup
git clone <repository-url>
cd fuji-calendar
cp .env.example .env

# 2. Database Migration
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 15
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" npx prisma migrate deploy

# 3. Initial Setup
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/admin/create-admin.js          # admin/admin123

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
# .env ファイルを編集して本番用の値を設定（JWT_SECRET 等）
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

### Docker 管理コマンド

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

## ローカル環境（Docker なし）

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd fuji-calendar
```

2. Redis を起動
```bash
# Docker での起動
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
# .env ファイルを編集して必要な環境変数を設定
```

5. データベースを初期化
```bash
npm run build:server
npm run start
# 初回起動時にデータベースとサンプルデータが自動作成されます
```

## 開発（モノレポ環境）

### 開発サーバーの起動

```bash
# フロントエンド・バックエンド・ワーカーを同時起動
npm run dev

# 個別起動
npm run dev:client    # フロントエンドのみ（ポート 3001）
npm run dev:server    # バックエンドのみ（ポート 3000）
npm run dev:worker    # バックグラウンドワーカーのみ
```

### ビルド・品質管理

```bash
# 全パッケージビルド
npm run build

# 個別ビルド
npm run build:client    # フロントエンドビルド
npm run build:server    # バックエンドビルド  
npm run build:packages  # 共有パッケージビルド

# 品質チェック
npm run typecheck       # TypeScript 型チェック（全パッケージ）
npm run lint           # ESLint（全パッケージ）
npm run lint:fix       # ESLint 自動修正

# パッケージ管理
npm run clean          # ビルド成果物と node_modules 削除
```

### パッケージ依存関係の追加

```bash
# 特定アプリケーションに追加
npm install <package> --workspace=apps/client
npm install <package> --workspace=apps/server

# 共有パッケージに追加  
npm install <package> --workspace=packages/types
npm install <package> --workspace=packages/utils
```

### テスト

```bash
# テスト実行
npm test

# テスト監視モード
npm run test:watch
```

## API エンドポイント

### カレンダー API

- `GET /api/calendar/:year/:month` - 月間カレンダーデータ
- `GET /api/events/:date` - 特定日のイベント詳細
- `GET /api/events/upcoming` - 今後のイベント
- `GET /api/calendar/:year/:month/best` - おすすめ撮影日
- `POST /api/calendar/suggest` - 撮影計画サジェスト

### 撮影地点 API

- `GET /api/locations` - 撮影地点一覧
- `GET /api/locations/:id` - 撮影地点詳細
- `GET /api/locations/:id/yearly/:year` - 特定地点の年間イベント

### 管理者 API

- `POST /api/auth/login` - 管理者ログイン
- `POST /api/auth/logout` - ログアウト
- `POST /api/auth/refresh` - トークンリフレッシュ
- `POST /api/admin/locations` - 撮影地点作成
- `PUT /api/admin/locations/:id` - 撮影地点更新
- `DELETE /api/admin/locations/:id` - 撮影地点削除

### システム API

- `GET /api/health` - ヘルスチェック
- 天気予報データ連携（模擬実装）

## ディレクトリ構造（モノレポ構成）

```
fuji-calendar/
├── apps/                        # アプリケーション
│   ├── client/                  # @fuji-calendar/client
│   │   ├── src/
│   │   │   ├── components/      # React コンポーネント
│   │   │   ├── pages/           # ページコンポーネント
│   │   │   ├── hooks/           # カスタムフック
│   │   │   ├── services/        # API ・お気に入りサービス
│   │   │   ├── features/        # 機能別コンポーネント
│   │   │   └── App.tsx
│   │   ├── public/              # 静的ファイル
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/                  # @fuji-calendar/server
│       ├── src/
│       │   ├── controllers/     # API コントローラー
│       │   ├── repositories/    # データアクセス層（Prisma）
│       │   ├── services/        # ビジネスロジック・天体計算
│       │   ├── middleware/      # Express ミドルウェア
│       │   ├── database/        # Prisma 設定
│       │   ├── di/              # 依存性注入コンテナ
│       │   ├── routes/          # API ルート定義
│       │   └── worker.ts        # バックグラウンドワーカー
│       └── package.json
├── packages/                    # 共有パッケージ
│   ├── types/                   # @fuji-calendar/types
│   │   └── src/                 # 共通型定義・インターフェース
│   ├── utils/                   # @fuji-calendar/utils  
│   │   └── src/                 # 時刻処理・ログ・フォーマッター
│   ├── ui/                      # @fuji-calendar/ui
│   │   └── src/                 # 再利用可能 React コンポーネント
│   └── shared/                  # @fuji-calendar/shared
│       └── src/                 # 共通ビジネスロジック
├── scripts/                     # 管理・開発スクリプト
│   ├── admin/                   # 管理者作成スクリプト
│   ├── debug/                   # デバッグ・検証スクリプト
│   ├── data-generation/         # データ生成スクリプト
│   └── config/                  # Docker 管理スクリプト
├── prisma/                      # Prisma スキーマ・マイグレーション
├── docker/                      # Docker 設定
├── nginx/                       # nginx 設定
├── tests/                       # テストファイル
├── docs/                        # プロジェクトドキュメント
├── package.json                 # モノレポルート設定
└── tsconfig.json                # 共通 TypeScript 設定
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーポート | 8000 |
| `NODE_ENV` | 実行環境 | development |
| `DATABASE_URL` | PostgreSQL 接続 URL | postgresql://user:pass@localhost:5432/fuji_calendar |
| `JWT_SECRET` | JWT 署名シークレット ⚠️ **本番要変更** | デフォルト値 |
| `REFRESH_SECRET` | リフレッシュトークンシークレット ⚠️ **本番要変更** | デフォルト値 |
| `REDIS_HOST` | Redis ホスト | localhost |
| `REDIS_PORT` | Redis ポート | 6379 |
| `FRONTEND_URL` | フロントエンド URL（本番用） | - |
| `LOG_LEVEL` | ログレベル | info (本番), debug (開発) |
| `ENABLE_FILE_LOGGING` | ファイルログ出力 | false |
| `LOG_DIR` | ログディレクトリパス | ./logs |

## 機能詳細

### ダイヤモンド富士撮影
ダイヤモンド富士は太陽が富士山頂に重なってダイヤモンドのような効果を作る現象です。アプリケーションはこの現象を観測・撮影できる正確な時刻と場所を計算します。

### パール富士撮影
パール富士は月が富士山頂に重なる現象です。アプリケーションは月の出入り時刻と最適な観測地点の詳細な計算を提供します。

### 高精度計算
- Astronomy Engine による正確な天体力学計算
- 大気屈折補正
- 地球楕円体モデル考慮
- 最適観測期間の自動シーズン検出
- ±1.5 度以内の方位角精度
- 最適タイミングの 10 秒間隔計算

### 天気情報システム
- 7 日間天気予報連携（模擬実装）
- 天気に基づく撮影条件レコメンデーション
- 天気アイコンとカラーコード付きレコメンデーション
- イベント詳細表示との統合

### 管理機能
- ページネーション・検索付き地点管理
- 一括操作用 JSON インポート・エクスポート
- パスワード変更機能
- 28 箇所以上の有名観測地点を収録した包括的地点データベース
- アカウントロック保護付き JWT 認証
- ブルートフォース攻撃防止

### UI/UX 改善
- 1280px 最大幅レイアウトのレスポンシブデザイン
- 統一されたスタイリングのための Tailwind CSS 統合
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

- 精密な天体計算を提供する Astronomy Engine
- 撮影地点データベースへの貢献者
- 貴重なフィードバックと提案をいただいた写真コミュニティ