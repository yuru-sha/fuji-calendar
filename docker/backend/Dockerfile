# バックエンド専用Dockerfile（マルチコンテナ構成用）
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --silent

# ソースコードをコピー
COPY . .

# ビルド（フロントエンド + バックエンド）
RUN npm run build

# 本番用イメージ
FROM node:18-alpine AS production

# 必要なシステムパッケージをインストール
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    python3 \
    make \
    g++ \
    wget

# アプリケーション用ユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fuji-calendar -u 1001

# 作業ディレクトリを設定
WORKDIR /app

# 本番依存関係のみをコピー
COPY package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

# ビルド済みアプリケーションをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server/database/schema.sql ./src/server/database/

# データディレクトリを作成
RUN mkdir -p /app/data && chown -R fuji-calendar:nodejs /app

# ユーザーを切り替え
USER fuji-calendar

# ポートを公開
EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8000/api/health || exit 1

# アプリケーションを起動
CMD ["npm", "start"]