# API 仕様書

**バージョン 0.3.0** - モノレポ構成・高性能版

## 概要

ダイヤモンド富士・パール富士カレンダーの RESTful API 仕様書です。カレンダーデータの取得、撮影地点情報、管理者機能のエンドポイントを提供します。

## ベース URL

- **開発環境**: `http://localhost:8000/api`
- **本番環境**: `https://your-domain.com/api`

## 認証

管理者 API は JWT Bearer Token 認証を使用します。

```http
Authorization: Bearer <access_token>
```

## エラーレスポンス

全てのエラーレスポンスは以下の形式で返されます：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {} // オプション
}
```

### 一般的なエラーコード

| コード | 説明 |
|--------|------|
| `VALIDATION_ERROR` | 入力値検証エラー |
| `UNAUTHORIZED` | 認証が必要 |
| `FORBIDDEN` | アクセス権限なし |
| `NOT_FOUND` | リソースが見つからない |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| `INTERNAL_ERROR` | サーバー内部エラー |

## 公開 API

### カレンダー API

#### 月間カレンダー取得

```http
GET /api/calendar/:year/:month
```

**パラメータ**
- `year` (number): 年 (例: 2024)
- `month` (number): 月 (1-12)

**レスポンス**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "month": 12,
    "events": [
      {
        "date": "2024-12-25",
        "type": "diamond",
        "events": [
          {
            "id": "evt_20241225_001",
            "type": "diamond",
            "subType": "sunrise",
            "time": "2024-12-25T06:45:00+09:00",
            "location": {
              "id": 1,
              "name": "田貫湖",
              "prefecture": "静岡県",
              "latitude": 35.3831,
              "longitude": 138.6124,
              "elevation": 670
            },
            "azimuth": 120.5,
            "elevation": 2.3
          }
        ]
      }
    ]
  },
  "message": "月間カレンダーを取得しました"
}
```

#### 特定日のイベント詳細

```http
GET /api/events/:date
```

**パラメータ**
- `date` (string): 日付 (YYYY-MM-DD 形式)

**レスポンス**
```json
{
  "success": true,
  "data": {
    "date": "2024-12-25",
    "events": [
      {
        "id": "evt_20241225_001",
        "type": "diamond",
        "subType": "sunrise",
        "time": "2024-12-25T06:45:00+09:00",
        "location": {
          "id": 1,
          "name": "田貫湖",
          "prefecture": "静岡県",
          "latitude": 35.3831,
          "longitude": 138.6124,
          "elevation": 670,
          "description": "富士山の南西に位置する湖",
          "accessInfo": "JR 身延線富士宮駅からバス",
          "warnings": "冬季は凍結注意"
        },
        "azimuth": 120.5,
        "elevation": 2.3
      }
    ]
  }
}
```

#### 今後のイベント取得

```http
GET /api/events/upcoming
```

**クエリパラメータ**
- `limit` (number, optional): 取得件数 (デフォルト: 50, 最大: 50)
- `days` (number, optional): 検索日数 (デフォルト: 30, 最大: 30)

**レスポンス**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_20241226_001",
        "type": "pearl",
        "subType": "rising",
        "time": "2024-12-26T18:30:00+09:00",
        "location": {
          "id": 2,
          "name": "山中湖",
          "prefecture": "山梨県"
        }
      }
    ],
    "totalCount": 25,
    "hasMore": true
  }
}
```

### 撮影地点 API

#### 撮影地点一覧取得

```http
GET /api/locations
```

**クエリパラメータ**
- `prefecture` (string, optional): 都道府県でフィルタ
- `limit` (number, optional): 取得件数 (デフォルト: 100)
- `offset` (number, optional): オフセット (デフォルト: 0)

**レスポンス**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": 1,
        "name": "田貫湖",
        "prefecture": "静岡県",
        "latitude": 35.3831,
        "longitude": 138.6124,
        "elevation": 670,
        "description": "富士山の南西に位置する湖",
        "accessInfo": "JR 身延線富士宮駅からバス",
        "warnings": "冬季は凍結注意",
        "fujiAzimuth": 120.5,
        "fujiDistance": 15.2,
        "createdAt": "2024-01-01T00:00:00+09:00",
        "updatedAt": "2024-01-01T00:00:00+09:00"
      }
    ],
    "totalCount": 150,
    "hasMore": true
  }
}
```

#### 撮影地点詳細取得

```http
GET /api/locations/:id
```

**パラメータ**
- `id` (number): 撮影地点 ID

**レスポンス**
```json
{
  "success": true,
  "data": {
    "location": {
      "id": 1,
      "name": "田貫湖",
      "prefecture": "静岡県",
      "latitude": 35.3831,
      "longitude": 138.6124,
      "elevation": 670,
      "description": "富士山の南西に位置する湖",
      "accessInfo": "JR 身延線富士宮駅からバス",
      "warnings": "冬季は凍結注意",
      "fujiAzimuth": 120.5,
      "fujiDistance": 15.2,
      "createdAt": "2024-01-01T00:00:00+09:00",
      "updatedAt": "2024-01-01T00:00:00+09:00"
    }
  }
}
```

### システム API

#### ヘルスチェック

```http
GET /api/health
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-20T12:00:00+09:00",
    "version": "0.2.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "calculationEngine": "operational"
    },
    "cachePerformance": {
      "hitRate": 0.85,
      "avgResponseTime": 120
    }
  }
}
```

## 管理者 API

### 認証 API

#### ログイン

```http
POST /api/auth/login
```

**リクエストボディ**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "lastLogin": "2024-12-20T12:00:00+09:00"
    },
    "expiresIn": 3600
  }
}
```

#### トークンリフレッシュ

```http
POST /api/auth/refresh
```

**リクエストボディ**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### ログアウト

```http
POST /api/auth/logout
```

**ヘッダー**
```http
Authorization: Bearer <access_token>
```

**レスポンス**
```json
{
  "success": true,
  "message": "正常にログアウトしました"
}
```

### 撮影地点管理 API

#### 撮影地点作成

```http
POST /api/admin/locations
```

**ヘッダー**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**リクエストボディ**
```json
{
  "name": "新規撮影地点",
  "prefecture": "東京都",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "elevation": 100,
  "description": "撮影地点の説明",
  "accessInfo": "アクセス方法",
  "warnings": "注意事項"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "location": {
      "id": 151,
      "name": "新規撮影地点",
      "prefecture": "東京都",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "elevation": 100,
      "description": "撮影地点の説明",
      "accessInfo": "アクセス方法",
      "warnings": "注意事項",
      "fujiAzimuth": 210.3,
      "fujiDistance": 120.5,
      "createdAt": "2024-12-20T12:00:00+09:00",
      "updatedAt": "2024-12-20T12:00:00+09:00"
    }
  },
  "message": "撮影地点を作成しました"
}
```

#### 撮影地点更新

```http
PUT /api/admin/locations/:id
```

**ヘッダー**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**パラメータ**
- `id` (number): 撮影地点 ID

**リクエストボディ**
```json
{
  "name": "更新後の名前",
  "description": "更新後の説明"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "location": {
      "id": 1,
      "name": "更新後の名前",
      "prefecture": "静岡県",
      "description": "更新後の説明",
      "updatedAt": "2024-12-20T12:00:00+09:00"
    }
  },
  "message": "撮影地点を更新しました"
}
```

#### 撮影地点削除

```http
DELETE /api/admin/locations/:id
```

**ヘッダー**
```http
Authorization: Bearer <access_token>
```

**パラメータ**
- `id` (number): 撮影地点 ID

**レスポンス**
```json
{
  "success": true,
  "message": "撮影地点を削除しました"
}
```

## レート制限

### 制限値

| エンドポイント | 制限 | 範囲 |
|----------------|------|------|
| 公開 API | 100 リクエスト/分 | カレンダー・撮影地点・システム API |
| 認証 API | 5 リクエスト/15 分 | ログイン・ログアウト・トークン検証 |
| 管理者 API | 60 リクエスト/分 | 地点作成・更新・削除・キャッシュ管理 |

### レート制限ヘッダー

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
Retry-After: 60
```

### レート制限の詳細

#### 公開 API
- **目的**: 一般ユーザーの日常的な利用をサポート
- **制限**: 100 リクエスト/分
- **理由**: カレンダー閲覧、地点検索、イベント照会に十分なリクエスト数

#### 認証 API
- **目的**: ブルートフォース攻撃の防止
- **制限**: 5 リクエスト/15 分
- **特殊機能**: 成功したリクエストはカウントしない（`skipSuccessfulRequests: true`）

#### 管理者 API
- **目的**: 管理操作の効率的な実行をサポート
- **制限**: 60 リクエスト/分
- **理由**: 管理者の日常的なメンテナンス作業に必要な操作数

## WebSocket API

### リアルタイム更新

```javascript
// 接続
const ws = new WebSocket('ws://localhost:8000/ws');

// 管理者による地点更新通知
{
  "type": "location_updated",
  "data": {
    "locationId": 1,
    "action": "updated"
  }
}

// システム保守通知
{
  "type": "maintenance",
  "data": {
    "message": "メンテナンス開始",
    "estimatedDuration": 30
  }
}
```

#### 特定地点の年間イベント取得

```http
GET /api/locations/:id/yearly/:year
```

**パラメータ**
- `id` (number): 撮影地点 ID
- `year` (number): 年 (例: 2024)

**レスポンス**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_20240115_001",
        "type": "diamond",
        "subType": "sunrise",
        "time": "2024-01-15T06:45:00+09:00",
        "azimuth": 120.5,
        "elevation": 2.3
      }
    ],
    "location": {
      "id": 1,
      "name": "田貫湖"
    },
    "year": 2024,
    "totalCount": 45
  }
}
```

## データ型定義


### Location
```typescript
interface Location {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  description?: string;
  accessInfo?: string;
  warnings?: string;
  fujiAzimuth?: number;
  fujiElevation?: number;
  fujiDistance?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### FujiEvent
```typescript
interface FujiEvent {
  id: string;
  type: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset' | 'rising' | 'setting';
  time: string; // ISO 8601
  location: Location;
  azimuth: number;
  elevation?: number;
}
```

### Admin
```typescript
interface Admin {
  id: number;
  username: string;
  email: string;
  lastLogin?: string; // ISO 8601
  createdAt: string; // ISO 8601
}
```

## 変更履歴

### v0.2.0 (2025-07-25)
- お気に入り機能のナビゲーション堅牢性向上
- 存在しない地点・イベントへの遷移時のエラーハンドリング強化
- 使い方ガイドの順番修正（日付→地図→詳細）
- 日付変更時の地点選択リセット機能実装
- 太陽軌道線の 350km 延長表示

### v0.1.0 (2024-12-20)
- 初期 API 仕様策定
- カレンダー・撮影地点・管理者 API の実装
- JWT 認証システムの導入
- レート制限機能の追加

### v0.1.1 (2024-12-20)
- レート制限値を実用的な数値に調整
- 認証 API 専用のレート制限を導入（ブルートフォース対策強化）
- 管理者 API のレート制限を緊急時の操作に対応した値に調整

### v0.1.2 (2024-12-21)
- 特定地点の年間イベント API の追加
- ヘルスチェックレスポンスの拡張（キャッシュ性能等）
- TypeScript 型定義の更新と文書化改善