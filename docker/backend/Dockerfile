# バックエンド専用 Dockerfile（モノレポ対応）
FROM node:18-alpine AS builder

# 必要なシステムパッケージをインストール
RUN apk add --no-cache postgresql-client python3 make g++

# 作業ディレクトリを設定
WORKDIR /app

# モノレポの package.json をコピー
COPY package*.json ./

# workspaces 設定をコピー
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# TypeScript 設定ファイルをコピー
COPY tsconfig*.json ./
COPY apps/server/tsconfig.json ./apps/server/

# 依存関係をインストール
RUN npm ci --silent

# ソースコードをコピー
COPY . .

# Prisma クライアントを生成
RUN npx prisma generate

# 依存関係順にパッケージをビルド
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/ui

# バックエンドのビルドはスキップ（ts-nodeを使用）

# 本番用イメージ
FROM node:18-alpine AS production

# 必要なシステムパッケージをインストール
RUN apk add --no-cache \
    postgresql-client \
    python3 \
    make \
    g++ \
    curl \
    tini

# アプリケーション用ユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fuji-calendar -u 1001

# 作業ディレクトリを設定
WORKDIR /app

# モノレポの package.json をコピー
COPY package*.json ./
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/ui/package.json ./packages/ui/

# TypeScript 設定ファイルをコピー
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/apps/server/tsconfig.json ./apps/server/

# 全ての依存関係をインストール（ts-node 実行のため型定義が必要）
RUN npm ci --silent && npm cache clean --force

# ソースコードとビルド済みパッケージをコピー
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma

# Prisma クライアントを生成
RUN npx prisma generate

# 共有パッケージを本番ステージで再ビルド（型定義が必要）
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/ui

# バックエンドのビルドはスキップ（ts-nodeを使用）

# ts-node 環境変数を設定
ENV TS_NODE_TRANSPILE_ONLY=true

# ログディレクトリを作成
RUN mkdir -p /app/logs && chown -R fuji-calendar:nodejs /app

# ユーザーを切り替え
USER fuji-calendar

# ポートを公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# tini を使用してプロセス管理
ENTRYPOINT ["/sbin/tini", "--"]

# アプリケーションを起動
CMD ["npm", "start"]