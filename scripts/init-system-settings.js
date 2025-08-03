#!/usr/bin/env node

/**
 * システム設定の初期データ投入スクリプト
 * 天体計算の定数を DB に登録し、運用中に調整可能にする
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// システム設定の初期データ
const initialSettings = [
  // 天体計算の基本設定
  {
    settingKey: 'search_interval',
    settingType: 'number',
    numberValue: 10,
    description: '天体検索の時間間隔（秒）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'azimuth_tolerance',
    settingType: 'number',
    numberValue: 1.5,
    description: '方位角の許容誤差（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'elevation_tolerance',
    settingType: 'number',
    numberValue: 1.0,
    description: '仰角の許容誤差（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'sun_angular_diameter',
    settingType: 'number',
    numberValue: 0.53,
    description: '太陽の視直径（度）',
    category: 'astronomical',
    editable: false
  },
  {
    settingKey: 'moon_angular_diameter',
    settingType: 'number',
    numberValue: 0.52,
    description: '月の視直径（度）',
    category: 'astronomical',
    editable: false
  },
  
  // 精度判定の閾値設定（方位角）
  {
    settingKey: 'accuracy_perfect_threshold',
    settingType: 'number',
    numberValue: 0.1,
    description: '完璧精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'accuracy_excellent_threshold',
    settingType: 'number',
    numberValue: 0.25,
    description: '高精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'accuracy_good_threshold',
    settingType: 'number',
    numberValue: 0.4,
    description: '標準精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'accuracy_fair_threshold',
    settingType: 'number',
    numberValue: 0.6,
    description: '最低精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  
  // 仰角精度判定の閾値設定
  {
    settingKey: 'elevation_accuracy_perfect_threshold',
    settingType: 'number',
    numberValue: 0.1,
    description: '仰角完璧精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'elevation_accuracy_excellent_threshold',
    settingType: 'number',
    numberValue: 0.25,
    description: '仰角高精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'elevation_accuracy_good_threshold',
    settingType: 'number',
    numberValue: 0.4,
    description: '仰角標準精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  {
    settingKey: 'elevation_accuracy_fair_threshold',
    settingType: 'number',
    numberValue: 0.6,
    description: '仰角最低精度の閾値（度）',
    category: 'astronomical',
    editable: true
  },
  
  // パフォーマンス設定
  {
    settingKey: 'cache_duration_seconds',
    settingType: 'number',
    numberValue: 300,
    description: 'キャッシュ有効期間（秒）',
    category: 'performance',
    editable: true
  },
  {
    settingKey: 'batch_size',
    settingType: 'number',
    numberValue: 100,
    description: 'バッチ処理のサイズ',
    category: 'performance',
    editable: true
  },
  
  // UI 設定
  {
    settingKey: 'default_map_zoom',
    settingType: 'number',
    numberValue: 7,
    description: 'デフォルトの地図ズームレベル',
    category: 'ui',
    editable: true
  },
  {
    settingKey: 'events_per_page',
    settingType: 'number',
    numberValue: 50,
    description: '1 ページあたりのイベント表示数',
    category: 'ui',
    editable: true
  }
];

async function main() {
  console.log('システム設定の初期データを投入しています...');
  
  try {
    // 既存の設定をチェックしてから追加
    for (const setting of initialSettings) {
      const existing = await prisma.systemSetting.findUnique({
        where: { settingKey: setting.settingKey }
      });
      
      if (existing) {
        console.log(`設定 "${setting.settingKey}" は既に存在します。スキップします。`);
        continue;
      }
      
      await prisma.systemSetting.create({
        data: setting
      });
      
      console.log(`設定 "${setting.settingKey}" を追加しました。`);
    }
    
    console.log('\n 初期データの投入が完了しました。');
    
    // 投入された設定を確認
    const allSettings = await prisma.systemSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { settingKey: 'asc' }
      ]
    });
    
    console.log('\n 現在のシステム設定:');
    console.log('===================');
    
    let currentCategory = '';
    allSettings.forEach(setting => {
      if (setting.category !== currentCategory) {
        currentCategory = setting.category;
        console.log(`\n[${currentCategory.toUpperCase()}]`);
      }
      
      const value = setting.numberValue ?? setting.stringValue ?? setting.booleanValue;
      const editableStatus = setting.editable ? '編集可' : '読取専用';
      console.log(`  ${setting.settingKey}: ${value} (${editableStatus})`);
      if (setting.description) {
        console.log(`    └ ${setting.description}`);
      }
    });
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();