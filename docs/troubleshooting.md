# トラブルシューティング

富士山カレンダーの運用中に発生する可能性のある問題と解決方法について説明します。

## よくある問題

### 1. データ読み込みエラー

#### 症状
```
イベントデータの読み込みに失敗しました: イベントデータの取得中にエラーが発生しました。
```

#### 原因と対処法

**原因1: データベース接続エラー**
```bash
# データベースファイルの確認
ls -la data/fuji_calendar.db

# 権限の修正
chmod 644 data/fuji_calendar.db
chmod 755 data/
```

**原因2: 事前計算値の不足**
```bash
# 事前計算値を修正するスクリプトを実行
node scripts/fix-location-data.js
```

**原因3: SQLiteの破損**
```bash
# データベースの整合性チェック
sqlite3 data/fuji_calendar.db "PRAGMA integrity_check;"

# バックアップからの復元
cp data/backup/fuji_calendar.db.backup data/fuji_calendar.db
```

### 2. カレンダー表示の問題

#### 症状: アイコンの1日ズレ

```javascript
// 間違った実装
const dateString = date.toISOString().split('T')[0]; // UTC基準

// 正しい実装  
const dateString = timeUtils.formatDateString(date); // JST基準
```

#### 症状: 月またぎの日付にアイコンが表示されない

**原因:** 月間カレンダーの計算範囲が月内のみに限定されている

**対処法:**
```typescript
// CalendarService.ts の修正
const calendarStartDate = new Date(firstDayOfMonth);
calendarStartDate.setDate(calendarStartDate.getDate() - calendarStartDate.getDay());

const calendarEndDate = new Date(lastDayOfMonth);  
calendarEndDate.setDate(calendarEndDate.getDate() + (6 - calendarEndDate.getDay()));
```

### 3. 天体計算の問題

#### 症状: ダイヤモンド富士が「なし」と判定される

**デバッグ手順:**

1. **ログレベルをdebugに設定**
```bash
LOG_LEVEL=debug npm run dev:server
```

2. **計算パラメータの確認**
```bash
# ログから以下の値を確認
grep "ダイヤモンド富士詳細計算" logs/app.log | tail -10
```

確認項目:
- `azimuthDiff`: 方位角差（許容範囲内か？）
- `elevationDiff`: 仰角差（許容範囲内か？）
- `searchTimeMs`: 検索時間（異常に長くないか？）

3. **許容範囲の調整**
```typescript
// 距離に応じた許容範囲を確認
private readonly AZIMUTH_TOLERANCE = {
  close: 0.25,   // 50km以内
  medium: 0.4,   // 50-100km  
  far: 0.6       // 100km以上
};
```

#### 症状: パール富士が見つからない

**原因1: 月の出入り時刻の検索範囲不足**
```typescript
// 検索ウィンドウを拡大
const searchStart = new Date(time.getTime() - 60 * 60 * 1000); // 60分前
const searchEnd = new Date(time.getTime() + 60 * 60 * 1000);   // 60分後
```

**原因2: 許容範囲が狭すぎる**
```typescript
// パール富士用の許容範囲を確認
private readonly PEARL_AZIMUTH_TOLERANCE = {
  close: 0.5,    // ダイヤモンド富士の2倍
  medium: 0.8,
  far: 1.2
};
```

### 4. パフォーマンスの問題

#### 症状: API応答が遅い

**原因1: 事前計算値の未設定**
```sql
-- NULL値のチェック
SELECT name, fuji_azimuth, fuji_elevation, fuji_distance 
FROM locations 
WHERE fuji_azimuth IS NULL;

-- 事前計算値の設定
node scripts/fix-location-data.js
```

**原因2: 大量の計算処理**
```bash
# 計算パフォーマンスのログ確認
grep "searchTimeMs" logs/app.log | awk '{print $NF}' | sort -n | tail -10
```

**対処法:**
- バッチ処理の利用
- Redis キャッシュの活用
- 計算範囲の最適化

### 5. 認証・権限の問題

#### 症状: 管理者ログインできない

**原因1: JWTシークレットの不一致**
```bash
# 環境変数の確認
echo $JWT_SECRET
echo $REFRESH_SECRET

# 新しいシークレットの生成
openssl rand -base64 32
```

**原因2: パスワードハッシュの不一致**
```javascript
// 管理者パスワードのリセット
const bcrypt = require('bcrypt');
const newPassword = await bcrypt.hash('newpassword', 12);
// データベースで更新
```

### 6. Docker関連の問題

#### 症状: コンテナが起動しない

**原因1: ポート競合**
```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8000
lsof -i :6379

# プロセスの終了
kill -9 <PID>
```

**原因2: ボリュームの権限問題**
```bash
# ボリュームの権限修正
docker-compose down
sudo chown -R $USER:$USER data/
sudo chown -R $USER:$USER logs/
docker-compose up -d
```

**原因3: イメージの不整合**
```bash
# 完全クリーンアップ
./scripts/docker-dev.sh clean
docker system prune -a
docker volume prune

# 再構築
./scripts/docker-dev.sh start
```

### 7. 時刻・タイムゾーンの問題

#### 症状: 時刻が合わない

**原因:** UTC/JST変換の不整合

**対処法:**
```typescript
// 統一ルール
// 1. 内部処理: 全てJST基準
// 2. Astronomy Engine: UTC変換が必要な場合のみ
// 3. API レスポンス: JST文字列形式
// 4. フロントエンド: JST表示

// 正しい時刻処理
const jstTime = timeUtils.formatDateTimeString(date); // "2025-02-19T17:30:00+09:00"
const dateOnly = timeUtils.formatDateString(date);    // "2025-02-19"
```

### 8. ログ・デバッグの問題

#### 症状: ログが出力されない

**原因1: ログレベルの設定**
```bash
# 環境変数の確認・設定
export LOG_LEVEL=debug
export ENABLE_FILE_LOGGING=true
export LOG_DIR=./logs
```

**原因2: ディレクトリの権限**
```bash
# ログディレクトリの作成・権限設定
mkdir -p logs
chmod 755 logs
```

#### デバッグ用のログ確認コマンド

```bash
# エラーログの確認
grep "ERROR" logs/app.log | tail -20

# 天体計算のログ確認
grep "astronomical" logs/app.log | tail -20

# パフォーマンス確認
grep "searchTimeMs" logs/app.log | awk '{print $NF}' | sort -n

# 特定日のイベント計算ログ
grep "2025-02-19" logs/app.log | grep "diamond"
```

### 9. フロントエンドの問題

#### 症状: 地図が表示されない

**原因1: Leafletのスタイルシート未読み込み**
```typescript
// main.tsx または App.tsx で確認
import 'leaflet/dist/leaflet.css';
```

**原因2: マーカーアイコンの問題**
```typescript
// Leafletのデフォルトアイコン修正
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
```

#### 症状: APIエラーが頻発

**原因:** CORS設定またはプロキシ設定の問題

**対処法:**
```typescript
// vite.config.ts の開発プロキシ設定確認
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
```

## 診断ツール

### 1. ヘルスチェック

```bash
# API ヘルスチェック
curl http://localhost:8000/api/health

# 期待する応答
{
  "status": "healthy",
  "database": "connected", 
  "timestamp": "2025-02-19T10:00:00+09:00"
}
```

### 2. データベース診断

```bash
# SQLite の整合性チェック
sqlite3 data/fuji_calendar.db "PRAGMA integrity_check;"

# テーブル構造の確認
sqlite3 data/fuji_calendar.db ".schema locations"

# データ件数の確認
sqlite3 data/fuji_calendar.db "SELECT COUNT(*) FROM locations;"
```

### 3. 計算エンジン診断

```bash
# 特定地点の計算テスト
node scripts/test-diamond-fuji.ts

# 天体計算ライブラリの確認
node -e "console.log(require('astronomy-engine'))"
```

### 4. ログ分析

```bash
# エラー統計
grep "ERROR" logs/app.log | cut -d' ' -f3 | sort | uniq -c

# パフォーマンス統計
grep "searchTimeMs" logs/app.log | awk '{print $NF}' | awk '{sum+=$1; count++} END {print "平均:", sum/count "ms"}'

# API使用状況
grep "GET /api" logs/app.log | cut -d' ' -f4 | sort | uniq -c
```

## 予防策

### 1. 定期メンテナンス

```bash
# データベースバックアップ（日次）
cp data/fuji_calendar.db data/backup/fuji_calendar.db.$(date +%Y%m%d)

# ログローテーション（週次）
find logs/ -name "*.log" -mtime +7 -delete

# システムリソース監視
df -h && free -h && top -bn1 | head -20
```

### 2. 監視アラート

```bash
# エラー率の監視
ERROR_COUNT=$(grep "ERROR" logs/app.log | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
  echo "ERROR: エラーが多発しています ($ERROR_COUNT件)"
fi

# API応答時間の監視
SLOW_REQUESTS=$(grep "searchTimeMs" logs/app.log | awk '$NF > 5000' | wc -l)
if [ $SLOW_REQUESTS -gt 5 ]; then
  echo "WARNING: 遅いリクエストが検出されました ($SLOW_REQUESTS件)"
fi
```

### 3. 定期更新

```bash
# 事前計算値の再計算（月次）
node scripts/fix-location-data.js

# 依存関係の更新（四半期）
npm audit && npm update

# データベースの最適化（月次）
sqlite3 data/fuji_calendar.db "VACUUM; ANALYZE;"
```