#!/usr/bin/env node

/**
 * バンドルサイズ分析スクリプト
 * 各パッケージのバンドルサイズと依存関係を分析し、最適化提案を行う
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

class BundleAnalyzer {
  constructor() {
    this.packages = new Map();
    this.duplicatedDeps = new Map();
    this.heavyDeps = [];
  }

  analyze() {
    console.log('📊 バンドルサイズ分析を開始...\n');
    
    this.loadPackageInfo();
    this.findDuplicatedDependencies();
    this.identifyHeavyDependencies();
    this.generateOptimizationSuggestions();
    
    this.printResults();
  }

  loadPackageInfo() {
    console.log('📦 パッケージ情報を読み込み中...');
    
    // packages ディレクトリ
    const packagesDir = path.join(PROJECT_ROOT, 'packages');
    if (fs.existsSync(packagesDir)) {
      const packageDirs = fs.readdirSync(packagesDir).filter(dir => {
        const packagePath = path.join(packagesDir, dir);
        return fs.statSync(packagePath).isDirectory() && dir !== '.gitkeep';
      });

      for (const dir of packageDirs) {
        this.loadPackage(path.join(packagesDir, dir));
      }
    }

    // apps ディレクトリ
    const appsDir = path.join(PROJECT_ROOT, 'apps');
    if (fs.existsSync(appsDir)) {
      const appDirs = fs.readdirSync(appsDir).filter(dir => {
        const appPath = path.join(appsDir, dir);
        return fs.statSync(appPath).isDirectory();
      });

      for (const dir of appDirs) {
        this.loadPackage(path.join(appsDir, dir));
      }
    }
  }

  loadPackage(packagePath) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageInfo = {
      name: packageJson.name,
      version: packageJson.version,
      path: packagePath,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      peerDependencies: packageJson.peerDependencies || {},
      size: this.estimatePackageSize(packagePath)
    };

    this.packages.set(packageJson.name, packageInfo);
  }

  estimatePackageSize(packagePath) {
    const srcPath = path.join(packagePath, 'src');
    if (!fs.existsSync(srcPath)) {
      return 0;
    }

    let totalSize = 0;
    
    function calculateSize(dir) {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          calculateSize(fullPath);
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          totalSize += stat.size;
        }
      }
    }
    
    calculateSize(srcPath);
    return Math.round(totalSize / 1024); // KB
  }

  findDuplicatedDependencies() {
    console.log('🔍 重複依存関係を検索中...');
    
    const depCounts = new Map();
    
    for (const [packageName, packageInfo] of this.packages) {
      const allDeps = {
        ...packageInfo.dependencies,
        ...packageInfo.devDependencies
      };
      
      for (const dep of Object.keys(allDeps)) {
        if (!depCounts.has(dep)) {
          depCounts.set(dep, new Set());
        }
        depCounts.get(dep).add(packageName);
      }
    }
    
    for (const [dep, packages] of depCounts) {
      if (packages.size > 1) {
        this.duplicatedDeps.set(dep, Array.from(packages));
      }
    }
  }

  identifyHeavyDependencies() {
    console.log('⚖️ 重い依存関係を特定中...');
    
    const knownHeavyDeps = [
      { name: 'react', reason: 'フロントエンドフレームワーク', size: '~140KB' },
      { name: 'react-dom', reason: 'React DOM レンダラー', size: '~130KB' },
      { name: 'leaflet', reason: '地図ライブラリ', size: '~140KB' },
      { name: '@headlessui/react', reason: 'UI コンポーネントライブラリ', size: '~50KB' },
      { name: 'express', reason: 'Web フレームワーク', size: '~30KB' },
      { name: 'prisma', reason: 'ORM ツール', size: '~25MB (開発時のみ)' },
      { name: 'typescript', reason: 'TypeScript コンパイラ', size: '~20MB (開発時のみ)' }
    ];
    
    for (const [packageName, packageInfo] of this.packages) {
      const allDeps = {
        ...packageInfo.dependencies,
        ...packageInfo.devDependencies
      };
      
      for (const dep of Object.keys(allDeps)) {
        const heavy = knownHeavyDeps.find(h => h.name === dep);
        if (heavy && !this.heavyDeps.some(h => h.name === dep && h.package === packageName)) {
          this.heavyDeps.push({
            ...heavy,
            package: packageName,
            type: packageInfo.dependencies[dep] ? 'runtime' : 'dev'
          });
        }
      }
    }
  }

  generateOptimizationSuggestions() {
    this.suggestions = [];
    
    // React 依存関係の最適化
    const reactPackages = this.duplicatedDeps.get('react') || [];
    if (reactPackages.length > 1) {
      this.suggestions.push({
        type: 'dependency-optimization',
        title: 'React 依存関係の重複排除',
        description: 'UI パッケージで React を peerDependencies として定義し、バンドルサイズを削減',
        impact: 'high',
        packages: reactPackages,
        action: 'packages/ui で React を dependencies から peerDependencies に移動済み'
      });
    }
    
    // TypeScript バージョン統一
    const typeScriptPackages = this.duplicatedDeps.get('typescript') || [];
    if (typeScriptPackages.length > 1) {
      const versions = new Set();
      for (const pkg of typeScriptPackages) {
        const packageInfo = this.packages.get(pkg);
        const tsVersion = packageInfo.devDependencies.typescript || packageInfo.dependencies.typescript;
        versions.add(tsVersion);
      }
      
      if (versions.size > 1) {
        this.suggestions.push({
          type: 'version-alignment',
          title: 'TypeScript バージョンの統一',
          description: '全パッケージで同一の TypeScript バージョンを使用',
          impact: 'medium',
          packages: typeScriptPackages,
          versions: Array.from(versions),
          action: 'ルートの package.json で TypeScript バージョンを統一し、workspaces で共有'
        });
      }
    }
    
    // 不要な型定義の削除提案
    const typePackages = Array.from(this.duplicatedDeps.keys()).filter(dep => dep.startsWith('@types/'));
    if (typePackages.length > 0) {
      this.suggestions.push({
        type: 'type-optimization',
        title: '型定義パッケージの最適化',
        description: '共通の型定義パッケージをルートで管理し、重複を排除',
        impact: 'low',
        packages: typePackages,
        action: 'よく使用される @types パッケージをルートの devDependencies に移動'
      });
    }
  }

  printResults() {
    console.log('\n📊 分析結果:\n');
    
    // パッケージサイズ一覧
    console.log('📦 パッケージサイズ:');
    const sortedPackages = Array.from(this.packages.values())
      .sort((a, b) => b.size - a.size);
    
    for (const pkg of sortedPackages) {
      console.log(`  ${pkg.name}: ${pkg.size}KB`);
    }
    
    // 重複依存関係
    if (this.duplicatedDeps.size > 0) {
      console.log('\n🔄 重複依存関係:');
      for (const [dep, packages] of this.duplicatedDeps) {
        console.log(`  ${dep}:`);
        for (const pkg of packages) {
          console.log(`    - ${pkg}`);
        }
      }
    }
    
    // 重い依存関係
    if (this.heavyDeps.length > 0) {
      console.log('\n⚖️ 重い依存関係:');
      for (const dep of this.heavyDeps) {
        console.log(`  ${dep.name} (${dep.size}) - ${dep.reason}`);
        console.log(`    パッケージ: ${dep.package} (${dep.type})`);
      }
    }
    
    // 最適化提案
    if (this.suggestions.length > 0) {
      console.log('\n💡 最適化提案:');
      for (const suggestion of this.suggestions) {
        console.log(`\n  ${this.getImpactIcon(suggestion.impact)} ${suggestion.title}`);
        console.log(`     ${suggestion.description}`);
        if (suggestion.action) {
          console.log(`     ✅ ${suggestion.action}`);
        }
      }
    }
    
    console.log('\n✨ 分析完了');
  }

  getImpactIcon(impact) {
    switch (impact) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💫';
      default: return '📋';
    }
  }
}

// スクリプト実行
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze();
}

module.exports = BundleAnalyzer;