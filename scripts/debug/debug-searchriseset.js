#!/usr/bin/env node

// Astronomy Engine の SearchRiseSet の戻り値を調査

const Astronomy = require('./apps/server/node_modules/astronomy-engine');

const tenjogatakeLocation = {
  latitude: 35.329621,
  longitude: 138.535881,
  elevation: 1319
};

async function debugSearchRiseSet() {
  console.log('=== SearchRiseSet 戻り値調査 ===');
  
  const observer = new Astronomy.Observer(
    tenjogatakeLocation.latitude,
    tenjogatakeLocation.longitude,
    tenjogatakeLocation.elevation
  );
  
  const date = new Date('2025-01-16T00:00:00+09:00');
  const utcDate = new Date(date.getTime() - 9 * 60 * 60 * 1000);
  
  console.log(`基準日（JST）: ${date.toLocaleString('ja-JP')}`);
  console.log(`基準日（UTC）: ${utcDate.toISOString()}`);
  
  try {
    console.log('\n=== 月の出検索 ===');
    const moonrise = Astronomy.SearchRiseSet(
      Astronomy.Body.Moon,
      observer,
      1, // 月の出
      utcDate,
      1 // 1 日間検索
    );
    
    console.log('moonrise 戻り値の型:', typeof moonrise);
    console.log('moonrise instanceof Date:', moonrise instanceof Date);
    console.log('moonrise:', moonrise);
    
    if (moonrise) {
      console.log('moonrise の構造:');
      console.log('- hasOwnProperty("getTime"):', moonrise.hasOwnProperty('getTime'));
      console.log('- Object.keys(moonrise):', Object.keys(moonrise));
      console.log('- Object.getOwnPropertyNames(moonrise):', Object.getOwnPropertyNames(moonrise));
      
      // 異なる方法で時刻を取得してみる
      if (moonrise.date) {
        console.log('moonrise.date:', moonrise.date);
        console.log('moonrise.date instanceof Date:', moonrise.date instanceof Date);
      }
      
      if (moonrise.time) {
        console.log('moonrise.time:', moonrise.time);
        console.log('moonrise.time instanceof Date:', moonrise.time instanceof Date);
      }
      
      // JST 変換を試行
      let jstTime = null;
      if (moonrise instanceof Date) {
        jstTime = new Date(moonrise.getTime() + 9 * 60 * 60 * 1000);
      } else if (moonrise.date instanceof Date) {
        jstTime = new Date(moonrise.date.getTime() + 9 * 60 * 60 * 1000);
      } else if (moonrise.time instanceof Date) {
        jstTime = new Date(moonrise.time.getTime() + 9 * 60 * 60 * 1000);
      }
      
      if (jstTime) {
        console.log(`月の出時刻（JST）: ${jstTime.toLocaleString('ja-JP')}`);
      }
    } else {
      console.log('月の出が見つかりませんでした');
    }
    
    console.log('\n=== 月の入り検索 ===');
    const moonset = Astronomy.SearchRiseSet(
      Astronomy.Body.Moon,
      observer,
      -1, // 月の入り
      utcDate,
      1 // 1 日間検索
    );
    
    console.log('moonset 戻り値の型:', typeof moonset);
    console.log('moonset instanceof Date:', moonset instanceof Date);
    console.log('moonset:', moonset);
    
    if (moonset) {
      // JST 変換を試行
      let jstTime = null;
      if (moonset instanceof Date) {
        jstTime = new Date(moonset.getTime() + 9 * 60 * 60 * 1000);
      } else if (moonset.date instanceof Date) {
        jstTime = new Date(moonset.date.getTime() + 9 * 60 * 60 * 1000);
      } else if (moonset.time instanceof Date) {
        jstTime = new Date(moonset.time.getTime() + 9 * 60 * 60 * 1000);
      }
      
      if (jstTime) {
        console.log(`月の入り時刻（JST）: ${jstTime.toLocaleString('ja-JP')}`);
      }
    } else {
      console.log('月の入りが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('SearchRiseSet エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
}

debugSearchRiseSet();