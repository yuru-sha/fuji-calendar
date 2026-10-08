#!/usr/bin/env ts-node

/**
 * 既存の全地点の fuji_elevation を一括更新するスクリプト
 * 
 * 使用方法:
 * npx ts-node-esm scripts/update-fuji-elevations.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/server/src/generated/prisma/client.js";
import { CoordinateCalculator } from "../apps/server/src/services/astronomical/CoordinateCalculator.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const coordinateCalculator = new CoordinateCalculator();

async function updateFujiElevations() {
  try {
    console.log('🚀 富士山仰角一括更新スクリプト開始');

    // 全ての地点を取得
    const locations = await prisma.location.findMany();
    console.log(`📍 ${locations.length} 件の地点を取得しました`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const location of locations) {
      try {
        // 富士山への仰角を計算
        const fujiElevation = coordinateCalculator.calculateElevationToFujiSummit(location);
        
        // データベースを更新
        await prisma.location.update({
          where: { id: location.id },
          data: { fujiElevation: fujiElevation }
        });

        console.log(`✅ ${location.name} (ID: ${location.id}): ${fujiElevation.toFixed(4)}°`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ ${location.name} (ID: ${location.id}): エラー - ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log('\n📊 更新結果:');
    console.log(`   成功: ${updatedCount} 件`);
    console.log(`   失敗: ${errorCount} 件`);
    console.log(`   合計: ${locations.length} 件`);

    if (updatedCount > 0) {
      console.log('\n🎉 富士山仰角の一括更新が完了しました！');
    } else {
      console.log('\n⚠️  更新された地点がありません');
    }

  } catch (error) {
    console.error('💥 スクリプト実行エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
updateFujiElevations().catch((error) => {
  console.error('💥 予期しないエラー:', error);
  process.exit(1);
});