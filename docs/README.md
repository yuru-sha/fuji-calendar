# ドキュメント

富士山カレンダープロジェクトの技術文書集です。

## 文書一覧

### 📋 [API リファレンス](./api.md)
RESTful APIの詳細仕様とエンドポイント情報

### 🛠️ [インストールガイド](./installation.md)
Docker環境・ローカル環境での詳細セットアップ手順

### 🏗️ [アーキテクチャ設計](./architecture.md)
システム構成・技術選択・設計思想の解説

### 🌟 [天体計算システム](./astronomical-calculations.md)
Astronomy Engineを使った高精度計算の詳細

### 🔧 [トラブルシューティング](./troubleshooting.md)
よくある問題と解決方法・診断ツール

## プロジェクト概要

富士山カレンダーは、ダイヤモンド富士とパール富士の撮影に最適な日時と場所を表示するWebアプリケーションです。NASA JPL準拠のAstronomy Engineによる高精度な天体計算に基づいて、写真愛好家が効率的に撮影計画を立てられる情報を提供します。

## 技術スタック

- **フロントエンド**: React 18, TypeScript, Leaflet
- **バックエンド**: Node.js, Express, TypeScript
- **天体計算**: Astronomy Engine (NASA JPL準拠)
- **データベース**: SQLite3
- **キャッシュ**: Redis
- **ログ**: Pino (構造化ログ)
- **認証**: JWT + bcrypt
- **セキュリティ**: Helmet, Rate limiting, CSRF/XSS対策

## 開発者向けクイックスタート

```bash
# リポジトリクローン
git clone <repository-url>
cd fuji-calendar

# Docker環境で起動（推奨）
./scripts/docker-dev.sh start

# アクセス
# フロントエンド: http://localhost:3000
# API: http://localhost:8000
```

## 主要機能

- 📅 月間カレンダーでのダイヤモンド富士・パール富士表示
- 🏔️ 全国の撮影地点情報とアクセス方法
- ⏰ JST時刻での正確な発生時刻計算
- 🗺️ Leafletマップでの撮影地点表示
- 📊 撮影推奨度とベストタイミング提案
- 🔐 管理者による撮影地点管理

## 貢献ガイド

1. **イシューの確認**: 既存のイシューまたは新規作成
2. **ブランチの作成**: `feature/your-feature-name`
3. **開発**: TDD推奨、コミット前に `npm run typecheck` & `npm run lint`
4. **テスト**: `npm test` でテスト実行
5. **プルリクエスト**: 詳細な説明とテストケース

## ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) ファイルを参照