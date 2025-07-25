# Docker 環境構成

ダイヤモンド富士・パール富士カレンダーのDocker環境を構築するための設定ファイル群です。

## 構成オプション

### 1. モノリシック構成 (推奨)
シンプルな単一コンテナ構成。本番運用に最適。

```bash
# 本番環境
docker-compose up -d

# 開発環境
docker-compose -f docker-compose.dev.yml up
```

**コンテナ:**
- `app`: フロントエンド + バックエンド (Node.js)
- `redis`: キューシステム

### 2. マイクロサービス構成
コンテナを機能別に分離した構成。スケーラビリティ重視。

```bash
docker-compose -f docker-compose.microservices.yml up -d
```

**コンテナ:**
- `gateway`: Nginx (フロントエンド配信 + APIプロキシ)
- `backend`: Express.js API サーバー
- `redis`: キューシステム

## ディレクトリ構造

```
docker/
├── README.md                    # このファイル
├── Dockerfile.monolith          # モノリシック用
├── Dockerfile.dev               # 開発用
├── backend/
│   └── Dockerfile              # バックエンド専用
└── frontend/
    ├── Dockerfile              # フロントエンド用 (Nginx)
    ├── nginx.conf              # Nginx メイン設定
    └── default.conf            # サイト設定 + APIプロキシ
```

## 開発フロー

### 1. 初回セットアップ
```bash
# 環境変数設定
cp .env.example .env
nano .env

# 開発環境起動
docker-compose -f docker-compose.dev.yml up
```

### 2. 本番環境デプロイ
```bash
# 本番用ビルドとデプロイ
./scripts/docker-prod.sh deploy

# ヘルスチェック
./scripts/docker-prod.sh health
```

## 環境変数

必須の環境変数:

```bash
# JWT設定
JWT_SECRET=your-super-secret-jwt-key
REFRESH_SECRET=your-super-secret-refresh-key

# ログ設定
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true

# 本番環境用
FRONTEND_URL=https://your-domain.com
```

## ネットワーク構成

- **モノリシック**: `fuji-calendar-network`
- **マイクロサービス**: `fuji-calendar-microservices`  
- **開発環境**: `fuji-calendar-dev-network`

## ボリューム管理

```bash
# データベースバックアップ
docker exec fuji-calendar-app sqlite3 /app/data/fuji-calendar.db ".backup /app/data/backup-$(date +%Y%m%d).db"

# ログ確認
docker exec fuji-calendar-app tail -f /app/logs/error.log
```

## トラブルシューティング

### よくある問題

1. **ポート競合**
   ```bash
   # 使用中ポートの確認
   lsof -i :8000
   ```

2. **ビルド失敗**
   ```bash
   # キャッシュクリア
   docker system prune -f
   docker-compose build --no-cache
   ```

3. **データベース初期化**
   ```bash
   # ボリューム削除 (データ消失注意)
   docker-compose down -v
   ```

### デバッグコマンド

```bash
# コンテナ内シェル
docker exec -it fuji-calendar-app sh

# ログ確認
docker-compose logs -f app

# リソース使用量
docker stats
```

## パフォーマンス調整

### Redis設定
- **メモリ制限**: 256MB (モノリシック) / 512MB (マイクロサービス)
- **削除ポリシー**: `allkeys-lru`

### Nginx設定 (マイクロサービス)
- **Gzip圧縮**: 有効 (レベル6)
- **静的ファイルキャッシュ**: 1年
- **Worker数**: CPU自動検出

## セキュリティ

### 設定済み保護
- セキュリティヘッダー (X-Frame-Options, CSP等)
- サーバー情報隠蔽
- 不要ファイルアクセス禁止
- ヘルスチェックログ除外

### 推奨設定
- JWT秘密鍵の定期ローテーション
- HTTPS証明書の設定
- ファイアウォール設定