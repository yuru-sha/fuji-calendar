# Astronomy Engine Horizon関数エラー修正ガイド

**バージョン 0.3.0** - モノレポ構成・高性能版

## 問題の概要

**エラーメッセージ**: `"Value is not a finite number: undefined"`  
**発生箇所**: `Astronomy.Horizon()` 関数の呼び出し時  
**原因**: `equatorial.ra` または `equatorial.dec` が `undefined` になっている

## 根本原因の分析

このエラーは以下の原因で発生します：

1. **`Astronomy.Equator()`の戻り値が不正**
   - `time` または `observer` が無効な値
   - 座標値が適切に初期化されていない

2. **astronomy-engineライブラリの内部検証**
   - ライブラリが引数の有限性を厳密にチェック
   - `undefined`、`NaN`、`Infinity` を検出してエラーを投げる

## 修正方法

### 1. 基本的な修正パターン

```typescript
// ❌ 修正前：検証なし
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');

// ✅ 修正後：検証付き
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);

// 赤道座標の検証
if (!Number.isFinite(equatorial.ra) || !Number.isFinite(equatorial.dec)) {
  throw new Error(`Invalid equatorial coordinates: ra=${equatorial.ra}, dec=${equatorial.dec}`);
}

const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
```

### 2. 完全な検証付き実装

```typescript
async function calculateSunPositionSafe(time: Date, location: Location): Promise<CelestialPosition> {
  // 1. 入力値検証
  if (!time || !(time instanceof Date) || isNaN(time.getTime())) {
    throw new Error(`Invalid time: ${time}`);
  }
  
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error(`Invalid coordinates: lat=${location.latitude}, lng=${location.longitude}`);
  }

  // 2. Observer作成
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation);
  
  // 3. 赤道座標計算と検証
  const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
  
  if (typeof equatorial.ra !== 'number' || !Number.isFinite(equatorial.ra)) {
    throw new Error(`Invalid RA: ${equatorial.ra} (type: ${typeof equatorial.ra})`);
  }
  
  if (typeof equatorial.dec !== 'number' || !Number.isFinite(equatorial.dec)) {
    throw new Error(`Invalid Dec: ${equatorial.dec} (type: ${typeof equatorial.dec})`);
  }

  // 4. 地平座標計算
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  
  // 5. 結果検証
  if (!Number.isFinite(horizontal.azimuth) || !Number.isFinite(horizontal.altitude)) {
    throw new Error(`Invalid horizontal coordinates: azimuth=${horizontal.azimuth}, altitude=${horizontal.altitude}`);
  }

  return {
    azimuth: horizontal.azimuth,
    elevation: horizontal.altitude,
    correctedElevation: horizontal.altitude
  };
}
```

## Horizon関数の正しい使い方

### 基本シグネチャ

```typescript
Astronomy.Horizon(
  date: FlexibleDateTime,     // Date object, number, or AstroTime
  observer: Observer,         // Observer instance
  ra: number,                // Right ascension (sidereal hours)
  dec: number,               // Declination (degrees) 
  refraction?: string        // 'normal', 'jplhor', or omit for no refraction
): HorizontalCoordinates
```

### 大気屈折オプション

```typescript
// 推奨：標準的な大気屈折補正
const horizontal = Astronomy.Horizon(time, observer, ra, dec, 'normal');

// 屈折補正なし（理論値）
const horizontal = Astronomy.Horizon(time, observer, ra, dec);

// JPL Horizons互換（非推奨）
const horizontal = Astronomy.Horizon(time, observer, ra, dec, 'jplhor');
```

### 大気屈折効果の比較

```typescript
// 屈折ありとなしの比較
const normalRefraction = Astronomy.Horizon(time, observer, ra, dec, 'normal');
const noRefraction = Astronomy.Horizon(time, observer, ra, dec);

const refractionEffect = normalRefraction.altitude - noRefraction.altitude;
console.log(`大気屈折効果: ${refractionEffect.toFixed(4)}度`);
```

## Observer オブジェクトの正しい作成

```typescript
// ✅ 正しい方法
const observer = new Astronomy.Observer(
  35.6762,   // 緯度（度）
  139.6503,  // 経度（度）
  40         // 標高（メートル）
);

// 作成後の検証
if (!Number.isFinite(observer.latitude) || 
    !Number.isFinite(observer.longitude) || 
    !Number.isFinite(observer.height)) {
  throw new Error('Observer creation failed');
}
```

## デバッグ方法

### 1. 段階的な値の確認

```typescript
console.log('Time:', time, 'Valid:', time instanceof Date && !isNaN(time.getTime()));
console.log('Observer:', observer);
console.log('Equatorial:', equatorial);
console.log('RA type:', typeof equatorial.ra, 'Value:', equatorial.ra, 'Finite:', Number.isFinite(equatorial.ra));
console.log('Dec type:', typeof equatorial.dec, 'Value:', equatorial.dec, 'Finite:', Number.isFinite(equatorial.dec));
```

### 2. Try-Catchによるエラーハンドリング

```typescript
try {
  const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
  return horizontal;
} catch (error) {
  console.error('Horizon calculation failed:', {
    time: time.toISOString(),
    observer: observer,
    ra: equatorial.ra,
    dec: equatorial.dec,
    error: error.message
  });
  throw error;
}
```

## 実際のプロジェクトでの適用

### AstronomicalCalculatorAstronomyEngine.ts の修正

現在のコード（658-659行目）：
```typescript
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
```

修正版：
```typescript
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);

// 赤道座標の検証
if (!Number.isFinite(equatorial.ra) || !Number.isFinite(equatorial.dec)) {
  const errorMsg = `Invalid equatorial coordinates for ${location.name} at ${time.toISOString()}: ra=${equatorial.ra}, dec=${equatorial.dec}`;
  this.logger.error(errorMsg, { location, time, equatorial });
  throw new Error(errorMsg);
}

const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');

// 地平座標の検証
if (!Number.isFinite(horizontal.azimuth) || !Number.isFinite(horizontal.altitude)) {
  const errorMsg = `Invalid horizontal coordinates for ${location.name}: azimuth=${horizontal.azimuth}, altitude=${horizontal.altitude}`;
  this.logger.error(errorMsg, { location, time, horizontal });
  throw new Error(errorMsg);
}
```

## テストケース

### 基本テスト

```bash
# 基本動作テスト
node scripts/test-astronomy-engine-horizon.js

# TypeScript版サンプル
npx ts-node scripts/astronomy-engine-sample-fixed.ts

# 修正版計算機テスト
npx ts-node scripts/astronomical-calculator-fixed.ts
```

### エラーケースのテスト

```typescript
// undefined値のテスト
const result1 = Astronomy.Horizon(time, observer, undefined, 0, 'normal'); // Error

// NaN値のテスト  
const result2 = Astronomy.Horizon(time, observer, NaN, NaN, 'normal'); // Error

// 無効なDateのテスト
const result3 = Astronomy.Horizon(new Date('invalid'), observer, 0, 0, 'normal'); // Error
```

## パフォーマンス最適化

### 1. バッチ検証

```typescript
function validateEquatorialBatch(equatorials: any[], bodyName: string): void {
  for (let i = 0; i < equatorials.length; i++) {
    const eq = equatorials[i];
    if (!Number.isFinite(eq.ra) || !Number.isFinite(eq.dec)) {
      throw new Error(`Batch validation failed at index ${i}: ra=${eq.ra}, dec=${eq.dec}`);
    }
  }
}
```

### 2. キャッシュ活用

```typescript
private coordinateCache = new Map<string, any>();

private getCachedCoordinates(key: string, calculator: () => any): any {
  if (!this.coordinateCache.has(key)) {
    const result = calculator();
    this.coordinateCache.set(key, result);
  }
  return this.coordinateCache.get(key);
}
```

## まとめ

1. **必ず検証を追加**：`Astronomy.Equator()` の戻り値を使用前に検証
2. **段階的デバッグ**：問題発生時は各段階の値を確認
3. **適切なエラーハンドリング**：詳細なエラーメッセージでデバッグを支援
4. **ログ活用**：計算過程を記録して問題の早期発見
5. **テスト充実**：正常ケースとエラーケース両方をテスト

この修正により、`"Value is not a finite number: undefined"` エラーは解決され、より堅牢な天体計算システムが構築できます。