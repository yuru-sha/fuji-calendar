#!/bin/bash

# 富士山カレンダー本番環境スクリプト

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
    
    # 重要な環境変数をチェック
    source .env
    if [ "${JWT_SECRET}" = "your-super-secret-jwt-key-change-in-production-minimum-32-characters" ]; then
        print_error "JWT_SECRET を本番用の値に変更してください。"
        exit 1
    fi
    
    if [ "${REFRESH_SECRET}" = "your-super-secret-refresh-key-change-in-production-minimum-32-characters" ]; then
        print_error "REFRESH_SECRET を本番用の値に変更してください。"
        exit 1
    fi
}

# ヘルプ表示
show_help() {
    echo "富士山カレンダー Docker本番環境"
    echo ""
    echo "使用方法:"
    echo "  $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  deploy   本番環境をデプロイ"
    echo "  start    本番環境を起動"
    echo "  stop     本番環境を停止"
    echo "  restart  本番環境を再起動"
    echo "  logs     ログを表示"
    echo "  status   サービス状態を確認"
    echo "  update   アプリケーションを更新"
    echo "  backup   データベースをバックアップ"
    echo "  restore  データベースをリストア"
    echo "  health   ヘルスチェック"
    echo "  help     このヘルプを表示"
    echo ""
}

# デプロイ
deploy() {
    print_info "本番環境をデプロイしています..."
    check_env
    
    # イメージをビルド
    print_info "アプリケーションをビルド中..."
    docker-compose -f docker-compose.yml build --no-cache
    
    # サービスを起動
    print_info "サービスを起動中..."
    docker-compose -f docker-compose.yml up -d
    
    # ヘルスチェック
    print_info "アプリケーションの起動を待っています..."
    sleep 10
    
    for i in {1..30}; do
        if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
            print_success "デプロイが完了しました！"
            echo ""
            echo "アクセス先: http://localhost:8000"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "ヘルスチェックに失敗しました。ログを確認してください。"
    docker-compose logs app
}

# 本番環境を起動
start_prod() {
    print_info "本番環境を起動しています..."
    check_env
    docker-compose up -d
    
    print_info "サービスの起動を待っています..."
    sleep 5
    
    if docker-compose ps | grep -q "Up"; then
        print_success "本番環境が起動しました！"
        echo "アクセス先: http://localhost:8000"
    else
        print_error "起動に失敗しました。ログを確認してください。"
        docker-compose logs
    fi
}

# 本番環境を停止
stop_prod() {
    print_info "本番環境を停止しています..."
    docker-compose down
    print_success "本番環境を停止しました。"
}

# 本番環境を再起動
restart_prod() {
    print_info "本番環境を再起動しています..."
    stop_prod
    start_prod
}

# ログを表示
show_logs() {
    print_info "ログを表示します (Ctrl+C で終了)..."
    docker-compose logs -f
}

# ステータス確認
show_status() {
    print_info "サービス状態:"
    docker-compose ps
    echo ""
    
    print_info "リソース使用量:"
    docker stats --no-stream
}

# アプリケーション更新
update_app() {
    print_info "アプリケーションを更新しています..."
    check_env
    
    print_info "最新のコードを取得..."
    git pull
    
    print_info "イメージを再ビルド..."
    docker-compose -f docker-compose.yml build --no-cache
    
    print_info "ローリングアップデート実行..."
    docker-compose -f docker-compose.yml up -d
    
    print_success "更新が完了しました。"
}

# データベースバックアップ
backup_db() {
    BACKUP_DIR="./backups"
    BACKUP_FILE="fuji-calendar-$(date +%Y%m%d_%H%M%S).db"
    
    print_info "データベースをバックアップしています..."
    
    mkdir -p "$BACKUP_DIR"
    docker-compose exec app sqlite3 /app/data/fuji-calendar.db ".backup /tmp/backup.db"
    docker cp $(docker-compose ps -q app):/tmp/backup.db "$BACKUP_DIR/$BACKUP_FILE"
    
    print_success "バックアップが完了しました: $BACKUP_DIR/$BACKUP_FILE"
}

# データベースリストア
restore_db() {
    print_warning "データベースをリストアします。現在のデータは失われます。"
    read -p "バックアップファイルのパス: " backup_path
    
    if [ ! -f "$backup_path" ]; then
        print_error "ファイルが見つかりません: $backup_path"
        exit 1
    fi
    
    read -p "続行しますか? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "データベースをリストア中..."
        docker cp "$backup_path" $(docker-compose ps -q app):/tmp/restore.db
        docker-compose exec app sh -c "cp /tmp/restore.db /app/data/fuji-calendar.db"
        restart_prod
        print_success "リストアが完了しました。"
    else
        print_info "キャンセルしました。"
    fi
}

# ヘルスチェック
health_check() {
    print_info "ヘルスチェックを実行しています..."
    
    # アプリケーションヘルスチェック
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        print_success "アプリケーション: 正常"
    else
        print_error "アプリケーション: 異常"
    fi
    
    # Redisヘルスチェック
    if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis: 正常"
    else
        print_error "Redis: 異常"
    fi
    
    # ディスク使用量チェック
    print_info "ディスク使用量:"
    df -h | grep -E "(Filesystem|/dev/)"
}

# メイン処理
case "${1:-help}" in
    deploy)
        deploy
        ;;
    start)
        start_prod
        ;;
    stop)
        stop_prod
        ;;
    restart)
        restart_prod
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    update)
        update_app
        ;;
    backup)
        backup_db
        ;;
    restore)
        restore_db
        ;;
    health)
        health_check
        ;;
    help|*)
        show_help
        ;;
esac