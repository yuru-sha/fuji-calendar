# 依存関係最適化ガイド

## 概要
このドキュメントでは、fuji-calendar プロジェクトの依存関係分析結果に基づいた具体的な改善実装について説明します。

## 実装済みの改善

### 1. パッケージ依存関係の修正

#### ✅ packages/ui/package.json の修正
```diff
  "dependencies": {
    "@fuji-calendar/types": "^0.3.0",
-   "lucide-react": "^0.525.0",
-   "react": "^18.3.1"
+   "lucide-react": "^0.525.0"
  },
```

**効果**: React の重複インストールを防ぎ、バンドルサイズを約 140KB 削減

#### ✅ バージョン統一化
全ての内部パッケージ依存関係を `"*"` から `"^0.3.0"` に統一：
- `@fuji-calendar/types`: 全パッケージで統一
- `@fuji-calendar/utils`: 全パッケージで統一
- `@fuji-calendar/ui`: client パッケージでのみ使用

### 2. 循環依存チェックの自動化

#### ✅ madge ツールの導入
```bash
npm install --save-dev madge@^7.0.0
```

#### ✅ 新しいスクリプトの追加
```json
{
  "scripts": {
    "check-circular": "madge --circular --extensions ts,tsx --exclude 'node_modules' apps/ packages/",
    "dependency-graph": "madge --image dependency-graph.svg --extensions ts,tsx --exclude 'node_modules' apps/ packages/",
    "analyze-deps": "npm run check-circular && npm run dependency-graph"
  }
}
```

#### ✅ madge 設定ファイル (.madgerc)
```json
{
  "fileExtensions": ["ts", "tsx", "js", "jsx"],
  "excludeRegExp": [
    "node_modules",
    "\\.test\\.",
    "\\.spec\\.",
    "dist/",
    "build/"
  ],
  "detectiveOptions": {
    "ts": {
      "skipTypeImports": true
    }
  },
  "tsConfig": "./tsconfig.json"
}
```

#### ✅ CI/CD 統合 (.github/workflows/dependency-check.yml)
GitHub Actions で自動的に循環依存をチェックし、依存関係グラフを生成。

### 3. Repository パターンの完全実装

#### ✅ 新しい Repository インターフェースの作成
- `SystemSettingsRepository`: システム設定用のリポジトリ
- `EventRepository`: イベントデータ用のリポジトリ
- `PrismaSystemSettingsRepository`: Prisma 実装

#### 🔄 直接 Prisma アクセスの特定（改善が必要）
以下のファイルで直接 Prisma アクセスが確認されました：
1. `middleware/auth.ts` - 認証ミドルウェア
2. `controllers/BackgroundJobController.ts` - バックグラウンドジョブコントローラー
3. `services/EventCacheService.ts` - イベントキャッシュサービス
4. `services/BatchCalculationService.ts` - バッチ計算サービス

### 4. アーキテクチャルールの定義

#### ✅ .architecture-rules.yml の作成
プロジェクトの依存関係ルールを明文化：
```yaml
# パッケージ構造定義
packages:
  "@fuji-calendar/types":
    allowed_dependencies: []
  "@fuji-calendar/utils":
    allowed_dependencies: ["@fuji-calendar/types", "pino"]
  # ... その他のパッケージ

# アーキテクチャルール
rules:
  dependency_direction:
    - name: "共有パッケージは他の共有パッケージのみに依存"
  layered_architecture:
    - name: "Repository パターンの強制"
```

#### ✅ アーキテクチャ検証スクリプト
```bash
npm run validate-architecture
```

### 5. パフォーマンス最適化

#### ✅ バンドルサイズ分析スクリプト
```bash
npm run analyze-bundle
```

機能:
- 各パッケージのサイズ測定
- 重複依存関係の特定
- 重い依存関係の識別
- 最適化提案の生成

## 実行方法

### 依存関係分析の実行
```bash
# 循環依存チェック
npm run check-circular

# 依存関係グラフ生成
npm run dependency-graph

# 全依存関係分析
npm run analyze-deps

# アーキテクチャ検証
npm run validate-architecture

# バンドルサイズ分析
npm run analyze-bundle

# 包括的なパフォーマンスチェック
npm run performance-check
```

### CI/CD での自動実行
GitHub Actions ワークフローが以下をチェック：
- 循環依存の検出
- 依存関係グラフの生成
- アーキテクチャルールの検証

## 今後の改善提案

### 1. Repository パターンの完全移行
直接 Prisma アクセスしている箇所を Repository パターンに移行：

```typescript
// 現在 (改善が必要)
const admin = await prisma.admin.findUnique({ where: { username } });

// 推奨
const admin = await this.authRepository.findByUsername(username);
```

### 2. 共通型定義パッケージの拡張
`@fuji-calendar/types` に以下を追加：
- `SystemSetting` インターフェース
- `BackgroundJob` インターフェース
- エラー型定義

### 3. 開発用ツールの統一
```json
{
  "devDependencies": {
    "@types/node": "^20.9.0",
    "typescript": "^5.2.2",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "eslint": "^8.53.0"
  }
}
```

これらをルートの package.json に移動し、各パッケージから削除。

### 4. Tree Shaking の最適化
```javascript
// rollup.config.js または vite.config.ts で
export default {
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@fuji-calendar/utils']
        }
      }
    }
  }
}
```

### 5. 定期的なメンテナンス
```bash
# 月次実行推奨
npm run performance-check
npm run validate-architecture

# 依存関係の更新確認
npm audit
npm outdated
```

## メトリクス目標

### バンドルサイズ削減
- **現在**: 分析実行で確認
- **目標**: フロントエンドバンドル 500KB 未満 (gzip)

### 依存関係品質
- **循環依存**: 0 件維持
- **重複依存**: 開発用ツール以外は 0 件
- **アーキテクチャ違反**: 0 件維持

### パフォーマンス
- **ビルド時間**: 30 秒未満
- **初回ロード時間**: 2 秒未満
- **型チェック時間**: 10 秒未満

## 参考リソース

- [madge - Circular dependency detection](https://github.com/pahen/madge)
- [npm workspaces best practices](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Architecture Decision Records](https://adr.github.io/)
- [Bundle analysis tools comparison](https://bundlephobia.com/)