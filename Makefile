# 富士カレンダー Makefile
# 開発、ビルド、データ生成用のコマンド集

.PHONY: help dev build start test lint typecheck clean setup-data generate-celestial match-events check-data

# デフォルトターゲット（ヘルプ表示）
help:
	@echo "富士カレンダー 利用可能なコマンド:"
	@echo ""
	@echo "🚀 開発・実行:"
	@echo "  make dev          - 開発サーバー起動（フロントエンド + バックエンド）"
	@echo "  make dev-server   - バックエンドのみ起動（ポート3000）"
	@echo "  make dev-client   - フロントエンドのみ起動（ポート3001）"
	@echo "  make build        - プロダクションビルド"
	@echo "  make start        - プロダクション実行"
	@echo ""
	@echo "🧪 品質チェック:"
	@echo "  make test         - テスト実行"
	@echo "  make lint         - ESLintチェック"
	@echo "  make lint-fix     - ESLint自動修正"
	@echo "  make typecheck    - TypeScript型チェック"
	@echo "  make check-all    - 全品質チェック（lint + typecheck + test）"
	@echo ""
	@echo "🌟 データ生成・管理:"
	@echo "  make setup-data [YEAR=2025]      - 初期データ完全セットアップ（初回インストール時）"
	@echo "  make generate-celestial [YEAR=2025] - 天体軌道データ生成のみ（1分刻み、upsert方式）"
	@echo "  make match-events [YEAR=2025]    - イベントマッチング実行のみ"
	@echo "  make check-data                  - データベース状況確認"
	@echo "  make test-diamond                - 10月ダイヤモンド富士検出テスト"
	@echo ""
	@echo "🛠️  メンテナンス:"
	@echo "  make clean        - 一時ファイル・ビルド成果物削除"
	@echo "  make clean-data   - データベース初期化（注意：全データ削除）"
	@echo ""
	@echo "例:"
	@echo "  make setup-data YEAR=2025       # 2025年の初期データをセットアップ"
	@echo "  make generate-celestial          # 現在年の天体データを生成"
	@echo "  make generate-celestial YEAR=2024 # 2024年の天体データを生成"
	@echo "  make match-events YEAR=2024      # 2024年のイベントマッチング実行"

# 年パラメータのデフォルト値
YEAR ?= $(shell date +%Y)

# Node.jsスクリプトの共通設定
NODE_OPTIONS = --max-old-space-size=8192
SCRIPTS_DIR = scripts

# 開発・実行コマンド
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

# 品質チェックコマンド
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

# データ生成・管理コマンド
setup-data:
	@echo "🚀 富士カレンダー初期データセットアップ開始（$(YEAR)年）..."
	@echo "⚠️  このコマンドは初回インストール時または完全リセット時にのみ実行してください"
	@read -p "続行しますか？ [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	NODE_OPTIONS="$(NODE_OPTIONS)" node $(SCRIPTS_DIR)/setup-initial-data.js $(YEAR)

generate-celestial:
	@echo "🌟 天体軌道データ生成開始（$(YEAR)年）..."
	@echo "💡 1分刻み精度・upsert方式で既存データを安全に更新します"
	@echo "💡 年を指定する場合: make generate-celestial YEAR=2024"
	NODE_OPTIONS="$(NODE_OPTIONS)" node $(SCRIPTS_DIR)/generate-celestial-data.js $(YEAR)

match-events:
	@echo "🎯 LocationFujiEventマッチング実行中（$(YEAR)年）..."
	@echo "💡 年を指定する場合: make match-events YEAR=2024"
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { locationFujiEventService } = require('./dist/server/services/LocationFujiEventService'); \
		locationFujiEventService.matchAllLocations($(YEAR)).then(result => { \
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

check-data:
	@echo "📊 データベース状況確認中..."
	NODE_OPTIONS="$(NODE_OPTIONS)" node check-celestial-data.js

test-diamond:
	@echo "💎 10月ダイヤモンド富士検出テスト実行中..."
	NODE_OPTIONS="$(NODE_OPTIONS)" node test-december-diamond.js

# メンテナンスコマンド
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
	@read -p "本当に全データを削除しますか？ [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { PrismaClient } = require('@prisma/client'); \
		const prisma = new PrismaClient(); \
		Promise.all([ \
			prisma.locationFujiEvent.deleteMany(), \
			prisma.celestialOrbitData.deleteMany() \
		]).then(() => { \
			console.log('✅ データベース初期化完了'); \
			return prisma.\$disconnect(); \
		}).catch(err => { console.error('❌ エラー:', err); process.exit(1); }); \
	"

# 実行前の依存関係チェック
check-deps:
	@echo "📦 依存関係チェック中..."
	@npm list --depth=0 > /dev/null 2>&1 || (echo "❌ npm installを実行してください" && exit 1)
	@[ -f "dist/server/services/CelestialOrbitDataService.js" ] || (echo "❌ npm run buildを実行してください" && exit 1)
	@echo "✅ 依存関係OK"

# デバッグ用の便利コマンド
debug-celestial:
	@echo "🔍 天体データデバッグ情報表示..."
	NODE_OPTIONS="$(NODE_OPTIONS)" node -e " \
		const { celestialOrbitDataService } = require('./dist/server/services/CelestialOrbitDataService'); \
		celestialOrbitDataService.getStatistics().then(stats => { \
			console.log('📊 天体データ統計:'); \
			console.log('  総レコード数:', stats.totalRecords.toLocaleString()); \
			console.log('  年範囲:', stats.yearRange.min + '-' + stats.yearRange.max); \
			console.log('  太陽データ:', stats.celestialTypeDistribution.sun.toLocaleString()); \
			console.log('  月データ:', stats.celestialTypeDistribution.moon.toLocaleString()); \
			console.log('  視認率:', (stats.visibilityRate * 100).toFixed(1) + '%'); \
		}).catch(err => console.error('❌ エラー:', err.message)); \
	"

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

# データ生成コマンドには依存関係チェックを追加
setup-data: check-deps
generate-celestial: check-deps  
match-events: check-deps