# 開発ツール・デバッグスクリプト

**バージョン 0.3.0** - モノレポ構成・高性能版

ダイヤモンド富士・パール富士カレンダーの開発・デバッグに使用するツール群について説明します。

## デバッグスクリプト一覧

### ダイヤモンド富士関連

#### `scripts/debug/debug-diamond-fuji.js`
ダイヤモンド富士の詳細な計算過程をデバッグするスクリプト（モノレポ構成）

**機能:**
- 特定の日付・地点でのダイヤモンド富士計算の詳細表示
- 太陽の位置（方位角・仰角）の時系列データ
- 方位角差の変化グラフ
- 最適な撮影時刻の特定

**使用例:**
```bash
node scripts/debug/debug-diamond-fuji.js
```

#### `scripts/debug/debug-tenjogatake.js`
天上ヶ岳での特定ケースのデバッグ

**用途:**
- 実際の撮影報告との比較検証
- アルゴリズムの精度確認
- リアルケースでの動作検証

#### `scripts/test_diamond_fuji.js`
ダイヤモンド富士計算の基本テスト

**機能:**
- 基本的な計算ロジックの動作確認
- 複数地点での一括テスト
- エラーケースの検出

#### `scripts/test_diamond_fuji_locations.js`
全撮影地点でのダイヤモンド富士計算テスト

**機能:**
- データベース内の全撮影地点での計算
- 地点別の結果比較
- 異常値の検出とレポート

#### `scripts/find_diamond_fuji_spots.js`
ダイヤモンド富士撮影スポットの発見ツール

**機能:**
- 指定範囲内での撮影可能地点の探索
- 最適な撮影条件の地点特定
- 新規撮影地点の候補提案

### パール富士関連

#### `scripts/debug_pearl_fuji_detailed.js`
パール富士の詳細計算デバッグスクリプト

**機能:**
- 月の位置（方位角・仰角・月相）の詳細表示
- 月相による視認性の評価
- 太陽角距離による明度計算

#### `scripts/debug_pearl_fuji_20251226.js`
2025 年 12 月 26 日の特定ケース検証

**用途:**
- 冬至付近での月の軌道解析
- 夜間撮影条件の検証
- 月相カレンダーとの整合性確認

#### `scripts/improved_pearl_fuji_logic.js`
パール富士計算ロジックの改善版テスト

**機能:**
- 新しい計算アルゴリズムの検証
- 従来版との比較分析
- 精度向上の定量評価

#### `scripts/fine_search_pearl_fuji.js`
パール富士の精密検索

**機能:**
- 10 秒刻みでの詳細時刻検索
- 月の軌道の詳細解析
- 最適撮影タイミングの特定

#### `scripts/debug_umihotaru_20251226.js`
海ほたる地点での特定日検証

**用途:**
- 人気撮影地点での動作確認
- 実際の撮影条件との比較
- 地点固有の問題の特定

### 共通ツール

#### `scripts/performance-analysis.js`
パフォーマンス分析ツール

**機能:**
- 計算時間の詳細測定
- メモリ使用量の監視
- ボトルネック箇所の特定
- 大量データ処理時の性能評価

#### `scripts/cache-benchmark.js`
キャッシュシステムのベンチマーク

**機能:**
- Redis vs メモリキャッシュの性能比較
- キャッシュヒット率の測定
- 異なるキャッシュ戦略の評価

#### `scripts/test-cache-consistency.js`
キャッシュ整合性テスト

**機能:**
- データ整合性の検証
- キャッシュ無効化のテスト
- 分散環境での動作確認

## 使用方法

### 基本的な実行手順

1. **環境変数の設定**
```bash
export NODE_ENV=development
export DB_PATH=./database.sqlite
```

2. **データベースの準備**
```bash
npm run setup:db
```

3. **スクリプトの実行**
```bash
node scripts/[スクリプト名].js
```

### デバッグ情報の出力レベル

#### VERBOSE モード
```bash
DEBUG=true node scripts/debug_diamond_fuji_detailed.js
```

#### JSON 出力
```bash
OUTPUT_FORMAT=json node scripts/test_diamond_fuji_locations.js > results.json
```

#### ログレベル指定
```bash
LOG_LEVEL=debug node scripts/performance-analysis.js
```

## 開発フロー

### 新機能開発時
1. `test_*.js` で基本動作確認
2. `debug_*_detailed.js` で詳細検証
3. `performance-analysis.js` で性能評価
4. 本体コードへの統合

### バグ修正時
1. 該当する `debug_*.js` で問題再現
2. 修正後の動作確認
3. 関連する `test_*.js` で回帰テスト
4. `cache-benchmark.js` で性能劣化チェック

### リリース前チェック
1. 全 `test_*.js` スクリプトの実行
2. `performance-analysis.js` でベンチマーク
3. `test-cache-consistency.js` で整合性確認

## 出力形式

### JSON 形式
```json
{
  "location": "海ほたる",
  "date": "2025-03-10",
  "events": [
    {
      "type": "diamond_fuji",
      "time": "17:45:23",
      "azimuth": 248.5,
      "elevation": 1.2,
      "accuracy": "high"
    }
  ]
}
```

### CSV 形式
```csv
Date,Location,Type,Time,Azimuth,Elevation,Accuracy
2025-03-10,海ほたる,diamond_fuji,17:45:23,248.5,1.2,high
```

### ログ形式（構造化）
```json
{
  "timestamp": "2025-07-20T10:30:45.123Z",
  "level": "info",
  "component": "astronomical-calculator",
  "msg": "Diamond Fuji calculation completed",
  "location": "海ほたる",
  "date": "2025-03-10",
  "result_count": 1,
  "calculation_time_ms": 45.2
}
```

## トラブルシューティング

### よくある問題

#### 1. データベース接続エラー
```bash
Error: SQLITE_CANTOPEN: unable to open database file
```
**解決策:** DB_PATH の確認、権限設定

#### 2. Astronomy Engine エラー
```bash
Error: Invalid date format
```
**解決策:** 日付形式の確認、タイムゾーン設定

#### 3. メモリ不足
```bash
Error: JavaScript heap out of memory
```
**解決策:** `--max-old-space-size=4096` オプション追加

### ログファイルの場所
- **開発環境**: `./logs/debug.log`
- **本番環境**: `/var/log/fuji-calendar/`

### パフォーマンス最適化のヒント
1. **並列処理**: `Promise.all()` で複数地点の同時計算
2. **キャッシュ活用**: 計算結果の積極的なキャッシュ
3. **メモリ管理**: 大量データ処理時のストリーミング処理

## 関連ファイル

- `src/server/services/AstronomicalCalculator.ts` - 本体計算ロジック
- `src/shared/utils/logger.ts` - ログシステム
- `src/server/services/CacheService.ts` - キャッシュシステム
- `package.json` - npm scripts 定義