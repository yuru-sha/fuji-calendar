# 富士カレンダー - モノレポ構成

ダイヤモンド富士とパール富士の撮影タイミングを計算・表示するWebアプリケーション（モノレポ構成）

## 📁 プロジェクト構造

```
├── apps/
│   ├── client/          # Reactフロントエンド
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── server/          # Expressバックエンド
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── services/
│       │   └── server.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── ui/              # 共有UIコンポーネント
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Icon.tsx
│   │   │   │   └── FujiIcon.tsx
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/           # 共有型定義
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── cache.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utils/           # 共有ユーティリティ関数
│       ├── src/
│       │   ├── timeUtils.ts
│       │   ├── logger.ts
│       │   ├── formatters.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json         # モノレポのルート設定
├── tsconfig.json        # 共通TypeScript設定
└── README.md
```

## 🚀 開発環境のセットアップ

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上

### インストール

```bash
# 依存関係をインストール
npm install
```

### 開発サーバーの起動

```bash
# フロントエンドとバックエンドを同時に起動
npm run dev

# 個別に起動する場合
npm run dev:client  # フロントエンド（ポート3000）
npm run dev:server  # バックエンド（ポート3001）
```

## 📦 パッケージ管理

### 新しい依存関係の追加

```bash
# 特定のアプリケーションに追加
npm install <package> --workspace=apps/client
npm install <package> --workspace=apps/server

# 共有パッケージに追加
npm install <package> --workspace=packages/ui
npm install <package> --workspace=packages/utils
npm install <package> --workspace=packages/types
```

### パッケージのビルド

```bash
# 全パッケージをビルド
npm run build

# 個別にビルド
npm run build:client
npm run build:server
npm run build:packages
```

## 🧪 テストとリント

```bash
# 型チェック
npm run typecheck

# リント
npm run lint
npm run lint:fix

# テスト実行
npm run test
```

## 📋 利用可能なスクリプト

### ルートレベル
- `npm run dev` - 開発サーバー起動（フロント+バック）
- `npm run build` - 全パッケージビルド
- `npm run typecheck` - 型チェック
- `npm run lint` - リント実行
- `npm run clean` - ビルド成果物削除

### アプリケーション固有
- `npm run dev:client` - フロントエンド開発サーバー
- `npm run dev:server` - バックエンド開発サーバー
- `npm run build:client` - フロントエンドビルド
- `npm run build:server` - バックエンドビルド

## 🏗️ アーキテクチャ

### モノレポの利点

1. **コード共有**: 型定義、ユーティリティ、UIコンポーネントを効率的に共有
2. **一貫性**: 統一されたツールチェーンと設定
3. **開発効率**: 単一リポジトリでの統合開発
4. **依存関係管理**: ワークスペース機能による効率的な依存関係管理

### パッケージ構成

- **@fuji-calendar/types**: 共通型定義とインターフェース
- **@fuji-calendar/utils**: 時刻処理、ログ、フォーマッター等のユーティリティ
- **@fuji-calendar/ui**: 再利用可能なReactコンポーネント
- **@fuji-calendar/client**: Reactフロントエンドアプリケーション
- **@fuji-calendar/server**: Express.jsバックエンドアプリケーション

## 🔧 設定ファイル

- `tsconfig.json` - TypeScript共通設定

- `package.json` - モノレポルート設定
- 各パッケージの`package.json` - 個別パッケージ設定

## 📝 開発ガイドライン

1. **型安全性**: TypeScriptを活用した型安全な開発
2. **コンポーネント設計**: 再利用可能なUIコンポーネントの作成
3. **パフォーマンス**: 効率的なバンドルサイズとランタイム性能
4. **保守性**: 明確な責任分離とモジュール化

## 🤝 コントリビューション

1. フィーチャーブランチを作成
2. 変更を実装
3. テストとリントを実行
4. プルリクエストを作成

## 📄 ライセンス

MIT License