# アイコンコンポーネント

このプロジェクトでは、lucide-react v0.525.0のアイコンを使用しています。

## 使用方法

### 基本的な使用方法

```tsx
import { Icon } from '../components/icons/IconMap';

// 基本的な使用
<Icon name="location" />

// サイズとクラスを指定
<Icon name="dashboard" size={24} className="text-blue-600" />

// 色を指定
<Icon name="heart" size={20} color="red" />
```

### 富士山アイコン

```tsx
import { FujiIcon } from '../components/icons/FujiIcons';

// ダイヤモンド富士
<FujiIcon type="diamond" size={32} />

// パール富士
<FujiIcon type="pearl" size={32} />
```

## 利用可能なアイコン

### 管理画面用
- `dashboard` - ダッシュボード
- `location` - 地点管理
- `queue` - キュー管理
- `calendar` - カレンダー
- `data` - データ管理
- `users` - ユーザー管理
- `settings` - 設定

### 一般的なアイコン
- `heart` - お気に入り
- `star` - 評価
- `clock` - 時間
- `eye` - 表示
- `search` - 検索
- `filter` - フィルター
- `add` - 追加
- `edit` - 編集
- `trash` - 削除
- `check` - チェック
- `close` - 閉じる

## 新しいアイコンの追加

1. `IconMap.tsx`でlucide-reactからアイコンをインポート
2. `iconMap`オブジェクトに追加
3. TypeScriptの型安全性により、存在しないアイコン名を使用するとエラーになります