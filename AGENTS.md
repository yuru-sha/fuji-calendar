# Repository Guidelines

## Project Overview

fuji-calendar は、ダイヤモンド富士・パール富士の撮影日と場所を計画する TypeScript モノレポです。React のカレンダー/地図フロントエンド、Express API、天体イベントの計算・キャッシュ・バックグラウンド処理を提供します。

## Architecture & Data Flow

npm workspaces は `apps/*` と `packages/*` を管理します。基本のリクエスト経路は `apps/client` のページ → `services/apiClient.ts` → Express middleware/routes/controllers → DI 経由の services → Prisma repositories → PostgreSQL です。Redis/BullMQ による重いイベント計算は API リクエストから分離し、`apps/server/src/worker.ts` の worker が処理します。お気に入りはクライアント側サービスで管理します。

依存の置き場所を維持してください。画面/API固有コードは各 app、共有型・時刻処理・ログ・UIは `packages/types`、`packages/utils`、`packages/ui` に置きます。DBアクセスは Prisma、サービス間の依存解決は既存の DI/ServiceRegistry、バックグラウンド処理は既存の Redis/BullMQ 経路を使います。

## Key Directories

- `apps/client/src/`: React SPA。`pages/` は画面、`components/` と `features/` は UI、`services/` は API・認証・お気に入り、`hooks/` は画面向け状態/取得処理。
- `apps/server/src/`: Express API と worker。`routes/`, `controllers/`, `services/`, `repositories/`, `middleware/`, `di/`, `database/` が責務ごとに分かれています。
- `apps/server/test/`: Node 標準テストランナーによるサーバー単体・統合テスト。
- `packages/types`, `packages/utils`, `packages/ui`: workspace 間で共有する型、共通ユーティリティ、React UI。
- `prisma/`: PostgreSQL schema と migrations。`scripts/`: admin、debug、データ生成、移行、検証、運用補助。
- `tests/e2e/`: Playwright E2E。`docs/`: setup、API、architecture、astronomy、queue/cache、運用ガイド。

## Development Commands

Node/npm の要件はルート `package.json` の `engines` を基準にしてください（Node.js `>=26.10.0`、npm `>=11.19.1`）。依存導入は `npm install`。

```sh
npm run dev                 # client、server、worker
npm run dev:client          # Vite client
npm run dev:server          # Express server
npm run dev:worker          # background worker
npm run build               # 全workspace
npm run typecheck           # workspaceごとの型チェック
npm run lint                # client/server src を Oxlint
npm test                    # workspaceごとのテスト
npm run test:e2e            # Playwright E2E
npm run validate-architecture
npm run check-circular
```

個別workspaceのコマンドは `npm run <script> --workspace=apps/server` の形式で実行できます。server の build/typecheck/test は Prisma Client 生成を伴います。DBやRedisが必要な操作では `.env.example` と対象環境を確認し、意図しないDBへの接続・変更を避けてください。

## Code Conventions & Common Patterns

- TypeScript の既存型を活用し、安易な `any` を避けます。新しい依存や独自の並行パターンを足す前に、該当workspaceの既存実装を確認します。
- Client はページ/コンポーネントから既存の `services/apiClient.ts`、`authService.ts`、`favoritesService.ts` と hooks を利用します。API呼び出しを各画面に重複実装しません。
- Server は route/controller/service/repository の責務を保ち、DB操作を repository/Prisma に集約します。既存の DI 登録と構造化 Pino logger（`@fuji-calendar/utils`）を使い、アプリケーションコードに `console.*` を追加しません。
- ユーザー向けの日付・時刻は `packages/utils/src/timeUtils.ts` の JST 処理を使います。天体計算の変更時は `docs/diamond-pearl-fuji-conditions.md` と既存計算ロジックを参照します。
- 管理APIの変更では既存の認証・認可・入力検証境界を維持します。コメントはコードの言い換えでなく、非自明な制約や理由がある場合に限ります。

## Important Files

- `apps/client/src/main.tsx`, `App.tsx`: SPA entry とルーティング。
- `apps/server/src/server.ts`, `bootstrap.ts`, `worker.ts`: API/worker entry と起動処理。
- `apps/server/src/di/ServiceRegistry.ts`, `database/prisma.ts`: 依存登録と Prisma lifecycle。
- `apps/server/src/services/AstronomicalCalculator.ts`, `services/astronomical/`: 富士イベント計算。
- `packages/types/src/index.ts`, `packages/utils/src/index.ts`: shared package exports。
- `package.json`, workspace 各 `package.json`, `tsconfig.json`, `playwright.config.ts`, `prisma.config.ts`: scripts・build・test・DB設定。
- `README.md`, `docs/quickstart.md`, `docs/architecture.md`, `docs/api.md`, `docs/queue-system.md`: 主要な導入・設計資料。

## Runtime/Tooling Preferences

Node.js と npm workspaces が標準です。Client は Vite/React、server は Express/TypeScript、DB は PostgreSQL + Prisma、cache/queue は Redis + BullMQ、lint は Oxlint、E2E は Playwright です。依存は対象workspaceに追加し、共有コードは利用workspaceが依存する `packages/*` に配置してください。Vite/E2E のポートや環境変数は `apps/client/vite.config.ts`、`playwright.config.ts`、`.env.example` を確認し、古い文書の値を前提にしないでください。

## Testing & QA

Server tests は `apps/server/test/*.test.cjs` の `node:test` を使い、ルートの `npm test` から実行します。Browser E2E は `tests/e2e/*.spec.ts` の Playwright テストで、`npm run test:e2e` を使います。Client と shared packages にテストscriptがない場合、`npm test` はそれらのworkspaceをスキップします。変更した振る舞いに対応する狭いテストを実行し、必要に応じて `npm run typecheck` と `npm run lint` も確認してください。

## Documentation Notes

詳細なセットアップは `docs/quickstart.md` / `docs/installation.md`、開発・デバッグ補助は `docs/development-tools.md`、天体計算は `docs/diamond-pearl-fuji-conditions.md` を参照します。文書には旧構成・旧バージョンの記述が残ることがあります。コマンドと依存要件はルート/workspace の `package.json`、実装・設定ファイルを根拠にし、変更で挙動や公開APIが変わる場合は該当ガイドも更新してください。

## Workflow

Before substantive changes, check for related Issues and Pull Requests. Work on a feature branch; do not edit `main` directly. Follow `CONTRIBUTING.md` for Conventional Commit messages and Pull Request requirements.
