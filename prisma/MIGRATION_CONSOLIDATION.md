# Prisma マイグレーション統合作業

## 実行日
2025-07-30

## 背景
プロジェクトに以下の複数のマイグレーションファイルが存在し、整理が必要でした：

1. **手動 SQL** (`migration.sql`) - 古い複雑なスキーマ
2. **Prisma 初期マイグレーション** (`20250730161820_init`) - 自動生成の初期スキーマ
3. **テーブル名変更** (`20250730183814_rename_location_fuji_events_to_location_events`) - テーブル名の修正

## 問題点

### 1. 矛盾するスキーマ定義
- 手動 SQL には使用されていない複雑なテーブル (`celestial_orbit_data`, `astronomical_data`)
- 重複した Enum 定義 (`pattern`, `quality` vs `EventType`, `Accuracy`)
- 異なるテーブル名 (`location_fuji_events` vs `location_events`)

### 2. 保守性の問題
- 複数のマイグレーションファイルによる混乱
- Prisma 管理外の手動 SQL スクリプト
- 一貫性のないデータベース状態

## 解決策

### 統合マイグレーション作成
新しい統合マイグレーション `20250730200000_consolidated_schema` を作成し、以下を実現：

1. **現在の Prisma スキーマと完全一致**
   - `EventType`, `Accuracy` Enum のみ使用
   - `location_events` テーブル名を採用
   - 不要なテーブル定義を削除

2. **適切なインデックス設計**
   - パフォーマンス最適化用インデックス
   - ユニーク制約による重複防止
   - 外部キー制約によるデータ整合性

3. **自動更新機能**
   - `updated_at` フィールドの自動更新トリガー
   - データ品質制約 (CHECK 制約)

### ファイル整理
```
prisma/
├── migrations/
│   ├── 20250730200000_consolidated_schema/
│   │   └── migration.sql (新統合マイグレーション)
│   └── migration_lock.toml
└── migrations_backup/
    ├── 20250730161820_init/ (バックアップ)
    ├── 20250730183814_rename_location_fuji_events_to_location_events/ (バックアップ)
    └── manual_migration.sql (バックアップ)
```

## 統合スキーマの構成

### テーブル
1. **admins** - 管理者アカウント
2. **locations** - 撮影地点
3. **location_events** - 地点別イベント（旧 location_fuji_events）

### Enum 型
1. **EventType** - イベント種別 (diamond_sunrise, diamond_sunset, pearl_moonrise, pearl_moonset)
2. **Accuracy** - 精度レベル (perfect, excellent, good, fair)

### 主要インデックス
- 地点・日付による高速検索
- イベント種別・日付による絞り込み
- 品質スコアによるソート
- 座標・方位角による地理的検索

## 移行手順

### 新しいデータベースの場合
```bash
npx prisma migrate deploy
```

### 既存データベースの場合
既存のデータベースには、本統合マイグレーションの適用は **推奨されません**。
データが失われる可能性があるため、以下のいずれかを選択：

1. **現状維持**: 既存のマイグレーション履歴をそのまま使用
2. **データベース再構築**: 全データをバックアップ後、新しいスキーマで再構築

## 今後の運用

### ベストプラクティス
1. **Prisma 中心の開発**: 手動 SQL スクリプトは避け、Prisma スキーマを修正してマイグレーション生成
2. **段階的変更**: 大きな変更は複数の小さなマイグレーションに分割
3. **バックアップ**: 重要な変更前は必ずデータベースをバックアップ

### 禁止事項
1. 手動でのテーブル・カラム変更
2. Prisma 管理外での直接 SQL 実行
3. マイグレーションファイルの直接編集

## 確認方法

統合後のスキーマ確認：
```bash
npx prisma db pull
npx prisma generate
npm run typecheck
```

データベース状態確認：
```sql
-- テーブル存在確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Enum 確認
SELECT enumname, enumlabel FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid;
```

## 注意事項

⚠️ **重要**: このマイグレーション統合は開発環境での整理を目的としています。
本番環境では既存のマイグレーション履歴を尊重し、段階的な変更を推奨します。