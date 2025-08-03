# 共通ベース Dockerfile（バックエンド API + ワーカー）
FROM node:18-alpine AS base

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

# package.json をコピーして依存関係をインストール
COPY package*.json ./

# ディレクトリ作成と package.json コピー
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/

# 依存関係をインストール
RUN npm ci --silent && npm cache clean --force

# 全ソースコードをコピー
COPY . .

# Prisma クライアントを生成
RUN npx prisma generate

# 共有パッケージをビルド
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils
RUN npm run build --workspace=packages/ui

# 基本環境変数設定
ENV NODE_ENV=production
ENV TS_NODE_TRANSPILE_ONLY=true

# ログディレクトリを作成
RUN mkdir -p /app/logs && chown -R fuji-calendar:nodejs /app

# ユーザーを切り替え
USER fuji-calendar

# tini を使用してプロセス管理
ENTRYPOINT ["/sbin/tini", "--"]

# ===== API サーバー用ステージ =====
FROM base AS api

# API サーバー用環境変数
ENV DISABLE_WORKER=true

# ポートを公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# API サーバーを起動
CMD ["npx", "ts-node", "--project", "apps/server/tsconfig.json", "apps/server/src/server.ts"]

# ===== ワーカー用ステージ =====
FROM base AS worker

# ワーカー専用環境変数
ENV WORKER_ONLY=true

# ヘルスチェック（ワーカープロセスが動作しているかチェック）
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD pgrep -f "worker" || exit 1

# ワーカープロセスを起動
CMD ["npx", "ts-node", "--project", "apps/server/tsconfig.json", "apps/server/src/worker.ts"]