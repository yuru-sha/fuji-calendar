# API リファレンス

**バージョン 0.3.0** - モノレポ構成・高性能版

**バージョン 0.3.0** - モノレポ構成・高性能版

ダイヤモンド富士・パール富士カレンダーの RESTful API ドキュメントです。

## ベース URL

- 開発環境: `http://localhost:8000/api`
- 本番環境: `https://your-domain.com/api`

## 認証

管理者機能には JWT トークンが必要です。

```http
Authorization: Bearer <your-jwt-token>
```

## エラーレスポンス

```json
{
  "error": "エラータイプ",
  "message": "詳細なエラーメッセージ"
}
```

## カレンダー API

### 月間カレンダー取得

```http
GET /calendar/:year/:month
```

指定された年月のダイヤモンド富士・パール富士イベントを取得します。

**パラメータ:**
- `year` (数値): 年 (例: 2025)
- `month` (数値): 月 (1-12)

**レスポンス例:**
```json
{
  "year": 2025,
  "month": 2,
  "events": [
    {
      "id": "diamond_1_2025-02-19_sunset",
      "type": "diamond",
      "subType": "sunset", 
      "time": "2025-02-19T17:30:00+09:00",
      "location": {
        "id": 1,
        "name": "竜ヶ岳",
        "latitude": 35.3222,
        "longitude": 138.5611
      },
      "azimuth": 231.5,
      "elevation": 1.2
    }
  ],
  "calendar": {
    "2025-02-19": [
      {
        "type": "diamond",
        "subType": "sunset",
        "locations": ["竜ヶ岳"]
      }
    ]
  }
}
```

### 特定日のイベント詳細

```http
GET /events/:date
```

指定された日付のイベント詳細と天気情報を取得します。

**パラメータ:**
- `date` (文字列): 日付 (YYYY-MM-DD 形式)

**レスポンス例:**
```json
{
  "date": "2025-02-19",
  "events": [
    {
      "id": "diamond_1_2025-02-19_sunset",
      "type": "diamond",
      "subType": "sunset",
      "time": "2025-02-19T17:30:00+09:00",
      "location": {
        "id": 1,
        "name": "竜ヶ岳",
        "prefecture": "山梨県",
        "latitude": 35.3222,
        "longitude": 138.5611,
        "elevation": 1485,
        "accessInfo": "富士急バス「精進湖民宿村」下車",
        "photoSpots": "山頂付近",
        "bestSeason": "10 月〜2 月",
        "difficulty": "中級",
        "parkingInfo": "精進湖駐車場利用"
      },
      "azimuth": 231.5,
      "elevation": 1.2
    }
  ],
  "weather": {
    "condition": "晴れ",
    "cloudCover": 20,
    "visibility": 15,
    "recommendation": "excellent"
  }
}
```

### 今後のイベント取得

```http
GET /events/upcoming
```

今後 30 日間のイベントを取得します。

**クエリパラメータ:**
- `limit` (数値, オプション): 取得件数 (デフォルト: 50)

### おすすめ撮影日取得

```http
GET /calendar/:year/:month/best
```

指定された年月のおすすめ撮影日を取得します。

### 撮影計画サジェスト

```http
POST /calendar/suggest
```

条件に基づいた撮影計画をサジェストします。

**リクエストボディ:**
```json
{
  "startDate": "2025-02-01",
  "endDate": "2025-02-28",
  "preferredTime": "sunset", // "sunrise" | "sunset" | "both"
  "maxDistance": 100, // km
  "difficulty": "beginner" // "beginner" | "intermediate" | "advanced"
}
```

## 撮影地点 API

### 撮影地点一覧取得

```http
GET /locations
```

すべての撮影地点を取得します。

**クエリパラメータ:**
- `prefecture` (文字列, オプション): 都道府県でフィルタ
- `difficulty` (文字列, オプション): 難易度でフィルタ

### 撮影地点詳細取得

```http
GET /locations/:id
```

指定された ID の撮影地点詳細を取得します。

### 特定地点の年間イベント

```http
GET /locations/:id/yearly/:year
```

特定の撮影地点の指定年の全イベントを取得します。

## システム API

### ヘルスチェック

```http
GET /health
```

システムの状態を確認します。

**レスポンス例:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "calculationEngine": "operational",
  "weatherService": "mock",
  "cachePerformance": {
    "hitRate": 0.85,
    "avgResponseTime": 120
  },
  "timestamp": "2025-02-19T10:00:00+09:00"
}
```

## 管理者 API

### 管理者ログイン

```http
POST /auth/login
```

**リクエストボディ:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**レスポンス:**
```json
{
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### ログアウト

```http
POST /auth/logout
```

管理者セッションを終了します。

### トークンリフレッシュ

```http
POST /auth/refresh
```

**リクエストボディ:**
```json
{
  "refreshToken": "refresh-token"
}
```

**レスポンス:**
```json
{
  "token": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

### 撮影地点管理

```http
POST /admin/locations
PUT /admin/locations/:id
DELETE /admin/locations/:id
```

管理者による撮影地点の作成・更新・削除。

## レート制限

- 一般 API: 100 リクエスト/分
- 管理者 API: 60 リクエスト/分
- 認証 API: 5 リクエスト/15 分

制限に達した場合、HTTP 429 ステータスが返されます。

## 天気情報 API

現在は模擬実装ですが、将来的に外部天気 API と連携予定です。

### 天気情報レスポンス形式

```json
{
  "condition": "晴れ",
  "cloudCover": 30,
  "visibility": 15,
  "recommendation": "excellent"
}
```

**推奨度レベル:**
- `excellent`: 撮影に最適
- `good`: 撮影に適している
- `fair`: 撮影可能
- `poor`: 撮影困難

## エラーコード

| コード | 説明 |
|------|------|
| 400 | Bad Request - リクエストパラメータエラー |
| 401 | Unauthorized - 認証エラー |
| 403 | Forbidden - 権限不足 |
| 404 | Not Found - リソースが見つからない |
| 429 | Too Many Requests - レート制限 |
| 500 | Internal Server Error - サーバーエラー |