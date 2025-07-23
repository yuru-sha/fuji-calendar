# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

富士山カレンダーは、ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示するカレンダーアプリケーションです。Astronomy Engineによる高精度天体計算とお気に入り機能を備え、写真愛好家が効率的に撮影計画を立てられる情報を提供します。

### 主要機能
- **カレンダービュー**: 月間カレンダーでイベントを一覧表示（視認性向上済み）
- **イベント詳細**: 日付クリックで詳細情報と地図表示・ルート案内
- **お気に入り管理**: 撮影地点・イベントの保存・エクスポート機能
- **管理者機能**: JWT認証による地点管理システム
- **高性能**: RedisキャッシュとPino構造化ログで最適化（5-10倍性能向上）
- **開発支援**: 包括的デバッグスクリプト群とパフォーマンス分析ツール
- **天気情報**: 7日間天気予報と撮影条件レコメンデーション（模擬実装）

## Development Commands

```bash
# Development (runs both frontend and backend)
npm run dev

# Build and run production
npm run build
npm start

# Individual services
npm run dev:server    # Backend only (port 3000)
npm run dev:client    # Frontend only (port 3001)

# Code quality
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint checking
npm run lint:fix      # Auto-fix linting issues

# Testing
npm test              # Run tests
npm run test:watch    # Watch mode for tests
```

## Architecture Overview

### Core Components

- **AstronomicalCalculator** (`src/server/services/AstronomicalCalculator.ts`): 天体計算の中核。Astronomy Engineライブラリを使用してダイヤモンド富士・パール富士の時刻を高精度計算。大気屈折補正、地球楕円体モデル、シーズン自動判定機能を実装
- **FavoritesService** (`src/client/services/favoritesService.ts`): LocalStorageベースのお気に入り管理システム。JSONエクスポート/インポート機能付き
- **AuthService** (`src/server/services/AuthService.ts`): JWTベースの認証システム。アカウントロック、リフレッシュトークン対応
- **CacheService** (`src/server/services/CacheService.ts`): Redisベースの高性能キャッシュシステム。メモリフォールバック付き
- **TimeUtils** (`src/shared/utils/timeUtils.ts`): JST/UTC変換と時刻処理。日本の撮影者向けに全ての時刻をJST基準で統一
- **CalendarService** (`src/server/services/CalendarService.ts`): 月間イベントの集計とレコメンデーション生成、天気情報統合（模擬実装）
- **Logger** (`src/shared/utils/logger.ts`): Pinoベースの高性能構造化ログシステム。天体計算の詳細追跡とパフォーマンス監視

### Key Technical Concepts

**ダイヤモンド富士**: 太陽が富士山頂に重なる現象。太陽の方位角が撮影地点から富士山への方位角と一致する時刻を計算。精度許容範囲±1.5度、大気屈折補正適用、シーズン自動判定機能

**パール富士**: 月が富士山頂に重なる現象。月の方位角、月相、太陽角距離を統合考慮した高精度計算

**方位角計算**: 地球上の2点間の方位角を球面三角法で計算。富士山座標 (35.3606, 138.7274, 3776m) が基準

### Data Flow

1. **月間カレンダー要求** → CalendarController → CalendarService → AstronomicalCalculator
2. **天体計算**: 各日・各撮影地点で太陽/月の位置を10秒刻みで検索
3. **フィルタリング**: 高度条件 (-2度以上) と方位角差 (1.5度以内) で判定
4. **レスポンス**: timeUtils.formatDateString()でJST時刻文字列に変換して返却

### Time Handling

**重要**: 全ての時刻はJST (UTC+9) で処理される
- Astronomy Engineは内部で適切なタイムゾーン処理を行う
- API レスポンスは `timeUtils.formatDateString()` でJST文字列
- フロントエンドでの日付クリック時は `timeUtils.formatDateString(date)` を使用 (`date.toISOString().split('T')[0]` は使用禁止)

### Database Schema

- **locations**: 撮影地点 (緯度経度・標高・アクセス情報)
- **admins**: 管理者アカウント (bcrypt + JWT認証)
- **location_requests**: 撮影地点追加リクエスト

SQLite3使用、初回起動時に `src/server/database/schema.sql` から初期化

### Security Implementation

- Helmet によるセキュリティヘッダー
- Rate limiting (API エンドポイント別)
- CSRF保護とXSS対策
- SQL injection 対策 (パラメータ化クエリ)
- JWT + Refresh token による認証

### Frontend Architecture

React 18 + TypeScript + Tailwind CSS v3.4.17構成
- **Custom Hooks**: `useCalendar` でカレンダー状態管理、`useFavorites` でお気に入り管理
- **Styling**: CSS Modules + Tailwind CSS utilityクラス（@apply directive活用）
- **Layout**: 1280px最大幅の統一されたコンテナデザイン
- **Leaflet**: 地図表示とルート描画
- **Google Maps**: 現在地からの最適ルート検索機能
- **API Client**: `src/client/services/apiClient.ts` で一元管理

### Common Issues & Solutions

**時差問題**: カレンダーで日付をクリックした際に前日のデータが表示される場合、`HomePage.tsx` の `handleDateClick` で `date.toISOString().split('T')[0]` ではなく `timeUtils.formatDateString(date)` を使用すること

**UI視認性問題**: イベントアイコンが小さく件数表示が見えない場合、`Calendar.module.css`でアイコンサイズを28pxに、件数表示に白背景と境界線を追加。`HomePage.module.css`で今後のイベントリストを白背景に変更

**レイアウト一貫性**: カレンダーヘッダーとメイン+サイドバーの幅を統一するため、`content-wide` (max-w-6xl, 1152px) ラッパーを使用

**TypeScript設定**: 厳密な型チェック有効。ESLint設定でReact/TypeScript/Tailwind CSS対応

**Tailwind CSS**: v3.4.17を使用（v4互換性問題のため）。PostCSS設定は `tailwindcss` プラグインを使用

**精度問題**: AstronomicalCalculatorで「なし」と判定される場合、以下を確認:
- 検索時間範囲 (日の出: 4-12時、日の入り: 14-20時)
- 高度条件 (position.elevation > -2)
- 方位角許容範囲 (現在1.5度)
- デバッグログで `minDifference` と `bestTime` の値を確認

**型定義**: `src/shared/types/index.ts` の `FUJI_COORDINATES` で富士山の座標・標高を定義。Location型には必須の `createdAt`/`updatedAt` フィールドあり。`WeatherInfo` インターフェースで天気情報を定義

**デバッグスクリプト**: `scripts/`ディレクトリに天体計算のデバッグ用スクリプトが完備。`debug_diamond_fuji_detailed.js`、`debug_pearl_fuji_detailed.js`等で詳細な計算過程を確認可能

### Environment Variables

Required in production:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode
- `DB_PATH`: SQLite database path
- `JWT_SECRET`: JWT signing secret
- `REFRESH_SECRET`: Refresh token secret
- `FRONTEND_URL`: Frontend URL for CORS (production only)

Logging configuration:
- `LOG_LEVEL`: Log level (trace, debug, info, warn, error, fatal) - default: info in prod, debug in dev
- `ENABLE_FILE_LOGGING`: Enable file output (true/false) - default: false
- `LOG_DIR`: Log directory path - default: ./logs

## Logging System

### Architecture
本プロジェクトでは **Pino** を使用した高性能構造化ログシステムを採用。天体計算の大量処理に対応し、5-10倍のパフォーマンス向上を実現。

### Log Components
- **StructuredLogger** (`src/shared/utils/logger.ts`): コンポーネント別ログ機能
- **HTTP Middleware** (`src/server/middleware/logging.ts`): リクエスト追跡とパフォーマンス監視
- **Astronomical Logs**: 天体計算専用のコンテキスト記録

### Log Levels
- **debug**: 天体計算の詳細（開発時のみ）
- **info**: 通常動作とイベント発見
- **warn**: 注意が必要な状況（低精度など）
- **error**: エラー発生時（計算失敗など）
- **fatal**: アプリケーション停止レベル

### Production Setup
```bash
# ログローテーション設定
sudo cp scripts/logrotate.conf /etc/logrotate.d/fuji-calendar

# 環境変数（本番）
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_DIR=/var/log/fuji-calendar
```

## Gemini活用

### 三位一体の開発原則
人間の**意思決定**、Claude Codeの**分析と実行**、Gemini MCPの**検証と助言**を組み合わせ、開発の質と速度を最大化する：
- **人間 (ユーザー)**：プロジェクトの目的・要件・最終ゴールを定義し、最終的な意思決定を行う**意思決定者**
  - 反面、具体的なコーディングや詳細な計画を立てる力、タスク管理能力ははありません。
- **Claude Code**：高度なタスク分解・高品質な実装・リファクタリング・ファイル操作・タスク管理を担う**実行者**
  - 指示に対して忠実に、順序立てて実行する能力はありますが、意志がなく、思い込みは勘違いも多く、思考力は少し劣ります。
- **Gemini MCP**：API・ライブラリ・エラー解析など**コードレベル**の技術調査・Web検索 (Google検索) による最新情報へのアクセスを行う**コード専門家**
  - ミクロな視点でのコード品質・実装方法・デバッグに優れますが、アーキテクチャ全体の設計判断は専門外です。

### 壁打ち先の自動判定ルール
- **ユーザーの要求を受けたら即座に壁打ち**を必ず実施
- 壁打ち結果は鵜呑みにしすぎず、1意見として判断
- 結果を元に聞き方を変えて多角的な意見を抽出するのも効果的

### 主要な活用場面
1. **実現不可能な依頼**: Claude Code では実現できない要求への対処 (例: `最新のニュース記事を取得して`)
2. **前提確認**: 要求の理解や実装方針の妥当性を確認 (例: `この実装方針で要件を満たせるか確認して`)
3. **技術調査**: 最新情報・エラー解決・ドキュメント検索 (例: `Rails 7.2の新機能を調べて`)
4. **設計立案**: 新機能の設計・アーキテクチャ構築 (例: `認証システムの設計案を作成して`)
5. **問題解決**: エラーや不具合の原因究明と対処 (例: `このTypeScriptエラーの解決方法を教えて`)
6. **コードレビュー**: 品質・保守性・パフォーマンスの評価 (例: `このコードの改善点は？`)
7. **計画立案**: タスク分解・実装方針の策定 (例: `ユーザー認証機能を実装するための計画を立てて`)
8. **技術選定**: ライブラリ・フレームワークの比較検討 (例: `状態管理にReduxとZustandどちらが適切か？`)
9. **リスク評価**: 実装前の潜在的問題の洗い出し (例: `この実装のセキュリティリスクは？`)
10. **設計検証**: 既存設計の妥当性確認・改善提案 (例: `現在のAPI設計の問題点と改善案は？`)

## TDD開発手法（t-wada流）

### 基本サイクル
- 🔴 **Red**: 失敗するテストを書く
- 🟢 **Green**: テストを通す最小限の実装
- 🔵 **Refactor**: リファクタリング

### 実践原則
- **小さなステップ**: 一度に1つの機能のみ
- **仮実装**: テストを通すためにベタ書きでもOK（例：`return 42`）
- **三角測量**: 2つ目、3つ目のテストケースで一般化する
- **TODOリスト更新**: 実装中に思いついたことはすぐリストに追加
- **不安なところから**: 不安な箇所を優先的にテスト
- **即座にコミット**: テストが通ったらすぐコミット

### TDDコミットルール
- 🔴 テストを書いたら: `test: add failing test for [feature]`
- 🟢 テストを通したら: `feat: implement [feature] to pass test`
- 🔵 リファクタリングしたら: `refactor: [description]`

## 天気機能実装詳細

### WeatherInfo Interface
```typescript
export interface WeatherInfo {
  condition: string;           // 天候状態（'晴れ', '曇り', '雨', '雪'）
  cloudCover: number;         // 雲量（0-100%）
  visibility: number;         // 視界（km）
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';  // 撮影推奨度
}
```

### 実装概要
- **CalendarService.getWeatherInfo()**: 模擬天気データ生成（7日間予報対応）
- **EventDetail コンポーネント**: 天気アイコン・推奨度表示・カラーコード化
- **撮影条件判定**: 晴れ+雲量30%未満で「撮影に最適」、曇り・雨・雪で段階的評価

### UI Components
- **天気アイコン**: 絵文字による視覚表現（☀️☁️🌧️❄️🌤️）
- **推奨度カラー**: excellent(緑), good(青), fair(黄), poor(赤)
- **表示項目**: 天候・雲量・視界・撮影条件をカード形式で表示
- **ルートボタン**: 🗺️ アイコン付きの直感的なルート検索ボタン

## トラブルシューティング

### よくある問題
1. **TypeScript エラー**: `npm run typecheck` でチェック、`npm run lint:fix` で自動修正
2. **Tailwind CSS クラス未適用**: PostCSS設定確認、Tailwind v3.4.17使用確認
3. **レイアウト崩れ**: `content-wide` クラス適用確認、max-width統一確認
4. **天気情報未表示**: 7日間以内の未来日付のみ表示される仕様を確認

### 開発環境セットアップ
```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# TypeScript + ESLint チェック
npm run typecheck && npm run lint
```

### 参考資料
- **プロジェクト概要**: README.md
- **API仕様**: `src/server/routes/` 各コントローラー
- **型定義**: `src/shared/types/index.ts`
- **設定ファイル**: `tailwind.config.js`, `tsconfig.json`, `.eslintrc.js`
