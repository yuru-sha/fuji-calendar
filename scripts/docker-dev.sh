#!/bin/bash

# 富士山カレンダー開発環境スクリプト

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
    echo "富士山カレンダー Docker開発環境"
    echo ""
    echo "使用方法:"
    echo "  $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  start    開発環境を起動"
    echo "  stop     開発環境を停止"
    echo "  restart  開発環境を再起動"
    echo "  logs     ログを表示"
    echo "  status   サービス状態を確認"
    echo "  clean    コンテナ・ボリューム・イメージを削除"
    echo "  build    イメージを再ビルド"
    echo "  db       データベースシェルに接続"
    echo "  redis    Redisコンソールに接続"
    echo "  help     このヘルプを表示"
    echo ""
}

# 開発環境を起動
start_dev() {
    print_info "開発環境を起動しています..."
    docker-compose -f docker-compose.dev.yml up -d
    
    print_info "サービスの起動を待っています..."
    sleep 5
    
    # ヘルスチェック
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        print_success "開発環境が起動しました！"
        echo ""
        echo "アクセス先:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:8000"
        echo "  API Health: http://localhost:8000/api/health"
        echo ""
        echo "ログを確認: $0 logs"
    else
        print_error "起動に失敗しました。ログを確認してください。"
        docker-compose -f docker-compose.dev.yml logs
    fi
}

# 開発環境を停止
stop_dev() {
    print_info "開発環境を停止しています..."
    docker-compose -f docker-compose.dev.yml down
    print_success "開発環境を停止しました。"
}

# 開発環境を再起動
restart_dev() {
    print_info "開発環境を再起動しています..."
    stop_dev
    start_dev
}

# ログを表示
show_logs() {
    print_info "ログを表示します (Ctrl+C で終了)..."
    docker-compose -f docker-compose.dev.yml logs -f
}

# ステータス確認
show_status() {
    print_info "サービス状態:"
    docker-compose -f docker-compose.dev.yml ps
    echo ""
    
    print_info "Docker使用量:"
    docker system df
}

# クリーンアップ
clean_dev() {
    print_warning "全ての開発用コンテナ・ボリューム・イメージを削除します。"
    read -p "続行しますか? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "クリーンアップ中..."
        docker-compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans
        print_success "クリーンアップが完了しました。"
    else
        print_info "キャンセルしました。"
    fi
}

# イメージを再ビルド
build_dev() {
    print_info "開発用イメージを再ビルドしています..."
    docker-compose -f docker-compose.dev.yml build --no-cache
    print_success "ビルドが完了しました。"
}

# データベースシェル
db_shell() {
    print_info "データベースシェルに接続しています..."
    docker-compose -f docker-compose.dev.yml exec app-dev sh -c "sqlite3 /app/data/fuji-calendar-dev.db"
}

# Redisコンソール
redis_console() {
    print_info "Redisコンソールに接続しています..."
    docker-compose -f docker-compose.dev.yml exec redis redis-cli
}

# メイン処理
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_dev
        ;;
    build)
        build_dev
        ;;
    db)
        db_shell
        ;;
    redis)
        redis_console
        ;;
    help|*)
        show_help
        ;;
esac