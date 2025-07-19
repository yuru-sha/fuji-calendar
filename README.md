# 富士山カレンダー - ダイヤモンド富士・パール富士撮影ガイド

ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示するカレンダーアプリケーション。写真愛好家が効率的に撮影計画を立てられるよう、天体の位置計算に基づいた正確な情報を提供します。

## 特徴

- 📅 **月間カレンダー表示**: ダイヤモンド富士・パール富士の発生日を視覚的に表示
- 🏔️ **撮影地点情報**: 全国の撮影スポットの詳細情報とアクセス方法
- ⏰ **正確な時刻計算**: SunCalcライブラリを使用した精密な天体計算
- 🗺️ **地図表示**: Leafletを使用した撮影地点と富士山の位置関係表示
- 📊 **撮影推奨度**: 天体計算に基づく撮影条件の評価
- 🔐 **管理機能**: 管理者による撮影地点の登録・管理

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Leaflet (地図表示)
- CSS Modules

### バックエンド
- Node.js
- Express
- TypeScript
- SQLite3 (データベース)
- SunCalc (天体計算)
- bcrypt (パスワードハッシュ化)
- JWT (認証)

### セキュリティ
- Helmet (セキュリティヘッダー)
- Rate limiting
- CSRF保護
- XSS対策
- SQLインジェクション対策

## インストール・セットアップ

### 必要な環境
- Docker & Docker Compose **推奨**
- または Node.js 18以上 + Redis

## Docker環境（推奨）

### 開発環境

1. リポジトリをクローン
```bash
git clone <repository-url>
cd fuji-calendar
```

2. 開発環境を起動
```bash
./scripts/docker-dev.sh start
```

3. アクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000

### 本番環境

1. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを編集して本番用の値を設定（JWT_SECRET等）
```

2. 本番環境をデプロイ
```bash
./scripts/docker-prod.sh deploy
```

3. アクセス
- アプリケーション: http://localhost:8000

### Docker管理コマンド

```bash
# 開発環境
./scripts/docker-dev.sh start      # 開発環境起動
./scripts/docker-dev.sh stop       # 停止
./scripts/docker-dev.sh logs       # ログ表示
./scripts/docker-dev.sh status     # 状態確認
./scripts/docker-dev.sh clean      # クリーンアップ

# 本番環境
./scripts/docker-prod.sh deploy    # デプロイ
./scripts/docker-prod.sh start     # 起動
./scripts/docker-prod.sh stop      # 停止
./scripts/docker-prod.sh backup    # データベースバックアップ
./scripts/docker-prod.sh health    # ヘルスチェック
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

### システムAPI

- `GET /api/health` - ヘルスチェック

## ディレクトリ構造

```
fuji-calendar/
├── src/
│   ├── client/          # フロントエンドコード
│   │   ├── components/  # Reactコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── hooks/       # カスタムフック
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
| `DB_PATH` | データベースファイルパス | ./data/fuji_calendar.db |
| `JWT_SECRET` | JWT署名シークレット | ランダム生成 |
| `REFRESH_SECRET` | リフレッシュトークンシークレット | ランダム生成 |
| `FRONTEND_URL` | フロントエンドURL（本番用） | - |

## ライセンス

MIT License

## 貢献

プルリクエストや Issue の報告を歓迎します。

## サポート

質問や問題がある場合は、GitHub Issues でお気軽にお尋ねください。