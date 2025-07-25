# Scripts Directory

このディレクトリには、ダイヤモンド富士・パール富士カレンダーアプリケーションの運用・開発・デバッグに必要なスクリプトが整理されています。

## ディレクトリ構造

### `admin/`
管理者アカウント関連のスクリプト
- `create-admin.js` - 管理者アカウント作成（username: admin, password: admin123）

### `analysis/`
分析・検証用スクリプト
- `verify-gemini-elevation-calculation.js` - Geminiによる仰角計算検証

### `config/`
設定ファイルとデプロイメント設定
- `docker-dev.sh` - 開発環境用Docker設定
- `docker-prod.sh` - 本番環境用Docker設定
- `locations_2025-07-20.json` - 地点データバックアップ
- `logrotate.conf` - ログローテーション設定

### `data-generation/`
データ生成・修正スクリプト
- `fix-location-fuji-data.js` - 地点の富士データ修正

### `debug/`
デバッグ・検証用スクリプト（天体計算の詳細確認）
- `debug-astronomy.js` - 基本天体計算デバッグ
- `debug-diamond-fuji.js` - ダイヤモンド富士計算デバッグ
- `debug-event-date.js` - イベント日付問題デバッグ
- `debug-matching-details.js` - マッチング詳細デバッグ
- `debug-moon-phase.js` - 月相計算デバッグ
- `debug-october-diamond.js` - 10月ダイヤモンド富士デバッグ
- `debug_futtsu_elevation_detailed.js` - 富津岬仰角詳細デバッグ（最新版）
- `test_refraction_fix.js` - 大気屈折補正テスト

### `generation/`
イベントデータ生成スクリプト
- `generate-fuji-events-direct.js` - 直接的な富士イベント生成
- `generate-fuji-events.js` - 富士イベント生成メイン

### `migration/`
データベースマイグレーション関連
- `add-east-west-locations.js` - 東西地点追加スクリプト
- `add-east-west-locations.sql` - 東西地点追加SQL
- `create-admin.sql` - 管理者アカウント作成SQL
- `insert-locations.sql` - 地点データ挿入SQL

### `testing/`
テスト・チェック関連スクリプト
- `check-current-year-data.js` - 今年のデータチェック
- `check-db-data.js` - データベースデータチェック
- `check-locations.js` - 地点データチェック
- `check-progress.js` - 進捗チェック
- `check_db_status.js` - データベース状態チェック
- `test-postgres-connection.js` - PostgreSQL接続テスト
- `test-prisma-system.js` - Prismaシステムテスト

### `utilities/`
ユーティリティスクリプト
- `cleanup-test-data.js` - テストデータクリーンアップ
- `load-test.js` - 負荷テスト
- `performance-analysis.js` - パフォーマンス分析
- `queue-test-simple.js` - キューシステムテスト

### ルートレベルスクリプト
- `generate-celestial-data.js` - 天体データ生成メイン
- `setup-initial-data.js` - 初期データセットアップ

## 使用方法

### 基本コマンド
```bash
# 管理者アカウント作成
node scripts/admin/create-admin.js

# 初期データセットアップ
node scripts/setup-initial-data.js

# 天体データ生成
node scripts/generate-celestial-data.js

# データベース状態チェック
node scripts/testing/check_db_status.js
```

### デバッグコマンド
```bash
# ダイヤモンド富士計算の詳細確認
node scripts/debug/debug-diamond-fuji.js

# 富津岬の仰角計算検証
node scripts/debug/debug_futtsu_elevation_detailed.js

# 月相計算確認
node scripts/debug/debug-moon-phase.js
```

### 開発環境セットアップ
```bash
# Docker開発環境
bash scripts/config/docker-dev.sh

# データベース接続テスト
node scripts/testing/test-postgres-connection.js

# Prismaシステムテスト
node scripts/testing/test-prisma-system.js
```

## 注意事項

1. **環境変数**: 本番環境では適切な環境変数設定が必要
2. **データベース**: PostgreSQL + Redisが起動している必要があります
3. **権限**: 管理者スクリプトは適切な権限で実行してください
4. **ログ**: 全スクリプトはPinoロガーを使用した構造化ログを出力します

## トラブルシューティング

問題が発生した場合は以下の順序で確認：
1. `scripts/testing/test-postgres-connection.js` でDB接続確認
2. `scripts/testing/check_db_status.js` でデータ状態確認
3. 該当するdebugスクリプトで詳細確認