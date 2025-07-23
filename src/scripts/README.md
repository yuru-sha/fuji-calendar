# Scripts Directory Structure - Essential Scripts Only

本ディレクトリには、本番運用・開発・保守に**必要不可欠**なスクリプトのみを配置しています。

## Directory Structure

### 📊 analysis/ (1ファイル)
計算精度検証・分析用スクリプト
- `verify-gemini-elevation-calculation.js` - **Gemini高精度仰角計算検証** (地球曲率補正・大気屈折補正の精度確認)

### 🔧 config/ (4ファイル)
環境設定・インフラ用ファイル
- `docker-dev.sh` - 開発環境Docker起動スクリプト
- `docker-prod.sh` - 本番環境Docker起動スクリプト  
- `locations_2025-07-20.json` - **地点マスターデータ** (撮影地点の座標・情報)
- `logrotate.conf` - 本番環境ログローテーション設定

### 🏭 generation/ (5ファイル)
データ生成・計算実行用スクリプト
- `generate-diamond-fuji-enhanced-precision.js` - **高精度ダイヤモンド富士生成** (Gemini計算式統合版)
- `generate-diamond-fuji-events-prisma.js` - **Prisma版ダイヤモンド富士イベント生成** (本番DB対応)
- `generate-initial-data.js` - **システム初期データ生成** (セットアップ用)
- `generate-location-fuji-events.js` - 特定地点イベント生成
- `generate-pearl-fuji-events.js` - **パール富士イベント生成**

### 🗄️ migration/ (3ファイル)
データベース操作・初期セットアップ用
- `create-admin.js` - **管理者アカウント作成**
- `create-admin.sql` - 管理者テーブル作成SQL
- `insert-locations.sql` - **地点データDB挿入SQL**

### 🧪 testing/ (3ファイル)
システム動作確認・テスト用
- `check-progress.js` - **データ生成進捗確認** (長時間処理の監視)
- `test-postgres-connection.js` - **PostgreSQL接続テスト** (DB疎通確認)
- `test-prisma-system.js` - **Prismaシステムテスト** (ORM動作確認)

### 🛠️ utilities/ (3ファイル)
運用・保守用ユーティリティ
- `load-test.js` - **負荷テスト** (サーバー性能確認)
- `performance-analysis.js` - **パフォーマンス分析** (計算性能測定)
- `resume-data-generation.js` - **データ生成再開** (中断処理の復旧)

## 使用方法

### システムセットアップ
```bash
# 1. 管理者アカウント作成
node src/scripts/migration/create-admin.js

# 2. 初期データ生成
node src/scripts/generation/generate-initial-data.js

# 3. システム動作確認
node src/scripts/testing/test-postgres-connection.js
node src/scripts/testing/test-prisma-system.js
```

### データ生成・更新
```bash
# 高精度ダイヤモンド富士データ生成
node src/scripts/generation/generate-diamond-fuji-enhanced-precision.js

# パール富士データ生成
node src/scripts/generation/generate-pearl-fuji-events.js

# 進捗確認
node src/scripts/testing/check-progress.js
```

### 計算精度検証
```bash
# Gemini計算式の精度確認
node src/scripts/analysis/verify-gemini-elevation-calculation.js
```

### 運用・保守
```bash
# 負荷テスト
node src/scripts/utilities/load-test.js

# パフォーマンス分析
node src/scripts/utilities/performance-analysis.js
```

## 重要なスクリプト

### 🌟 コア生成スクリプト
- **`generate-diamond-fuji-enhanced-precision.js`**: Geminiの地球曲率補正式を統合した最高精度のダイヤモンド富士計算
- **`generate-diamond-fuji-events-prisma.js`**: Prisma ORMを使用した本番DB対応版

### 🔍 精度検証スクリプト  
- **`verify-gemini-elevation-calculation.js`**: 理論値 vs 実測値の精度検証（0.008758度の高精度を確認済み）

### ⚙️ システム確認スクリプト
- **`test-postgres-connection.js`**: DB接続・テーブル構造・管理者アカウントの一括確認
- **`check-progress.js`**: 大量データ生成の進捗監視

## 技術的背景

このスクリプトセットは以下の技術成果を維持・運用するために選別されました：

- **Gemini高精度計算式**: 地球曲率補正（856m低下）+ 大気屈折補正（111m持ち上げ）による理論精度0.008758度
- **PostgreSQL + Prisma**: 本番運用対応のデータベースシステム
- **3月10日17:33観測**: 実測値との完全一致確認済み（0.000160度差）

## 整理結果

**96個 → 19個のスクリプト** に大幅削減：

- 🗑️ **削除対象**: デバッグ用・一時的分析・旧版データ生成・サンプルファイル等（77個削除）
- ✅ **保持**: 本番運用・システム保守・データ生成・精度検証に必要不可欠なもののみ

これにより、メンテナンス負荷を大幅に軽減し、重要スクリプトへのアクセス性を向上させました。