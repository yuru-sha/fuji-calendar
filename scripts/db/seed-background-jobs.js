#!/usr/bin/env node

/**
 * バックグラウンドジョブ設定の初期データ作成スクリプト
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultJobs = [
  {
    id: 'yearly-data-generation',
    name: '年次データ生成',
    description: '毎年 12 月 1 日に翌年のダイヤモンド富士・パール富士データを全地点で生成',
    schedule: '0 2 1 12 *',
    enabled: true
  },
  {
    id: 'daily-maintenance',
    name: '日次メンテナンス',
    description: '毎日 AM3:00 にキュー統計ログ出力と失敗ジョブクリーンアップ（7 日以上前）',
    schedule: '0 3 * * *',
    enabled: true
  },
  {
    id: 'weekly-maintenance',
    name: '週次メンテナンス',
    description: '毎週日曜日 AM4:00 にデータベース統計情報を更新（ANALYZE 実行）',
    schedule: '0 4 * * 0',
    enabled: true
  },
  {
    id: 'monthly-maintenance',
    name: '月次メンテナンス',
    description: '毎月 1 日 AM5:00 に 3 年以上前の古いイベントデータを削除',
    schedule: '0 5 1 * *',
    enabled: true
  }
];

async function seedBackgroundJobs() {
  console.log('バックグラウンドジョブ設定の初期データを作成中...');

  for (const job of defaultJobs) {
    try {
      const existing = await prisma.backgroundJobConfig.findUnique({
        where: { id: job.id }
      });

      if (existing) {
        console.log(`  ✓ 既存: ${job.name} (${job.id})`);
        // 既存の場合は名前と説明のみ更新（設定は保持）
        await prisma.backgroundJobConfig.update({
          where: { id: job.id },
          data: {
            name: job.name,
            description: job.description,
            schedule: job.schedule
          }
        });
      } else {
        console.log(`  + 新規作成: ${job.name} (${job.id})`);
        await prisma.backgroundJobConfig.create({
          data: job
        });
      }
    } catch (error) {
      console.error(`  ✗ エラー: ${job.name} - ${error.message}`);
    }
  }

  console.log('バックグラウンドジョブ設定の初期データ作成完了');
}

async function main() {
  try {
    await seedBackgroundJobs();
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();