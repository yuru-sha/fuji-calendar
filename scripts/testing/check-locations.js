#!/usr/bin/env node

const path = require('path');
require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.server.json')
});

const { prisma } = require('./src/server/database/prisma');

async function main() {
  try {
    // 地点数確認
    const locationCount = await prisma.location.count();
    console.log(`📍 総地点数: ${locationCount}件`);
    
    // 富士山データが設定済みの地点数確認
    const fujiDataCount = await prisma.location.count({
      where: {
        fujiAzimuth: { not: null },
        fujiElevation: { not: null },
        fujiDistance: { not: null }
      }
    });
    console.log(`🗻 富士山データ設定済み: ${fujiDataCount}件`);
    
    // サンプル地点を表示
    const sampleLocations = await prisma.location.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        fujiAzimuth: true,
        fujiElevation: true,
        fujiDistance: true
      }
    });
    
    console.log('\n📊 サンプル地点データ:');
    sampleLocations.forEach(loc => {
      console.log(`  ${loc.id}: ${loc.name}`);
      console.log(`    富士方位角: ${loc.fujiAzimuth}`);
      console.log(`    富士仰角: ${loc.fujiElevation}`);
      console.log(`    富士距離: ${loc.fujiDistance}`);
    });
    
    // celestial_orbit_dataの状況確認
    const celestialCount = await prisma.celestialOrbitData.count();
    console.log(`\n🌟 天体データ件数: ${celestialCount}件`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('エラー:', error.message);
    await prisma.$disconnect();
  }
}

main();