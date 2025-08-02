#!/usr/bin/env node

/**
 * アーキテクチャルール検証スクリプト
 * .architecture-rules.yml に基づいてプロジェクト構造を検証
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const RULES_FILE = path.join(PROJECT_ROOT, '.architecture-rules.yml');

class ArchitectureValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.rules = this.loadRules();
  }

  loadRules() {
    try {
      const rulesContent = fs.readFileSync(RULES_FILE, 'utf8');
      return yaml.load(rulesContent);
    } catch (error) {
      console.error('❌ アーキテクチャルールファイルの読み込みに失敗:', error.message);
      process.exit(1);
    }
  }

  validatePackageStructure() {
    console.log('📦 パッケージ構造を検証中...');
    
    const packagesDir = path.join(PROJECT_ROOT, 'packages');
    const appsDir = path.join(PROJECT_ROOT, 'apps');
    
    // packages ディレクトリの検証
    if (!fs.existsSync(packagesDir)) {
      this.errors.push('packages ディレクトリが存在しません');
      return;
    }
    
    // apps ディレクトリの検証
    if (!fs.existsSync(appsDir)) {
      this.errors.push('apps ディレクトリが存在しません');
      return;
    }

    // 各パッケージの検証
    this.validatePackages();
    this.validateApps();
  }

  validatePackages() {
    const packagesDir = path.join(PROJECT_ROOT, 'packages');
    const packages = fs.readdirSync(packagesDir).filter(dir => {
      const packagePath = path.join(packagesDir, dir);
      return fs.statSync(packagePath).isDirectory() && dir !== '.gitkeep';
    });

    for (const packageName of packages) {
      this.validatePackage(packageName, path.join(packagesDir, packageName));
    }
  }

  validateApps() {
    const appsDir = path.join(PROJECT_ROOT, 'apps');
    const apps = fs.readdirSync(appsDir).filter(dir => {
      const appPath = path.join(appsDir, dir);
      return fs.statSync(appPath).isDirectory();
    });

    for (const appName of apps) {
      this.validateApp(appName, path.join(appsDir, appName));
    }
  }

  validatePackage(packageName, packagePath) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push(`${packageName}: package.json が存在しません`);
      return;
    }

    // index.ts の存在確認
    const indexPath = path.join(packagePath, 'src', 'index.ts');
    if (!fs.existsSync(indexPath)) {
      this.warnings.push(`${packageName}: src/index.ts が存在しません`);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const fullPackageName = packageJson.name;

    // アーキテクチャルールでの依存関係確認
    if (this.rules.packages && this.rules.packages[fullPackageName]) {
      this.validatePackageDependencies(fullPackageName, packageJson, this.rules.packages[fullPackageName]);
    }
  }

  validateApp(appName, appPath) {
    const packageJsonPath = path.join(appPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push(`${appName}: package.json が存在しません`);
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const fullPackageName = packageJson.name;

    // アーキテクチャルールでの依存関係確認
    if (this.rules.packages && this.rules.packages[fullPackageName]) {
      this.validatePackageDependencies(fullPackageName, packageJson, this.rules.packages[fullPackageName]);
    }
  }

  validatePackageDependencies(packageName, packageJson, rules) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const allowedDeps = rules.allowed_dependencies || [];
    const peerDeps = rules.peer_dependencies || [];

    for (const dep of Object.keys(dependencies)) {
      if (!allowedDeps.includes(dep) && !peerDeps.includes(dep) && !this.isTypeDependency(dep)) {
        this.warnings.push(`${packageName}: 予期しない依存関係 "${dep}"`);
      }
    }

    // peerDependencies の確認
    const actualPeerDeps = Object.keys(packageJson.peerDependencies || {});
    for (const peerDep of peerDeps) {
      if (!actualPeerDeps.includes(peerDep)) {
        this.warnings.push(`${packageName}: peerDependencies に "${peerDep}" が定義されていません`);
      }
    }
  }

  isTypeDependency(dep) {
    return dep.startsWith('@types/') || 
           dep === 'typescript' || 
           dep.includes('eslint') ||
           dep === 'nodemon' ||
           dep === 'ts-node' ||
           dep === 'tsconfig-paths';
  }

  validateLayeredArchitecture() {
    console.log('🏗️ レイヤードアーキテクチャを検証中...');
    
    const serverPath = path.join(PROJECT_ROOT, 'apps', 'server', 'src');
    if (!fs.existsSync(serverPath)) {
      this.warnings.push('サーバーアプリケーションが見つかりません');
      return;
    }

    // Repository パターンの検証
    this.validateRepositoryPattern(serverPath);
    
    // Controller-Service 境界の検証
    this.validateControllerServiceBoundary(serverPath);
  }

  validateRepositoryPattern(serverPath) {
    const servicesPath = path.join(serverPath, 'services');
    if (!fs.existsSync(servicesPath)) return;

    const serviceFiles = this.getTypeScriptFiles(servicesPath);
    
    for (const serviceFile of serviceFiles) {
      const content = fs.readFileSync(serviceFile, 'utf8');
      
      // 直接的な Prisma インポートのチェック
      if (content.includes('import') && content.includes('@prisma/client')) {
        const relativePath = path.relative(PROJECT_ROOT, serviceFile);
        this.errors.push(`${relativePath}: サービス層で直接 @prisma/client をインポートしています`);
      }
    }
  }

  validateControllerServiceBoundary(serverPath) {
    const controllersPath = path.join(serverPath, 'controllers');
    if (!fs.existsSync(controllersPath)) return;

    const controllerFiles = this.getTypeScriptFiles(controllersPath);
    
    for (const controllerFile of controllerFiles) {
      const content = fs.readFileSync(controllerFile, 'utf8');
      
      // 直接的なリポジトリインポートのチェック
      if (content.includes('import') && content.includes('repositories/')) {
        const relativePath = path.relative(PROJECT_ROOT, controllerFile);
        this.warnings.push(`${relativePath}: コントローラーで直接リポジトリをインポートしています`);
      }
    }
  }

  getTypeScriptFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      traverse(dir);
    }
    
    return files;
  }

  validate() {
    console.log('🔍 Fuji Calendar アーキテクチャ検証を開始...\n');
    
    this.validatePackageStructure();
    this.validateLayeredArchitecture();
    
    this.printResults();
    
    return this.errors.length === 0;
  }

  printResults() {
    console.log('\n📊 検証結果:');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ アーキテクチャ検証に合格しました！');
      return;
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ エラー (${this.errors.length}件):`);
      this.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  警告 (${this.warnings.length}件):`);
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    console.log(`\n 合計: エラー ${this.errors.length}件, 警告 ${this.warnings.length}件`);
  }
}

// スクリプト実行
if (require.main === module) {
  const validator = new ArchitectureValidator();
  const success = validator.validate();
  process.exit(success ? 0 : 1);
}

module.exports = ArchitectureValidator;