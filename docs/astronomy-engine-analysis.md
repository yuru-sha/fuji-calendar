# Astronomy Engine 時刻処理の詳細分析結果

**バージョン 0.3.0** - モノレポ構成・高性能版

## 重要な発見

### 1. SearchRiseSet の戻り値について
- **SearchRiseSet は UTC時刻で結果を返す**
- `moonrise.date.toISOString()` → "2025-01-20T14:05:16.458Z" (UTC)
- `moonrise.date.getHours()` → 23 (JST = UTC + 9時間)

### 2. 現在のコードの問題点

#### 問題1: 入力時刻の解釈
```typescript
// 現在のコード（AstronomicalCalculatorAstronomyEngine.ts 220行目）
const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, date, 1);
```

- `date` は `new Date(year, month - 1, day)` で作成されている
- これはローカル時刻として解釈されるが、実際にはUTC時刻として扱われている
- つまり、JST 0:00のつもりがUTC 0:00として処理されている

#### 問題2: 戻り値の時刻解釈
```typescript
// 225行目
const risingEvent = await this.checkMoonAlignment(moonrise.date, location, fujiAzimuth, fujiElevation, 'rising');
```

- `moonrise.date` はUTC時刻
- しかし `checkMoonAlignment` 内で `Astronomy.Equator()` に渡される時刻が混乱している

### 3. 時刻処理の流れ

#### 正しい流れ（修正が必要）
```
入力: JST日付 → UTC変換 → SearchRiseSet → UTC結果 → JST変換（表示用）
```

#### 現在の問題のある流れ
```
入力: JST日付 → SearchRiseSet → UTC結果 → そのまま使用（時刻ずれ）
```

## 修正が必要な箇所

### 1. calculatePearlFuji メソッド (199-254行目)
```typescript
// 修正前
const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, date, 1);

// 修正後（UTC時刻として明示的に変換）
const utcDate = timeUtils.jstToUtc(date);
const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, utcDate, 1);
```

### 2. checkMoonAlignment メソッド (409-437行目)
```typescript
// moonrise.date は既にUTC時刻なので、そのまま使用可能
// ただし、結果の時刻をJSTで返す場合は変換が必要
```

### 3. 太陽位置計算 (442-453行目)
```typescript
// 修正前
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);

// 修正後（時刻の意味を明確化）
// time が既にUTCの場合はそのまま、JSTの場合は変換
const utcTime = time; // SearchRiseSetからの戻り値なので既にUTC
const equatorial = Astronomy.Equator(Astronomy.Body.Sun, utcTime, observer, true, true);
```

## 検証結果のまとめ

1. **Astronomy Engine は常にUTC時刻で動作する**
2. **SearchRiseSet の戻り値は UTC時刻**
3. **JavaScript の Date.getHours() はローカル時刻（JST）を返す**
4. **現在のコードは9時間のずれが発生する可能性がある**

## 推奨修正方針

1. SearchRiseSet に渡す日付を明示的にUTCに変換
2. 戻り値の時刻をJSTとして扱う場合は適切に変換
3. timeUtils の jstToUtc / utcToJst を活用
4. コメントで時刻の意味（UTC/JST）を明記

## 重要度: 高
この問題により、パール富士の時刻が最大9時間ずれる可能性があります。