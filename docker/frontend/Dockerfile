# フロントエンド専用 Dockerfile（モノレポ対応）
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# モノレポの package.json をコピー
COPY package*.json ./

# workspaces 設定をコピー
COPY apps/client/package.json ./apps/client/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/

# 依存関係をインストール
RUN npm ci --silent

# ソースコードをコピー
COPY . .

# Prisma クライアントを生成（型定義のため）
RUN npx prisma generate

# 共有パッケージをビルド
RUN npm run build:packages

# フロントエンドをビルド
RUN npm run build:client

# 静的ファイル配信用
FROM nginx:alpine AS production

# Nginx の設定をコピー
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend/default.conf /etc/nginx/conf.d/default.conf

# ビルド済み静的ファイルをコピー
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# ポートを公開
EXPOSE 80

# Nginx を起動
CMD ["nginx", "-g", "daemon off;"]