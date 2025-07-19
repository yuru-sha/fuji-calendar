# API リファレンス

富士山カレンダーのRESTful APIドキュメントです。

## ベースURL

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

指定された日付のイベント詳細を取得します。

**パラメータ:**
- `date` (文字列): 日付 (YYYY-MM-DD形式)

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
        "bestSeason": "10月〜2月",
        "difficulty": "中級",
        "parkingInfo": "精進湖駐車場利用"
      },
      "azimuth": 231.5,
      "elevation": 1.2,
      "recommendation": "excellent"
    }
  ]
}
```

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

指定されたIDの撮影地点詳細を取得します。

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

### 撮影地点管理

```http
POST /admin/locations
PUT /admin/locations/:id
DELETE /admin/locations/:id
```

管理者による撮影地点の作成・更新・削除。

## レート制限

- 一般API: 100リクエスト/分
- 管理者API: 1000リクエスト/分

制限に達した場合、HTTP 429ステータスが返されます。