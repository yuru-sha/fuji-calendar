#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function truncateData() {
  console.log('既存のデータを削除します...');
  
  try {
    // location_fuji_events を先に削除（外部キー制約のため）
    const eventsDeleted = await prisma.locationFujiEvent.deleteMany({});
    console.log(`✅ location_fuji_events: ${eventsDeleted.count}件削除しました`);
    
    // celestial_orbit_data を削除
    const celestialDeleted = await prisma.celestialOrbitData.deleteMany({});
    console.log(`✅ celestial_orbit_data: ${celestialDeleted.count}件削除しました`);
    
    console.log('\nデータ削除完了！');
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

truncateData();