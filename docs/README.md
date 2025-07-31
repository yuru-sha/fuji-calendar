# ドキュメント

**バージョン 0.3.0** - モノレポ構成・高性能版

ダイヤモンド富士・パール富士カレンダープロジェクトの技術文書集です。

## 文書一覧

### 📋 [API リファレンス](./api.md)
RESTful API の詳細仕様とエンドポイント情報

### 🛠️ [インストールガイド](./installation.md)
Docker 環境・ローカル環境での詳細セットアップ手順

### 🏗️ [アーキテクチャ設計](./architecture.md)
システム構成・技術選択・設計思想の解説

### 🌟 [天体計算システム](./astronomical-calculations.md)
Astronomy Engine を使った高精度計算の詳細と最新改善

### 🏔️ [富士山頂仰角計算](./fuji-elevation-calculation.md)
地球曲率・大気屈折を考慮した高精度仰角計算システム

### 💎 [ダイヤモンド富士・パール富士の定義と検出](./diamond-pearl-fuji-conditions.md)
物理的定義、観測条件、高精度検出アルゴリズムの包括的解説

### 📱 [UI/UX 改善履歴](./ui-improvements.md)
カレンダー表示とインターフェースの視認性向上

### 🔧 [開発ツール](./development-tools.md)
デバッグスクリプトと開発支援ツール群

### 🔍 [トラブルシューティング](./troubleshooting.md)
よくある問題と解決方法・診断ツール

### 🐛 [デバッグガイド](./debug.md)
開発時のデバッグ手順とヘルスチェック方法

### ⚡ [パフォーマンス分析](./performance-analysis.md)
詳細なパフォーマンス分析結果と改善提案

### 🌙 [Astronomy Engine 分析](./astronomy-engine-analysis.md)
時刻処理の詳細分析と修正箇所の特定

### 🚀 [キューシステムガイド](./queue-system.md)
BullMQ ベースの非同期バッチ処理システム

### 📏 [お気に入り機能](./favorites-feature.md)
撮影地点とイベントのお気に入り管理機能

### 📡 [API 仕様書](./api-specification.md)
詳細な API エンドポイント仕様とレスポンス形式

## プロジェクト概要

ダイヤモンド富士・パール富士カレンダーは、ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示する Web アプリケーションです。NASA JPL 準拠の Astronomy Engine による高精度な天体計算に基づいて、写真愛好家が効率的に撮影計画を立てられる情報を提供します。

## 技術スタック（モノレポ構成）

### アーキテクチャ
- **モノレポ構成**: npm workspaces による効率的なパッケージ管理
- **型安全な開発**: TypeScript strict mode でフロント・バック・共有パッケージ全体

### フロントエンド (@fuji-calendar/client)
- React 18 + TypeScript (strict mode)
- Tailwind CSS v3.4.17 + CSS Modules
- Leaflet (地図表示・ルート描画)
- Vite (高速ビルドツール)

### バックエンド (@fuji-calendar/server)
- Node.js + Express + TypeScript (strict mode)
- PostgreSQL 15 + Prisma ORM (データベース)
- Redis + BullMQ (キャッシュ・非同期キューシステム)
- Astronomy Engine (高精度天体計算)
- Pino (構造化ログ・ 5-10 倍パフォーマンス向上)
- JWT + bcrypt (認証)

### 共有パッケージ
- **@fuji-calendar/types**: 共通型定義・インターフェース
- **@fuji-calendar/utils**: 時刻処理、ログ、フォーマッター
- **@fuji-calendar/ui**: 再利用可能 React コンポーネント
- **@fuji-calendar/shared**: 共通ビジネスロジック

### セキュリティ・インフラ
- Helmet + Rate limiting + CSRF/XSS 対策
- Docker & Docker Compose + nginx
- 包括的デバッグスクリプト群

## 開発者向けクイックスタート（モノレポ）

```bash
# リポジトリクローン
git clone <repository-url>
cd fuji-calendar

# Docker 環境で起動（推奨）
docker-compose -f docker-compose.dev.yml up -d

# または npm workspaces で開発
npm install
npm run dev  # フロントエンド + バックエンド + ワーカー同時起動

# アクセス
# フロントエンド: http://localhost:3000
# バックエンド API: http://localhost:8000
# 管理者ログイン: admin / admin123
```

## 主要機能

- 📅 月間カレンダーでのダイヤモンド富士・パール富士表示
- 🏔️ 全国の撮影地点情報とアクセス方法
- ⏰ JST 時刻での正確な発生時刻計算
- 🗺️ Leaflet マップでの撮影地点表示
- 📊 撮影推奨度とベストタイミング提案
- 🔐 管理者による撮影地点管理

## 貢献ガイド

1. **イシューの確認**: 既存のイシューまたは新規作成
2. **ブランチの作成**: `feature/your-feature-name`
3. **開発**: TDD 推奨、コミット前に `npm run typecheck` & `npm run lint`
4. **テスト**: `npm test` でテスト実行
5. **プルリクエスト**: 詳細な説明とテストケース

## ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) ファイルを参照