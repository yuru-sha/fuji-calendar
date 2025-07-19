# ダイヤモンド富士・パール富士カレンダー Makefile

.PHONY: help install dev build test clean setup admin deploy lint typecheck

# デフォルトターゲット
help:
	@echo "🗻 ダイヤモンド富士・パール富士カレンダー"
	@echo ""
	@echo "利用可能なコマンド:"
	@echo "  setup       - 初期セットアップ（依存関係インストール、DB初期化、管理者作成）"
	@echo "  install     - 依存関係をインストール"
	@echo "  dev         - 開発サーバーを起動"
	@echo "  build       - プロダクションビルド"
	@echo "  test        - テストを実行"
	@echo "  lint        - ESLintでコードチェック"
	@echo "  typecheck   - TypeScriptの型チェック"
	@echo "  admin       - デフォルト管理者アカウントを作成"
	@echo "  clean       - ビルド成果物とキャッシュを削除"
	@echo "  reset-db    - データベースをリセット"
	@echo "  backup-db   - データベースをバックアップ"
	@echo "  deploy      - 本番環境へデプロイ"
	@echo ""

# 初期セットアップ
setup: install reset-db admin
	@echo "🎉 セットアップが完了しました！"
	@echo ""
	@echo "開発サーバーを起動するには:"
	@echo "  make dev"
	@echo ""
	@echo "管理画面ログイン情報:"
	@echo "  URL: http://localhost:3001/admin/login"
	@echo "  ユーザー名: admin"
	@echo "  パスワード: FujiAdmin2024!"
	@echo ""

# 依存関係のインストール
install:
	@echo "📦 依存関係をインストール中..."
	npm install
	npx playwright install

# 開発サーバー起動
dev:
	@echo "🚀 開発サーバーを起動中..."
	npm run dev

# プロダクションビルド
build:
	@echo "🏗️  プロダクションビルド中..."
	npm run build

# テスト実行
test:
	@echo "🧪 テストを実行中..."
	npm test

# ESLint実行
lint:
	@echo "🔍 ESLintでコードチェック中..."
	npm run lint

# TypeScript型チェック
typecheck:
	@echo "🔍 TypeScriptの型チェック中..."
	npm run typecheck

# データベースリセット
reset-db:
	@echo "🗄️  データベースを初期化中..."
	mkdir -p data
	sqlite3 data/fuji_calendar.db < src/server/database/schema.sql
	@echo "✅ データベースが初期化されました"

# 管理者アカウント作成
admin:
	@echo "👤 管理者アカウントを作成中..."
	sqlite3 data/fuji_calendar.db "ALTER TABLE admins ADD COLUMN email TEXT" 2>/dev/null || true
	sqlite3 data/fuji_calendar.db < scripts/create-admin.sql
	@echo "✅ 管理者アカウントが作成されました"
	@echo ""
	@echo "ログイン情報:"
	@echo "  ユーザー名: admin"
	@echo "  パスワード: FujiAdmin2024!"
	@echo "  URL: http://localhost:3001/admin/login"

# データベースバックアップ
backup-db:
	@echo "💾 データベースをバックアップ中..."
	mkdir -p backups
	cp data/fuji_calendar.db backups/fuji_calendar_$(shell date +%Y%m%d_%H%M%S).db
	@echo "✅ バックアップが完了しました: backups/"

# クリーンアップ
clean:
	@echo "🧹 クリーンアップ中..."
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -rf .next/
	npm cache clean --force
	@echo "✅ クリーンアップが完了しました"

# 本番デプロイ
deploy: build
	@echo "🚀 本番環境へデプロイ中..."
	@echo "⚠️  本番デプロイの設定が必要です"
	# TODO: 実際のデプロイコマンドを追加

# 開発環境の状態確認
status:
	@echo "📊 開発環境の状態:"
	@echo "  Node.js: $(shell node --version 2>/dev/null || echo '❌ 未インストール')"
	@echo "  npm: $(shell npm --version 2>/dev/null || echo '❌ 未インストール')"
	@echo "  SQLite: $(shell sqlite3 --version 2>/dev/null | cut -d' ' -f1 || echo '❌ 未インストール')"
	@echo "  データベース: $(shell [ -f data/fuji_calendar.db ] && echo '✅ 存在' || echo '❌ 未作成')"
	@echo "  依存関係: $(shell [ -d node_modules ] && echo '✅ インストール済み' || echo '❌ 未インストール')"

# サーバープロセス管理
start:
	@echo "🚀 サーバーをバックグラウンドで起動..."
	nohup npm run dev > dev.log 2>&1 &
	@echo "✅ サーバーが起動しました（ログ: dev.log）"

stop:
	@echo "🛑 サーバーを停止中..."
	pkill -f "node.*ts-node.*src/server/index.ts" || true
	pkill -f "vite" || true
	@echo "✅ サーバーが停止しました"

restart: stop start
	@echo "🔄 サーバーを再起動しました"

# ログ確認
logs:
	@echo "📋 サーバーログ:"
	tail -f dev.log 2>/dev/null || echo "❌ ログファイルが見つかりません"

# データベース情報表示
db-info:
	@echo "🗄️  データベース情報:"
	@echo "  撮影地点数: $(shell sqlite3 data/fuji_calendar.db 'SELECT COUNT(*) FROM locations' 2>/dev/null || echo '❌ DB未作成')"
	@echo "  管理者数: $(shell sqlite3 data/fuji_calendar.db 'SELECT COUNT(*) FROM admins' 2>/dev/null || echo '❌ DB未作成')"

# セキュリティチェック
security:
	@echo "🔒 セキュリティチェック中..."
	npm audit
	@echo "✅ セキュリティチェックが完了しました"

# パフォーマンステスト
perf:
	@echo "⚡ パフォーマンステスト中..."
	@echo "TODO: Lighthouseやk6などのパフォーマンステストを実装"

# ドキュメント生成
docs:
	@echo "📚 ドキュメント生成中..."
	@echo "TODO: TypeDocやJSDocでAPIドキュメントを生成"

# 全体チェック（CI用）
ci: install lint typecheck test build
	@echo "✅ CI チェックが完了しました"