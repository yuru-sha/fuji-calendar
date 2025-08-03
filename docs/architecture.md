# アーキテクチャ設計

**バージョン 0.3.0** - モノレポ構成・高性能版

**バージョン 0.3.0** - モノレポ構成・高性能版

ダイヤモンド富士・パール富士カレンダーシステムの技術的な設計と構成について説明します。

## システム全体構成（モノレポ）

```
┌──────────────────────────────────────────────────────────────┐
│                      Monorepo Architecture                   │
│  ┌─────────────────┬─────────────────┬─────────────────────┐ │
│  │   apps/client   │   apps/server   │   packages/         │ │
│  │   (React SPA)   │  (Express API)  │  (Shared Libraries) │ │
│  └─────────┬───────┴─────────┬───────┴─────────┬───────────┘ │
└────────────┼─────────────────┼─────────────────┼─────────────┘
             │                 │                 │
             ▼                 ▼                 ▼
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │    Frontend     │ │    Backend      │ │ Shared Packages │
  │ - React 18      │ │ - Express       │ │ - types         │
  │ - TypeScript    │ │ - TypeScript    │ │ - utils         │
  │ - Tailwind CSS  │ │ - Prisma ORM    │ │ - ui            │
  │ - Vite          │ │ - BullMQ        │ │ - shared        │
  │ - Leaflet       │ │ - Pino Logs     │ │                 │
  └─────────┬───────┘ └─────────┬───────┘ └─────────────────┘
            │                   │
            ▼                   ▼
  ┌─────────────────┐ ┌─────────────────┐
  │   PostgreSQL    │ │      Redis      │
  │   (Database)    │ │ (Cache & Queue) │
  └─────────────────┘ └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Astronomy Engine│
                   │ (NASA JPL 準拠)  │
                   └─────────────────┘
```

## レイヤー構成

### プレゼンテーション層（フロントエンド）
- **React 18**: UI フレームワーク
- **TypeScript**: 型安全性（strict mode 有効）
- **Tailwind CSS v3.4.17**: ユーティリティファースト CSS
- **CSS Modules**: コンポーネント固有スタイリング
- **Leaflet**: 地図表示とルート描画
- **Google Maps Integration**: 現在地からの最適ルート検索
- **Vite**: 開発環境とビルドツール

### アプリケーション層（バックエンド）
- **Express.js**: Web フレームワーク
- **TypeScript**: 型安全性
- **JWT**: 認証・認可
- **Helmet**: セキュリティヘッダー
- **Rate Limiting**: API 制限

### ビジネスロジック層（モノレポ構成）
- **CalendarServicePrisma**: カレンダー機能・天気情報統合（Prisma ベース）
- **LocationService**: 地点管理ビジネスロジック（Repository パターン）
- **AstronomicalCalculator**: 天体計算エンジン（Astronomy Engine）
- **AuthServiceRefactored**: JWT 認証管理・アカウントロック
- **EventCacheService**: イベントデータの事前計算と PostgreSQL キャッシュ
- **QueueServiceRefactored**: BullMQ による非同期ジョブ管理
- **DIContainer**: 依存性注入コンテナ

### データアクセス層（Repository パターン）
- **PostgreSQL + Prisma ORM**: メインデータベース
- **Repository インターフェース**: 型安全なデータアクセス抽象化
- **Redis + BullMQ**: キャッシュ・非同期キューシステム
- **Pino**: 構造化ログ（5-10 倍パフォーマンス向上）

### 共有パッケージ層
- **@fuji-calendar/types**: 共通型定義・インターフェース
- **@fuji-calendar/utils**: 時刻処理・ログ・フォーマッター
- **@fuji-calendar/ui**: 再利用可能 React コンポーネント
- **@fuji-calendar/shared**: 共通ビジネスロジック

## 主要コンポーネント

### 天体計算エンジン

```typescript
// AstronomicalCalculatorAstronomyEngine.ts
class AstronomicalCalculatorAstronomyEngine {
  // NASA JPL 準拠の高精度計算
  async calculateDiamondFuji(date: Date, location: Location): Promise<FujiEvent[]>
  async calculatePearlFuji(date: Date, location: Location): Promise<FujiEvent[]>
  
  // 2 段階最適化検索
  private async findOptimalTimeWithAstronomyEngine(): Promise<Date | null>
  
  // 大気屈折補正
  private getAtmosphericRefraction(elevation: number): number
}
```

**特徴:**
- **Astronomy Engine**: NASA JPL 準拠の天体暦
- **2 段階検索**: 粗い検索 (10 分刻み) → 精密検索 (1 分刻み)
- **気象補正**: 日本の気象条件を考慮した大気屈折補正
- **距離別許容範囲**: 観測データに基づく精度調整

### 時刻処理システム

```typescript
// timeUtils.ts
export const timeUtils = {
  // JST 基準の統一処理
  formatDateString(date: Date): string,
  formatTimeString(date: Date): string,
  
  // UTC 変換（Astronomy Engine 用）
  jstToUtc(jstDate: Date): Date,
  utcToJst(utcDate: Date): Date
}
```

**設計原則:**
- **JST 統一**: 全ての時刻を JST 基準で処理
- **API 境界**: Astronomy Engine 用のみ UTC 変換
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
- **Pino**: 5-10 倍の高性能
- **構造化ログ**: JSON 形式での詳細記録
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
  time: Date;                // JST 時刻
  location: Location;
  azimuth: number;          // 撮影方位角
  elevation: number;        // 撮影仰角
}
```

## API デザイン

### RESTful API 設計

```
# カレンダー API
GET /api/calendar/:year/:month            # 月間カレンダー
GET /api/events/:date                     # 日別イベント詳細（天気情報付き）
GET /api/events/upcoming                  # 今後のイベント
GET /api/calendar/:year/:month/best       # おすすめ撮影日
POST /api/calendar/suggest                # 撮影計画提案

# 撮影地点 API
GET /api/locations                        # 撮影地点一覧
GET /api/locations/:id                    # 撮影地点詳細
GET /api/locations/:id/yearly/:year       # 特定地点の年間イベント

# 認証・管理 API
POST /api/auth/login                      # 管理者ログイン
POST /api/auth/logout                     # ログアウト
POST /api/auth/refresh                    # トークンリフレッシュ
POST /api/admin/locations                 # 地点追加（管理者）
PUT /api/admin/locations/:id              # 地点更新（管理者）
DELETE /api/admin/locations/:id           # 地点削除（管理者）

# システム API
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
// JWT + Refresh Token 方式
interface AuthTokens {
  accessToken: string;    // 短期間（15 分）
  refreshToken: string;   // 長期間（7 日）
}

// ミドルウェア認証
app.use('/api/admin', authenticateToken);
```

### セキュリティ対策

1. **Helmet**: セキュリティヘッダー
2. **Rate Limiting**: DDoS 対策
3. **CSRF**: Cross-Site Request Forgery 対策
4. **XSS**: Cross-Site Scripting 対策
5. **SQL Injection**: パラメータ化クエリ

### パスワード管理

```typescript
// bcrypt によるハッシュ化
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

-- イベントキャッシュテーブル（Redis 代替）
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
2. **2 段階検索**: 粗い検索 (10 分刻み) → 精密検索 (10 秒刻み)
3. **季節判定**: ダイヤモンド富士シーズンの絞り込み
4. **並列処理**: 複数地点の同時計算
5. **直接計算**: キャッシュを介さない高速化実装
6. **TypeScript 最適化**: 厳密型チェックによるランタイムエラー削減

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

```

## 拡張可能性

### マイクロサービス化

```yaml
# docker-compose.microservices.yml
services:
  calendar-service:     # カレンダー機能
  calculation-service:  # 天体計算
  auth-service:        # 認証サービス
  notification-service: # 通知機能（将来）
  favorites-service:   # お気に入り管理（将来）
```

### API バージョニング

```typescript
// 将来の API 拡張
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

// 実装：AstronomyEngine, VSOP87, Swiss Ephemeris 等

// 天気サービスプラグイン
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
  favoriteInteraction: false
});
```

## 技術的制約と決定事項

### 制約事項（v0.3.0 での改善状況）

1. **PostgreSQL への移行完了**: SQLite から PostgreSQL + Prisma ORM に移行済み
2. **モノレポ構成**: 単一リポジトリでの効率的な開発、将来的にマイクロサービス化対応
3. **TypeScript strict mode**: 全パッケージで厳密な型チェック、ランタイムエラー大幅削減
4. **依存性注入**: DIContainer による疎結合設計で拡張性向上

### 技術選択の理由（v0.3.0 版）

1. **npm workspaces**: モノレポ構成による効率的なパッケージ管理
2. **PostgreSQL + Prisma ORM**: 型安全なデータベースアクセスとスケーラビリティ
3. **BullMQ + Redis**: 高性能非同期ジョブ処理システム
4. **Astronomy Engine**: NASA JPL 準拠の高精度天体計算
5. **Pino**: 5-10 倍の高性能構造化ログ
6. **Tailwind CSS v3.4.17**: 開発効率とデザイン一貫性
7. **TypeScript strict mode**: 全パッケージでランタイムエラー削減
8. **依存性注入**: DIContainer による疎結合設計
9. **Repository パターン**: データアクセス層の抽象化と型安全性
10. **Vite**: 高速フロントエンドビルドツール
11. **JWT + Refresh Token**: ステートレス認証とセキュリティ
12. **LocalStorage**: シンプルなお気に入り管理
13. **Google Maps API**: 現在地からの最適ルート案内で UX 向上
14. **Docker Compose**: 環境一貫性とマルチコンテナ対応