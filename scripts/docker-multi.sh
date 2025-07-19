#!/bin/bash

# 富士山カレンダー マルチコンテナ本番環境スクリプト

set -e

# 色付きメッセージ用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ヘルプ表示
show_help() {
    echo "富士山カレンダー マルチコンテナ Docker環境"
    echo ""
    echo "使用方法:"
    echo "  $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  deploy   マルチコンテナ環境をデプロイ"
    echo "  start    環境を起動"
    echo "  stop     環境を停止"
    echo "  restart  環境を再起動"
    echo "  logs     ログを表示"
    echo "  status   サービス状態を確認"
    echo "  scale    サービスをスケール"
    echo "  update   アプリケーションを更新"
    echo "  backup   データベースをバックアップ"
    echo "  health   ヘルスチェック"
    echo "  help     このヘルプを表示"
    echo ""
}

# 環境変数チェック
check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env ファイルが見つかりません。"
        if [ -f ".env.example" ]; then
            print_info ".env.example をコピーして .env を作成してください。"
            echo "cp .env.example .env"
        fi
        print_error "環境変数を設定してから再実行してください。"
        exit 1
    fi
}

# デプロイ
deploy() {
    print_info "マルチコンテナ環境をデプロイしています..."
    check_env
    
    # ビルド
    print_info "バックエンドイメージをビルド中..."
    docker build -f Dockerfile.backend -t fuji-calendar-backend .
    
    # サービスを起動
    print_info "サービスを起動中..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # ヘルスチェック
    print_info "アプリケーションの起動を待っています..."
    sleep 15
    
    for i in {1..30}; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            print_success "デプロイが完了しました！"
            echo ""
            echo "アクセス先:"
            echo "  Frontend: http://localhost"
            echo "  API: http://localhost/api"
            echo "  Health: http://localhost/health"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "ヘルスチェックに失敗しました。ログを確認してください。"
    docker-compose -f docker-compose.prod.yml logs
}

# 起動
start_env() {
    print_info "マルチコンテナ環境を起動しています..."
    check_env
    docker-compose -f docker-compose.prod.yml up -d
    
    print_info "サービスの起動を待っています..."
    sleep 5
    
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_success "環境が起動しました！"
        echo "アクセス先: http://localhost"
    else
        print_error "起動に失敗しました。"
        docker-compose -f docker-compose.prod.yml logs
    fi
}

# 停止
stop_env() {
    print_info "マルチコンテナ環境を停止しています..."
    docker-compose -f docker-compose.prod.yml down
    print_success "環境を停止しました。"
}

# 再起動
restart_env() {
    print_info "マルチコンテナ環境を再起動しています..."
    stop_env
    start_env
}

# ログ表示
show_logs() {
    service=${2:-""}
    if [ -n "$service" ]; then
        print_info "${service} のログを表示します (Ctrl+C で終了)..."
        docker-compose -f docker-compose.prod.yml logs -f $service
    else
        print_info "全サービスのログを表示します (Ctrl+C で終了)..."
        docker-compose -f docker-compose.prod.yml logs -f
    fi
}

# ステータス確認
show_status() {
    print_info "サービス状態:"
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    
    print_info "リソース使用量:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# スケーリング
scale_service() {
    service=${2:-"backend"}
    replicas=${3:-2}
    
    print_info "${service} を ${replicas} インスタンスにスケールしています..."
    docker-compose -f docker-compose.prod.yml up -d --scale $service=$replicas
    print_success "スケーリングが完了しました。"
}

# アプリケーション更新
update_app() {
    print_info "アプリケーションを更新しています..."
    check_env
    
    print_info "最新のコードを取得..."
    git pull
    
    print_info "バックエンドイメージを再ビルド..."
    docker build -f Dockerfile.backend -t fuji-calendar-backend .
    
    print_info "ローリングアップデート実行..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_success "更新が完了しました。"
}

# データベースバックアップ
backup_db() {
    BACKUP_DIR="./backups"
    BACKUP_FILE="fuji-calendar-$(date +%Y%m%d_%H%M%S).db"
    
    print_info "データベースをバックアップしています..."
    
    mkdir -p "$BACKUP_DIR"
    docker-compose -f docker-compose.prod.yml exec backend sqlite3 /app/data/fuji-calendar.db ".backup /tmp/backup.db"
    docker cp $(docker-compose -f docker-compose.prod.yml ps -q backend):/tmp/backup.db "$BACKUP_DIR/$BACKUP_FILE"
    
    print_success "バックアップが完了しました: $BACKUP_DIR/$BACKUP_FILE"
}

# ヘルスチェック
health_check() {
    print_info "ヘルスチェックを実行しています..."
    
    # Nginx ヘルスチェック
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_success "Nginx: 正常"
    else
        print_error "Nginx: 異常"
    fi
    
    # バックエンド ヘルスチェック
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        print_success "Backend: 正常"
    else
        print_error "Backend: 異常"
    fi
    
    # Redis ヘルスチェック
    if docker-compose -f docker-compose.prod.yml exec redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis: 正常"
    else
        print_error "Redis: 異常"
    fi
    
    # コンテナステータス
    print_info "コンテナステータス:"
    docker-compose -f docker-compose.prod.yml ps
}

# メイン処理
case "${1:-help}" in
    deploy)
        deploy
        ;;
    start)
        start_env
        ;;
    stop)
        stop_env
        ;;
    restart)
        restart_env
        ;;
    logs)
        show_logs $@
        ;;
    status)
        show_status
        ;;
    scale)
        scale_service $@
        ;;
    update)
        update_app
        ;;
    backup)
        backup_db
        ;;
    health)
        health_check
        ;;
    help|*)
        show_help
        ;;
esac