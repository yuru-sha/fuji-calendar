# Redis キャッシュ戦略実装提案

## 概要

既存の RedisService を活用して、主要なデータアクセスパターンにキャッシュ機能を統合し、パフォーマンスを向上させる戦略を提案します。

## 現状分析

### 実装済み Redis 機能
- ✅ **月間イベントキャッシュ**: 7 日 TTL
- ✅ **セッション管理**: 24 時間 TTL  
- ✅ **お気に入りキャッシュ**: 30 日 TTL
- ✅ **地点情報キャッシュ**: 1 時間 TTL
- ✅ **天気情報キャッシュ**: 30 分 TTL

### 改善が必要な箇所
1. **LocationRepository**: 地点データの頻繁な DB アクセス
2. **BatchCalculationService**: 修正済みの N+1 問題に追加でキャッシュ最適化
3. **CalendarService**: 月間データ集計の重複計算

## 提案する実装

### 1. LocationRepository の Redis 統合

```typescript
// PrismaLocationRepository の拡張
export class PrismaLocationRepository implements LocationRepository {
  private redisService = new RedisService();
  
  async findAll(): Promise<Location[]> {
    // キャッシュ確認
    const cacheKey = 'locations:all';
    const cached = await this.redisService.getLocationData(cacheKey);
    
    if (cached) {
      logger.debug('地点データキャッシュヒット');
      return cached;
    }
    
    // DB から取得
    const locations = await this.prisma.location.findMany({
      orderBy: { id: 'asc' }
    });
    
    // キャッシュに保存
    await this.redisService.cacheLocationData(cacheKey, locations);
    
    return locations.map(this.formatLocation);
  }
  
  async findById(id: number): Promise<Location | null> {
    const cacheKey = `location:${id}`;
    const cached = await this.redisService.getLocationData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { events: { /* ... */ } }
    });
    
    if (location) {
      await this.redisService.cacheLocationData(cacheKey, location);
    }
    
    return location ? this.formatLocation(location) : null;
  }
}
```

### 2. BatchCalculationService の最適化

```typescript
export class BatchCalculationService {
  async calculateMonthEvents(
    year: number,
    month: number,
    locationIds: number[]
  ): Promise<BatchCalculationResult> {
    
    // 地点データを Redis から一括取得
    const cacheKeys = locationIds.map(id => `location:${id}`);
    const cachedLocations = await Promise.all(
      cacheKeys.map(key => this.redisService.getLocationData(key))
    );
    
    // キャッシュミスした地点のみ DB から取得
    const missingIds = locationIds.filter((id, index) => !cachedLocations[index]);
    
    if (missingIds.length > 0) {
      const dbLocations = await this.prisma.location.findMany({
        where: { id: { in: missingIds } }
      });
      
      // Redis に保存
      await Promise.all(dbLocations.map(loc => 
        this.redisService.cacheLocationData(`location:${loc.id}`, loc)
      ));
    }
    
    // 処理継続...
  }
}
```

### 3. キャッシュ無効化戦略

```typescript
export class LocationService {
  async updateLocation(id: number, data: UpdateLocationRequest): Promise<Location> {
    const updatedLocation = await this.locationRepository.update(id, data);
    
    // 関連キャッシュを無効化
    await this.invalidateLocationCaches(id);
    
    return updatedLocation;
  }
  
  private async invalidateLocationCaches(locationId: number): Promise<void> {
    await Promise.all([
      this.redisService.clearCache(`location:${locationId}`),
      this.redisService.clearCache('locations:all'),
      this.redisService.clearCache(`monthly_events:*`) // 影響する月間データ
    ]);
  }
}
```

## パフォーマンス効果予測

### Before（現在）
- **LocationRepository.findAll()**: 常に DB クエリ実行 (~100ms)
- **複数地点取得**: N+1 は解決済み、但し DB アクセス毎回発生 (~50ms)
- **月間計算**: 地点データ取得で毎回 DB アクセス

### After（Redis キャッシュ適用後）
- **LocationRepository.findAll()**: キャッシュヒット時 1-2ms (98% 改善)
- **複数地点取得**: キャッシュ効率 80% で 10-15ms (70% 改善)
- **月間計算**: 地点データ取得が高速化され全体で 40-60% 改善

## 実装優先度

### 🔴 **High Priority** 
1. **LocationRepository の基本キャッシュ**: `findAll()`, `findById()`
2. **キャッシュ無効化ロジック**: 更新・削除時の適切なクリア

### 🟡 **Medium Priority**
3. **BatchCalculationService 統合**: 地点データキャッシュ活用
4. **月間イベントキャッシュの活用拡大**: CalendarService での利用

### 🟢 **Low Priority**  
5. **キャッシュ統計とモニタリング**: 管理画面での表示
6. **キャッシュウォームアップ**: 起動時の事前データロード

## メモリ使用量予測

- **地点データ**: ~50KB × 100 地点 = 5MB
- **月間イベント**: ~200KB × 12 ヶ月 = 2.4MB  
- **セッション**: ~1KB × 100 セッション = 100KB
- **合計**: 約 8-10MB（Redis メモリ使用量）

## 注意事項

1. **データ整合性**: 更新時のキャッシュ無効化を確実に実行
2. **メモリ監視**: Redis メモリ使用量の定期的な確認
3. **TTL 調整**: アクセスパターンに基づく最適な TTL 設定
4. **エラーハンドリング**: Redis 障害時の適切なフォールバック

## 結論

既存の RedisService を基盤として、段階的にキャッシュ機能を統合することで、大幅なパフォーマンス向上が期待できます。特に地点データの頻繁なアクセスパターンに対して効果的な改善が見込めます。