# 富士カレンダー Makefile
# 開発、ビルド、データ生成用のコマンド集

# =============================================================================
# 設定
# =============================================================================

# 年パラメータのデフォルト値
YEAR ?= $(shell date +%Y)

# Node.jsスクリプトの共通設定
NODE_OPTIONS = --max-old-space-size=8192
SCRIPTS_DIR = scripts

# PHONYターゲット宣言
.PHONY: help dev build start test lint typecheck clean match-events debug-events check-deps clean-data

# =============================================================================
# ヘルプ
# =============================================================================

# デフォルトターゲット（ヘルプ表示）
help:
	@echo "富士カレンダー 利用可能なコマンド:"
	@echo ""
	@echo "🚀 開発・実行:"
	@echo "  dev          - 開発サーバー起動（フロントエンド + バックエンド）"
	@echo "  dev-server   - バックエンドのみ起動（ポート3000）"
	@echo "  dev-client   - フロントエンドのみ起動（ポート3001）"
	@echo "  build        - プロダクションビルド"
	@echo "  start        - プロダクション実行"
	@echo ""
	@echo "🧪 品質チェック:"
	@echo "  test         - テスト実行"
	@echo "  lint         - ESLintチェック"
	@echo "  lint-fix     - ESLint自動修正"
	@echo "  typecheck    - TypeScript型チェック"
	@echo "  check-all    - 全品質チェック（lint + typecheck + test）"
	@echo ""
	@echo "🌟 データ管理:"
	@echo "  match-events [YEAR=2025]    - イベントマッチング実行"
	@echo ""
	@echo "🔍 デバッグ・統計:"
	@echo "  debug-events [YEAR=2025]    - 富士イベント統計表示"
	@echo ""
	@echo "🛠️  メンテナンス:"
	@echo "  clean        - 一時ファイル・ビルド成果物削除"
	@echo "  clean-data   - データベース初期化（注意：全データ削除）"
	@echo ""
	@echo "例:"
	@echo "  make match-events YEAR=2024      # 2024年のイベントマッチング実行"
	@echo "  make debug-events YEAR=2024      # 2024年のイベント統計表示"

# =============================================================================
# 共通関数
# =============================================================================

# match-eventsの実行ロジック
define run-match-events
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { locationFujiEventService } = require('./dist/server/services/LocationFujiEventService'); \
		locationFujiEventService.matchAllLocations($(1)).then(result => { \
			if (result.success) { \
				console.log('✅ マッチング完了: ' + result.totalEvents + '件'); \
				console.log('💎 ダイヤモンド富士: ' + result.diamondEvents + '件'); \
				console.log('🌙 パール富士: ' + result.pearlEvents + '件'); \
			} else { \
				console.error('❌ マッチング失敗'); \
				process.exit(1); \
			} \
		}).catch(err => { console.error('❌ エラー:', err.message); process.exit(1); }); \
	"
endef

# データベース初期化の実行ロジック
define run-clean-data
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { PrismaClient } = require('@prisma/client'); \
		const prisma = new PrismaClient(); \
		prisma.locationFujiEvent.deleteMany().then(() => { \
			console.log('✅ データベース初期化完了'); \
			return prisma.\$$disconnect(); \
		}).catch(err => { console.error('❌ エラー:', err); process.exit(1); }); \
	"
endef

# =============================================================================
# 開発・実行コマンド
# =============================================================================

dev:
	@echo "🚀 開発サーバー起動中..."
	npm run dev

dev-server:
	@echo "⚙️  バックエンドサーバー起動中（ポート3000）..."
	npm run dev:server

dev-client:
	@echo "🎨 フロントエンドサーバー起動中（ポート3001）..."
	npm run dev:client

build:
	@echo "🏗️  プロダクションビルド中..."
	npm run build

start:
	@echo "🚀 プロダクション実行中..."
	npm start

# =============================================================================
# 品質チェックコマンド
# =============================================================================

test:
	@echo "🧪 テスト実行中..."
	npm test

lint:
	@echo "🔍 ESLintチェック中..."
	npm run lint

lint-fix:
	@echo "🔧 ESLint自動修正中..."
	npm run lint:fix

typecheck:
	@echo "📝 TypeScript型チェック中..."
	npm run typecheck

check-all: lint typecheck test
	@echo "✅ 全品質チェック完了！"

# =============================================================================
# データ管理コマンド
# =============================================================================

match-events: check-deps
	@echo "🎯 LocationFujiEventマッチング実行中（$(YEAR)年）..."
	@$(call run-match-events,$(YEAR))

# =============================================================================
# デバッグ・統計コマンド
# =============================================================================

debug-events:
	@echo "🔍 富士イベント統計表示..."
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { locationFujiEventService } = require('./dist/server/services/LocationFujiEventService'); \
		locationFujiEventService.getStatistics($(YEAR)).then(stats => { \
			console.log('📊 富士イベント統計 ($(YEAR)年):'); \
			console.log('  総イベント数:', stats.totalEvents.toLocaleString()); \
			console.log('  対象地点数:', stats.locationCount); \
			console.log('  ダイヤモンド富士（日の出）:', stats.eventTypeDistribution.diamond_sunrise); \
			console.log('  ダイヤモンド富士（日没）:', stats.eventTypeDistribution.diamond_sunset); \
			console.log('  パール富士（月の出）:', stats.eventTypeDistribution.pearl_moonrise); \
			console.log('  パール富士（月没）:', stats.eventTypeDistribution.pearl_moonset); \
		}).catch(err => console.error('❌ エラー:', err.message)); \
	"

# =============================================================================
# メンテナンスコマンド
# =============================================================================

clean:
	@echo "🧹 一時ファイル削除中..."
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -f *.log
	rm -f debug-*.js
	rm -f check-*.js
	rm -f test-*.js
	rm -f fix-*.js
	@echo "✅ クリーンアップ完了"

clean-data:
	@echo "⚠️  データベース初期化（全データ削除）"
	@echo "⚠️  この操作は取り消せません！"
	@read -p "本当に全データを削除しますか？ [y/N]: " confirm && [ "$confirm" = "y" ] || exit 1
	@$(call run-clean-data)

# =============================================================================
# ユーティリティ
# =============================================================================

# 実行前の依存関係チェック
check-deps:
	@echo "📦 依存関係チェック中..."
	@npm list --depth=0 > /dev/null 2>&1 || (echo "❌ npm installを実行してください" && exit 1)
	@[ -f "dist/server/services/LocationFujiEventService.js" ] || (echo "❌ npm run buildを実行してください" && exit 1)
	@echo "✅ 依存関係OK"