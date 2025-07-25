#!/usr/bin/env node

/**
 * データ生成の進捗を確認するスクリプト
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProgress() {
  console.log('📊 データ生成進捗確認中...');
  
  try {
    const year = 2025;
    
    // 月別のデータ数を確認
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        COUNT(*) as count,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM "celestial_orbit_data" 
      WHERE EXTRACT(YEAR FROM date) = ${year}
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;
    
    console.log(`\n📅 ${year}年の月別データ状況:`);
    
    let totalCount = 0;
    let lastCompletedDate = null;
    
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyStats.find(stat => Number(stat.month) === month);
      
      if (monthData) {
        const count = Number(monthData.count);
        totalCount += count;
        const expectedDays = new Date(year, month, 0).getDate(); // その月の日数
        const expectedCount = expectedDays * 288 * 2; // 1日288データポイント × 太陽・月
        const progress = Math.round((count / expectedCount) * 100);
        
        console.log(`  ${month}月: ${count.toLocaleString()}件 (${progress}%) - ${monthData.first_date.toISOString().split('T')[0]} ～ ${monthData.last_date.toISOString().split('T')[0]}`);
        
        if (progress >= 95) { // ほぼ完了
          lastCompletedDate = monthData.last_date;
        }
      } else {
        console.log(`  ${month}月: 0件 (0%)`);
      }
    }
    
    console.log(`\n📈 総データ数: ${totalCount.toLocaleString()}件`);
    
    // 最後に完了した日付から次の日を推定
    if (lastCompletedDate) {
      const nextDate = new Date(lastCompletedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      console.log(`\n🎯 推奨再開日: ${nextDate.getFullYear()}年${nextDate.getMonth() + 1}月${nextDate.getDate()}日`);
      console.log(`\n📝 再開コマンド:`);
      console.log(`node scripts/resume-from-date.js ${nextDate.getFullYear()} ${nextDate.getMonth() + 1} ${nextDate.getDate()}`);
    }
    
    // 年間予想データ数と比較
    const expectedYearlyTotal = 365 * 288 * 2; // 約210,000件
    const overallProgress = Math.round((totalCount / expectedYearlyTotal) * 100);
    console.log(`\n🚀 全体進捗: ${overallProgress}%`);
    
  } catch (error) {
    console.error('❌ 進捗確認エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProgress().catch(console.error);