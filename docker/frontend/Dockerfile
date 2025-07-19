# フロントエンド専用Dockerfile
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --silent

# ソースコードをコピー
COPY . .

# フロントエンドをビルド
RUN npm run build:client

# 静的ファイル配信用
FROM nginx:alpine AS production

# Nginxの設定をコピー
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend/default.conf /etc/nginx/conf.d/default.conf

# ビルド済み静的ファイルをコピー
COPY --from=builder /app/dist/client /usr/share/nginx/html

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# ポートを公開
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]