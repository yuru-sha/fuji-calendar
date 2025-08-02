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

# 依存関係をインストール
RUN npm ci --silent

# ソースコードをコピー
COPY . .

# Prisma クライアントを生成
RUN npx prisma generate

# 共有パッケージをビルド
RUN npm run build:packages

# バックエンドをビルド
RUN npm run build:server

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
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# 本番依存関係のみをインストール
RUN npm ci --only=production --silent && npm cache clean --force

# ビルド済みアプリケーションをコピー
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma

# Prisma クライアントを生成
RUN npx prisma generate

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