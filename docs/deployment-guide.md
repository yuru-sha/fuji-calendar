# デプロイメントガイド

## 概要

ダイヤモンド富士・パール富士カレンダーの本番環境へのデプロイメント手順とベストプラクティスを説明します。

## 前提条件

### システム要件

#### 最小要件
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ストレージ**: 20GB以上（ログ・データベース・キャッシュ含む）
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker対応OS

#### 推奨要件
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ストレージ**: SSD 50GB以上
- **ネットワーク**: 1Gbps以上

### 必要ソフトウェア

#### Docker環境（推奨）
- Docker 20.10+
- Docker Compose 2.0+

#### ネイティブ環境
- Node.js 18+
- Redis 7+
- nginx 1.20+

## Docker環境でのデプロイ（推奨）

### 1. 環境準備

#### リポジトリクローン
```bash
git clone https://github.com/your-org/fuji-calendar.git
cd fuji-calendar
```

#### 環境変数設定
```bash
cp .env.example .env
```

**.env の重要設定項目**
```bash
# 本番環境設定
NODE_ENV=production
PORT=8000

# データベース
DB_PATH=/app/data/fuji-calendar.db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# 認証（必須変更）
JWT_SECRET=your-super-secure-32-character-or-longer-secret-key
REFRESH_SECRET=your-super-secure-32-character-or-longer-refresh-secret

# ログ設定
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_DIR=/app/logs

# CORS設定（本番ドメインに変更）
FRONTEND_URL=https://your-domain.com
```

### 2. セキュリティ設定

#### JWT秘密鍵生成
```bash
# 32文字以上の安全な秘密鍵を生成
openssl rand -base64 32 > jwt_secret.txt
openssl rand -base64 32 > refresh_secret.txt

# .envファイルに設定
echo "JWT_SECRET=$(cat jwt_secret.txt)" >> .env
echo "REFRESH_SECRET=$(cat refresh_secret.txt)" >> .env

# 秘密鍵ファイルを削除
rm jwt_secret.txt refresh_secret.txt
```

#### SSL証明書設定
```bash
# Let's Encryptを使用する場合
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 証明書パスを確認
ls -la /etc/letsencrypt/live/your-domain.com/
```

### 3. デプロイ実行

#### 本番環境起動
```bash
# 本番用Docker Composeで起動
./scripts/docker-prod.sh deploy

# または手動で起動
docker-compose -f docker-compose.yml up -d
```

#### 初期管理者作成
```bash
# コンテナに接続
docker exec -it fuji-calendar-app bash

# 管理者作成スクリプト実行
npm run setup:admin
# または
node scripts/create-admin.js
```

### 4. 動作確認

#### ヘルスチェック
```bash
curl http://localhost:8000/api/health
```

#### フロントエンドアクセス
```bash
curl http://localhost:8000/
```

#### 管理者ログイン確認
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

## nginx リバースプロキシ設定

### 設定ファイル例

#### /etc/nginx/sites-available/fuji-calendar
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # アプリケーションへのプロキシ
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静的ファイルのキャッシュ
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:8000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 設定適用
```bash
sudo ln -s /etc/nginx/sites-available/fuji-calendar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ネイティブ環境でのデプロイ

### 1. Node.js環境構築

```bash
# Node.js 18 インストール（Ubuntu）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 依存関係インストール
npm install --production
```

### 2. Redis インストール

```bash
# Ubuntu
sudo apt update
sudo apt install redis-server

# 設定ファイル編集
sudo nano /etc/redis/redis.conf
# bind 127.0.0.1 ::1
# maxmemory 256mb
# maxmemory-policy allkeys-lru

sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 3. PM2でのプロセス管理

#### PM2インストール
```bash
npm install -g pm2
```

#### ecosystem.config.js作成
```javascript
module.exports = {
  apps: [{
    name: 'fuji-calendar',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
```

#### アプリケーション起動
```bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.js

# 自動起動設定
pm2 startup
pm2 save
```

## 監視・メンテナンス

### ログ監視

#### Docker環境
```bash
# アプリケーションログ
docker logs -f fuji-calendar-app

# nginxログ
docker logs -f fuji-calendar-nginx

# Redisログ
docker logs -f fuji-calendar-redis
```

#### ネイティブ環境
```bash
# アプリケーションログ
tail -f /var/log/fuji-calendar/app.log

# nginx
tail -f /var/log/nginx/access.log

# Redis
tail -f /var/log/redis/redis-server.log
```

### ログローテーション設定

#### /etc/logrotate.d/fuji-calendar
```bash
/var/log/fuji-calendar/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        docker kill -s USR1 fuji-calendar-app 2>/dev/null || true
    endscript
}
```

### バックアップ

#### データベースバックアップ
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/fuji-calendar"
DB_PATH="/app/data/fuji-calendar.db"

mkdir -p $BACKUP_DIR

# SQLiteバックアップ
sqlite3 $DB_PATH ".backup $BACKUP_DIR/db_backup_$DATE.db"

# 圧縮
gzip "$BACKUP_DIR/db_backup_$DATE.db"

# 古いバックアップ削除（30日以上）
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Database backup completed: db_backup_$DATE.db.gz"
```

#### 自動バックアップ設定
```bash
# crontab -e
0 2 * * * /path/to/backup-db.sh >> /var/log/backup.log 2>&1
```

### パフォーマンス監視

#### Prometheusメトリクス（オプション）
```bash
# Prometheus Node Exporter
docker run -d \
  --name=node-exporter \
  --restart=unless-stopped \
  -p 9100:9100 \
  prom/node-exporter
```

#### 基本監視スクリプト
```bash
#!/bin/bash
# monitor.sh

# CPU使用率
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# メモリ使用率
echo "Memory Usage:"
free -m | awk 'NR==2{printf "%.2f%%\n", $3*100/$2}'

# ディスク使用率
echo "Disk Usage:"
df -h | grep '/$' | awk '{print $5}'

# アプリケーション死活監視
if curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
    echo "Application: OK"
else
    echo "Application: ERROR"
    # アラート通知などの処理
fi
```

## トラブルシューティング

### よくある問題

#### 1. JWT認証エラー
```bash
# 症状: 管理者ログインできない
# 対処: JWT秘密鍵の確認
echo $JWT_SECRET
# 32文字以上で設定されているか確認
```

#### 2. Redis接続エラー
```bash
# 症状: キャッシュが動作しない
# 対処: Redis接続確認
redis-cli ping
# PONG が返ることを確認
```

#### 3. データベースロックエラー
```bash
# 症状: SQLite database is locked
# 対処: プロセス確認・再起動
lsof | grep fuji-calendar.db
sudo systemctl restart fuji-calendar
```

#### 4. メモリ不足
```bash
# 症状: アプリケーションクラッシュ
# 対処: メモリ監視・PM2設定調整
pm2 show fuji-calendar
# max_memory_restart を調整
```

### 緊急時の対応

#### サービス緊急停止
```bash
# Docker環境
docker-compose down

# PM2環境
pm2 stop all
```

#### データベース復旧
```bash
# バックアップからの復元
gunzip /backups/fuji-calendar/db_backup_YYYYMMDD_HHMMSS.db.gz
cp /backups/fuji-calendar/db_backup_YYYYMMDD_HHMMSS.db /app/data/fuji-calendar.db
```

## セキュリティチェックリスト

- [ ] JWT秘密鍵が32文字以上で設定されている
- [ ] デフォルトパスワードが変更されている
- [ ] SSL証明書が設定されている
- [ ] ファイアウォールが適切に設定されている
- [ ] ログが外部に漏洩しない設定になっている
- [ ] バックアップが定期実行されている
- [ ] 監視システムが動作している
- [ ] 不要なポートが閉じられている

## 更新・アップグレード

### アプリケーション更新
```bash
# 1. 最新コードを取得
git pull origin main

# 2. 依存関係更新
npm install

# 3. ビルド
npm run build

# 4. Docker環境の場合
docker-compose down
docker-compose up -d --build

# 5. PM2環境の場合
pm2 reload ecosystem.config.js
```

### データベースマイグレーション
```bash
# マイグレーションスクリプト実行
npm run migrate

# または手動でSQL実行
sqlite3 /app/data/fuji-calendar.db < migrations/001_update.sql
```

## サポート・連絡先

- **GitHub Issues**: https://github.com/your-org/fuji-calendar/issues
- **ドキュメント**: https://docs.your-domain.com
- **緊急連絡**: support@your-domain.com