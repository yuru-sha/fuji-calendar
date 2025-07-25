#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseData() {
  console.log('PostgreSQLデータベースの状況を確認中...\n');
  
  try {
    // 各テーブルのレコード数を確認
    const locationCount = await prisma.location.count();
    const celestialCount = await prisma.celestialOrbitData.count();
    const eventCount = await prisma.locationFujiEvent.count();
    const adminCount = await prisma.admin.count();
    
    console.log('=== テーブル別レコード数 ===');
    console.log(`locations: ${locationCount}件`);
    console.log(`celestial_orbit_data: ${celestialCount}件`);
    console.log(`location_fuji_events: ${eventCount}件`);
    console.log(`admins: ${adminCount}件`);
    console.log('');
    
    // locationsの詳細
    if (locationCount > 0) {
      console.log('=== locations テーブル詳細 ===');
      const locations = await prisma.location.findMany({
        select: {
          id: true,
          name: true,
          prefecture: true,
          createdAt: true
        },
        orderBy: { id: 'asc' }
      });
      locations.forEach(loc => {
        console.log(`ID: ${loc.id}, 名前: ${loc.name}, 都道府県: ${loc.prefecture}, 作成日: ${loc.createdAt.toISOString()}`);
      });
      console.log('');
    }
    
    // celestial_orbit_dataの詳細
    if (celestialCount > 0) {
      console.log('=== celestial_orbit_data サンプルデータ ===');
      const celestialSample = await prisma.celestialOrbitData.findMany({
        take: 5,
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });
      celestialSample.forEach(data => {
        console.log(`日付: ${data.date.toISOString().split('T')[0]}, 時刻: ${data.time.toISOString()}, 天体: ${data.celestialType}, 方位角: ${data.azimuth}度, 高度: ${data.elevation}度`);
      });
      console.log('');
      
      // 日付範囲も確認
      const dateRange = await prisma.celestialOrbitData.aggregate({
        _min: { date: true },
        _max: { date: true }
      });
      console.log(`データ期間: ${dateRange._min.date?.toISOString().split('T')[0]} ～ ${dateRange._max.date?.toISOString().split('T')[0]}`);
      console.log('');
    }
    
    // location_fuji_eventsの詳細
    if (eventCount > 0) {
      console.log('=== location_fuji_events サンプルデータ ===');
      const eventSample = await prisma.locationFujiEvent.findMany({
        take: 5,
        include: {
          location: {
            select: { name: true }
          }
        },
        orderBy: { eventDate: 'asc' }
      });
      eventSample.forEach(event => {
        console.log(`地点: ${event.location.name}, 日付: ${event.eventDate.toISOString().split('T')[0]}, 時刻: ${event.eventTime.toISOString()}, イベント: ${event.eventType}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('データベース確認エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();