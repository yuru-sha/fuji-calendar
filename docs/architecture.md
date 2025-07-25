# アーキテクチャ設計

ダイヤモンド富士・パール富士カレンダーシステムの技術的な設計と構成について説明します。

## システム全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │◄──►│   バックエンド    │◄──►│   データベース   │
│   (React SPA)   │    │ (Node.js/Express)│    │   (SQLite3)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │      Redis      │              │
         │              │  (キャッシュ)     │              │
         │              └─────────────────┘              │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                             ┌─────────────────┐
│    Leaflet      │                             │  Astronomy      │
│   (地図表示)     │                             │   Engine        │
└─────────────────┘                             │ (天体計算)       │
                                                └─────────────────┘
```

## レイヤー構成

### プレゼンテーション層（フロントエンド）
- **React 18**: UI フレームワーク
- **TypeScript**: 型安全性（strict mode有効）
- **Tailwind CSS v3.4.17**: ユーティリティファーストCSS
- **CSS Modules**: コンポーネント固有スタイリング
- **Leaflet**: 地図表示とルート描画
- **Google Maps Integration**: 現在地からの最適ルート検索
- **Vite**: 開発環境とビルドツール

### アプリケーション層（バックエンド）
- **Express.js**: Web フレームワーク
- **TypeScript**: 型安全性
- **JWT**: 認証・認可
- **Helmet**: セキュリティヘッダー
- **Rate Limiting**: API制限

### ビジネスロジック層
- **CalendarService**: カレンダー機能・天気情報統合
- **AstronomicalCalculator**: 天体計算エンジン
- **FavoritesService**: お気に入り管理（LocalStorage）
- **AuthService**: JWT認証管理・アカウントロック
- **CacheService**: Redis高性能キャッシュ
- **QueueService**: バッチ処理（無効化済み）

### データアクセス層
- **SQLite3**: メインデータベース
- **Redis**: キャッシュ・セッション管理
- **Pino**: 構造化ログ

## 主要コンポーネント

### 天体計算エンジン

```typescript
// AstronomicalCalculatorAstronomyEngine.ts
class AstronomicalCalculatorAstronomyEngine {
  // NASA JPL準拠の高精度計算
  async calculateDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]>
  async calculatePearlFuji(date: Date, location: Location): Promise<FujiEvent[]>
  
  // 2段階最適化検索
  private async findOptimalTimeWithAstronomyEngine(): Promise<Date | null>
  
  // 大気屈折補正
  private getAtmosphericRefraction(elevation: number): number
}
```

**特徴:**
- **Astronomy Engine**: NASA JPL準拠の天体暦
- **2段階検索**: 粗い検索(10分刻み) → 精密検索(1分刻み)
- **気象補正**: 日本の気象条件を考慮した大気屈折補正
- **距離別許容範囲**: 観測データに基づく精度調整

### 時刻処理システム

```typescript
// timeUtils.ts
export const timeUtils = {
  // JST基準の統一処理
  formatDateString(date: Date): string,
  formatTimeString(date: Date): string,
  
  // UTC変換（Astronomy Engine用）
  jstToUtc(jstDate: Date): Date,
  utcToJst(utcDate: Date): Date
}
```

**設計原則:**
- **JST統一**: 全ての時刻をJST基準で処理
- **API境界**: Astronomy Engine用のみUTC変換
- **表示一貫性**: フロントエンドとバックエンドで統一

### ログシステム

```typescript
// logger.ts  
interface StructuredLogger {
  // コンポーネント別ログ
  getComponentLogger(component: string): ComponentLogger
  
  // 天体計算専用ログ
  astronomical(level: string, message: string, context: object): void
  
  // HTTP リクエストログ
  httpLogger: pinoHttp.HttpLogger
}
```

**特徴:**
- **Pino**: 5-10倍の高性能
- **構造化ログ**: JSON形式での詳細記録
- **コンポーネント別**: 機能ごとの詳細追跡
- **本番対応**: ログローテーションとファイル出力

## データモデル

### 撮影地点（Location）

```typescript
interface Location {
  id: number;
  name: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  elevation: number;
  
  // 事前計算値（最適化）
  fujiAzimuth?: number;      // 富士山への方位角
  fujiElevation?: number;    // 富士山への仰角
  fujiDistance?: number;     // 富士山までの距離
  
  // 撮影情報
  description?: string;
  accessInfo?: string;
  warnings?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 富士イベント（FujiEvent）

```typescript
interface FujiEvent {
  id: string;
  type: 'diamond' | 'pearl';
  subType: 'sunrise' | 'sunset' | 'rising' | 'setting';
  time: Date;                // JST時刻
  location: Location;
  azimuth: number;          // 撮影方位角
  elevation: number;        // 撮影仰角
}
```

## APIデザイン

### RESTful API 設計

```
# カレンダーAPI
GET /api/calendar/:year/:month            # 月間カレンダー
GET /api/events/:date                     # 日別イベント詳細（天気情報付き）
GET /api/events/upcoming                  # 今後のイベント
GET /api/calendar/:year/:month/best       # おすすめ撮影日
POST /api/calendar/suggest                # 撮影計画提案

# 撮影地点API
GET /api/locations                        # 撮影地点一覧
GET /api/locations/:id                    # 撮影地点詳細
GET /api/locations/:id/yearly/:year       # 特定地点の年間イベント

# 認証・管理API
POST /api/auth/login                      # 管理者ログイン
POST /api/auth/logout                     # ログアウト
POST /api/auth/refresh                    # トークンリフレッシュ
POST /api/admin/locations                 # 地点追加（管理者）
PUT /api/admin/locations/:id              # 地点更新（管理者）
DELETE /api/admin/locations/:id           # 地点削除（管理者）

# システムAPI
GET /api/health                           # ヘルスチェック
```

### レスポンス形式

```typescript
// 成功レスポンス
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// エラーレスポンス
interface ApiError {
  error: string;
  message: string;
  details?: object;
}
```

## セキュリティ設計

### 認証・認可

```typescript
// JWT + Refresh Token方式
interface AuthTokens {
  accessToken: string;    // 短期間（15分）
  refreshToken: string;   // 長期間（7日）
}

// ミドルウェア認証
app.use('/api/admin', authenticateToken);
```

### セキュリティ対策

1. **Helmet**: セキュリティヘッダー
2. **Rate Limiting**: DDoS対策
3. **CSRF**: Cross-Site Request Forgery対策
4. **XSS**: Cross-Site Scripting対策
5. **SQL Injection**: パラメータ化クエリ

### パスワード管理

```typescript
// bcryptによるハッシュ化
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);
```

## パフォーマンス最適化

### データベース最適化

```sql
-- 撮影地点テーブルのインデックス
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX idx_locations_prefecture ON locations(prefecture);

-- 事前計算値のキャッシュ
ALTER TABLE locations ADD COLUMN fuji_azimuth REAL;
ALTER TABLE locations ADD COLUMN fuji_elevation REAL; 
ALTER TABLE locations ADD COLUMN fuji_distance REAL;

-- イベントキャッシュテーブル（Redis代替）
CREATE TABLE events_cache (
  cache_key TEXT PRIMARY KEY,
  events_data TEXT,
  calculation_time_ms INTEGER,
  created_at DATETIME,
  expires_at DATETIME
);
```

### 計算最適化

1. **事前計算**: 撮影地点の富士山に対する座標値
2. **2段階検索**: 粗い検索(10分刻み) → 精密検索(10秒刻み)
3. **季節判定**: ダイヤモンド富士シーズンの絞り込み
4. **並列処理**: 複数地点の同時計算
5. **直接計算**: キャッシュを介さない高速化実装
6. **TypeScript最適化**: 厳密型チェックによるランタイムエラー削減

### キャッシュ戦略

```typescript
// Redis キャッシュ + SQLite フォールバック
interface CacheStrategy {
  // 月間カレンダー: 直接計算（キャッシュなし）
  monthlyCalendar: 'direct',
  
  // 撮影地点: 永続化（更新時のみ削除）
  locations: 'persistent',
  
  // 計算結果: Redis（利用可能時）+ SQLite
  calculations: 'hybrid'
}

// 天気情報キャッシュ
interface WeatherCache {
  // 7日間予報: 6時間キャッシュ
  forecast: '6h',
  
  // 推奨度計算: 天気データに依存
  recommendations: 'weather-dependent'
}
```

## 拡張可能性

### マイクロサービス化

```yaml
# docker-compose.microservices.yml
services:
  calendar-service:     # カレンダー機能
  calculation-service:  # 天体計算
  weather-service:      # 天気情報サービス（外部API統合）
  auth-service:        # 認証サービス
  notification-service: # 通知機能（将来）
  favorites-service:   # お気に入り管理（将来）
```

### API バージョニング

```typescript
// 将来のAPI拡張
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);  // 将来の機能拡張
```

### プラグインアーキテクチャ

```typescript
// 将来の天体計算エンジン拡張
interface AstronomicalCalculator {
  calculateDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]>;
  calculatePearlFuji(date: Date, location: Location): Promise<FujiEvent[]>;
}

// 実装：AstronomyEngine, VSOP87, Swiss Ephemeris等

// 天気サービスプラグイン
interface WeatherProvider {
  getForecast(date: Date, location: GeoLocation): Promise<WeatherInfo>;
  getRecommendation(weather: WeatherInfo): Promise<ShootingRecommendation>;
}

// 実装：OpenWeatherMap, JMA API, 独自模擬等
```

## 監視・運用

### ヘルスチェック

```typescript
// /api/health エンドポイント
interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected' | 'unavailable';
  calculationEngine: 'operational' | 'error';
  weatherService: 'operational' | 'mock' | 'error';
  cachePerformance: {
    hitRate: number;
    avgResponseTime: number;
  };
  timestamp: string;
}
```

### メトリクス収集

```typescript
// ログベースの監視
logger.astronomical('info', '計算パフォーマンス', {
  calculationType: 'diamond',
  searchTimeMs: 1250,
  locationCount: 6,
  eventCount: 3,
  cacheStrategy: 'direct'
});

// フロントエンドメトリクス
logger.ui('info', 'ユーザー操作', {
  action: 'calendar-date-click',
  date: '2024-12-26',
  eventsFound: 2,
  weatherDisplayed: true,
  favoriteInteraction: false
});
```

## 技術的制約と決定事項

### 制約事項

1. **SQLite**: シンプルさ重視、大規模スケール時は PostgreSQL 移行検討
2. **シングルインスタンス**: 初期フェーズ、将来的にマイクロサービス化
3. **JS/TS統一**: 開発効率重視、パフォーマンス要求時は Go/Rust 検討

### 技術選択の理由

1. **Astronomy Engine**: NASA JPL準拠の高精度天体計算
2. **Pino**: 5-10倍の高性能構造化ログ
3. **Tailwind CSS**: 開発効率とデザイン一貫性
4. **TypeScript strict mode**: ランタイムエラーの削減
5. **JWT + Refresh Token**: ステートレス認証とセキュリティ
6. **Redis**: キャッシュ性能とセッション管理
7. **LocalStorage**: シンプルなお気に入り管理
8. **Google Maps API**: 現在地からの最適ルート案内でUX向上
9. **Docker**: 環境一貫性とマルチコンテナ対応