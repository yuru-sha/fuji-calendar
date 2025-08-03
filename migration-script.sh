#!/bin/bash

# モノレポパッケージから統合共有モジュールへの一括移行スクリプト

echo "モノレポ依存関係を統合共有モジュールに移行中..."

# apps/server/src 内のすべての .ts ファイルで置換実行
find apps/server/src -name "*.ts" -type f -exec sed -i '' 's|from "@fuji-calendar/utils"|from "../shared"|g' {} \;
find apps/server/src -name "*.ts" -type f -exec sed -i '' 's|from "@fuji-calendar/types"|from "../shared"|g' {} \;

# 相対パスを正しく調整（ディレクトリの深さに応じて）
find apps/server/src -name "*.ts" -type f -exec sed -i '' 's|from "\.\./shared"|from "../../shared"|g' {} \;

# services ディレクトリの場合
find apps/server/src/services -name "*.ts" -type f -exec sed -i '' 's|from "../../shared"|from "../shared"|g' {} \;

# astronomical ディレクトリの場合
find apps/server/src/services/astronomical -name "*.ts" -type f -exec sed -i '' 's|from "../shared"|from "../../shared"|g' {} \;

echo "移行完了！"