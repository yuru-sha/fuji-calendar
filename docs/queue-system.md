# ダイヤモンド富士・パール富士カレンダー キューシステムガイド

## 概要

パフォーマンス問題（1地点で30秒以上の計算時間）を解決するため、BullMQベースのキューシステムを実装しました。これにより、天体計算を非同期バッチ処理で行い、事前計算されたデータをキャッシュから高速配信できます。

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド    │    │   Express API   │    │   Redis Queue   │
│                 │    │                 │    │                 │
│ ・地点登録      │◄──►│ ・AdminController│◄──►│ ・Location Queue│
│ ・カレンダー表示 │    │ ・地点作成時に    │    │ ・Monthly Queue │
│ ・進捗確認      │    │   キュー追加      │    │ ・Daily Queue   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲                       ▼
                                │                ┌─────────────────┐
                                │                │  BullMQ Worker  │
                                │                │                 │
                                │                │ ・バッチ計算     │
                                │                │ ・結果をキャッシュ│
                                └────────────────│ ・進捗レポート   │
                                                └─────────────────┘
                                                         ▼
                                                ┌─────────────────┐
                                                │ SQLite Cache DB │
                                                │                 │
                                                │ ・events_cache  │
                                                │ ・高速読み込み   │
                                                └─────────────────┘
```

### キューの種類

1. **Location Queue** (location-calculation)
   - 地点全体の長期計算（2-3年分）
   - 並行度: 1（重い処理のため）
   - 用途: 新規地点登録時の初期計算

2. **Monthly Queue** (monthly-calculation) 
   - 月別計算（1ヶ月分）
   - 並行度: 2
   - 用途: 月単位での追加計算、補完

3. **Daily Queue** (daily-calculation)
   - 日別計算（1日分）
   - 並行度: 4  
   - 用途: 緊急のリアルタイム計算要求

## 使用方法

### 1. 開発環境のセットアップ

```bash
# Redis起動（Docker）
docker run -d --name redis-fuji -p 6379:6379 redis:7-alpine

# 依存関係インストール済み
npm install bullmq ioredis

# サーバー起動
npm run dev:server
```

### 2. 地点登録による自動計算

新しい地点を管理者画面で登録すると、自動的にキューシステムが起動します：

```javascript
// 管理者ログイン
POST /api/admin/login
{
  "username": "admin",
  "password": "admin123"
}

// 地点登録（自動的にキュー追加）
POST /api/admin/locations
{
  "name": "新しい撮影地点",
  "prefecture": "神奈川県", 
  "latitude": 35.2808,
  "longitude": 139.1528,
  "elevation": 10
}

// レスポンス例
{
  "success": true,
  "data": {
    "id": 2,
    "name": "新しい撮影地点",
    "calculationJobId": "job_12345"  // 自動追加されたジョブID
  },
  "message": "撮影地点が正常に作成されました。天体計算を開始します。"
}
```

### 3. 手動計算の起動

管理者は任意のタイミングで計算をトリガーできます：

```javascript
// 地点全体計算（2025-2027年）
POST /api/admin/queue/calculate
{
  "locationId": 1,
  "priority": "high"
}

// 年別計算（2025年全12ヶ月）
POST /api/admin/queue/calculate  
{
  "locationId": 1,
  "year": 2025,
  "priority": "medium"
}

// 月別計算（2025年10月）
POST /api/admin/queue/calculate
{
  "locationId": 1, 
  "year": 2025,
  "month": 10,
  "priority": "high"
}

// 日別計算（2025年10月23日）
POST /api/admin/queue/calculate
{
  "locationId": 1,
  "year": 2025, 
  "month": 10,
  "day": 23,
  "priority": "high"
}
```

### 4. 進捗監視

キューの状態とジョブの進捗を確認できます：

```javascript
// キュー統計
GET /api/admin/queue/stats
// レスポンス例
{
  "success": true,
  "data": {
    "location": {
      "waiting": 1,    // 待機中
      "active": 0,     // 実行中
      "completed": 2,  // 完了
      "failed": 0      // 失敗
    },
    "monthly": { ... },
    "daily": { ... }
  }
}

// 特定ジョブの進捗
GET /api/admin/queue/job/{jobId}/location
// レスポンス例
{
  "success": true,
  "data": {
    "id": "job_12345",
    "state": "active",  // waiting, active, completed, failed
    "progress": {
      "currentYear": 2025,
      "totalYears": 3,
      "completedYears": 1
    },
    "createdAt": 1642584000000,
    "processedAt": 1642584010000
  }
}
```

## 運用戦略

### 1. 新規地点追加時

1. **即座にキュー追加**: 地点作成と同時に3年分の計算をスケジュール
2. **段階的計算**: 当年→翌年→翌々年の順で計算
3. **フォールバック**: キュー失敗時はリアルタイム計算でカバー

### 2. 既存地点の保守

1. **日次バッチ**: 毎日午前2時に翌月分を自動計算
2. **月次補完**: 毎月1日に3ヶ月先までの補完計算
3. **年次準備**: 年末に翌年全体の事前計算

### 3. 年次・月次メンテナンス

#### 年次スケジュール
- **12月15日 午前1時**: 翌年データ準備開始（全地点の翌年計算）
- **1月1日 午前0時30分**: 新年データ検証・緊急補完
- **12月31日 午後11時**: 古いデータのアーカイブ（2年前のデータ削除）

#### 月次スケジュール  
- **毎月1日 午前1時**: 3ヶ月先までの準備計算
- **毎月15日 午前2時**: データ整合性チェック・品質監視

### 3. パフォーマンス最適化

1. **優先度制御**: 
   - high: ユーザー要求、緊急計算
   - medium: 定期バッチ、補完処理
   - low: バックグラウンド計算

2. **並行度調整**:
   - Location: 1 (CPU集約的)
   - Monthly: 2 (中程度)
   - Daily: 4 (軽量)

3. **リトライ戦略**:
   - Location: 3回、指数バックオフ
   - Monthly: 2回、線形バックオフ
   - Daily: 2回、固定遅延

## トラブルシューティング

### 計算の停滞

```bash
# ワーカーの状態確認
GET /api/admin/queue/stats

# 停滞ジョブの確認
GET /api/admin/queue/job/{jobId}/location

# Redis接続確認
docker ps | grep redis
```

### メモリ不足

```bash
# ワーカーの並行度を削減
# src/server/services/QueueService.ts で concurrency を調整

# Redis メモリ使用量確認  
docker exec redis-fuji redis-cli info memory
```

### 計算精度問題

```bash
# Astronomy Engine の精度確認
# src/server/services/AstronomicalCalculator.ts でログレベルを debug に

# 特定地点での手動検証
node debug_calculation.js
```

## API仕様

### 管理者API（認証必要）

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/admin/queue/stats` | GET | キュー統計取得 |
| `/api/admin/queue/job/{jobId}/{queueType}` | GET | ジョブ進捗取得 |
| `/api/admin/queue/calculate` | POST | 手動計算起動 |
| `/api/admin/locations` | POST | 地点作成（自動キュー追加） |
| `/api/admin/background/yearly-maintenance` | POST | 年次メンテナンス手動実行 |
| `/api/admin/background/monthly-maintenance` | POST | 月次メンテナンス手動実行 |

### パブリックAPI（認証不要）

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/calendar/{year}/{month}` | GET | 月間カレンダー（キャッシュ優先） |
| `/api/events/{date}` | GET | 日別イベント（キャッシュ優先） |
| `/api/locations` | GET | 地点一覧 |

## 実装済み機能

✅ BullMQキューシステム  
✅ Redis統合  
✅ 地点登録時の自動計算開始  
✅ 手動計算API  
✅ 進捗監視API  
✅ 優先度制御  
✅ リトライ機能  
✅ エラーハンドリング  
✅ ログ統合  
✅ グレースフルシャットダウン  
✅ 年次・月次メンテナンススケジューラー  
✅ データ整合性チェック  
✅ 自動アーカイブ機能  
✅ 緊急データ補完  

## 今後の拡張

🔄 フロントエンドでの計算進捗表示  
🔄 計算完了通知システム  
🔄 キューパフォーマンス最適化  
🔄 分散ワーカー対応  

---

このキューシステムにより、従来30秒以上かかっていた計算が事前処理され、ユーザーは即座にカレンダーデータを取得できるようになります。