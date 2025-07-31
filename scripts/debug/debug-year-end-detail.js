#!/usr/bin/env node

// 2024 年末～2025 年始の詳細調査

const { PrismaClient } = require('@prisma/client');

async function debugYearEndDetail() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 年末年始の詳細調査 ===');
    
    // 12 月 27 日から 1 月 3 日まで日ごとにチェック
    const dates = [];
    for (let i = 27; i <= 31; i++) {
      dates.push(`2024-12-${i.toString().padStart(2, '0')}`);
    }
    for (let i = 1; i <= 3; i++) {
      dates.push(`2025-01-${i.toString().padStart(2, '0')}`);
    }
    
    console.log('\n=== 日別イベント数 ===');
    for (const dateStr of dates) {
      const date = new Date(dateStr + 'T00:00:00Z');
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await prisma.locationEvent.count({
        where: {
          eventDate: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      console.log(`${dateStr}: ${count}件`);
      
      // 特定の日にデータがない場合、詳細確認
      if (count === 0 && (dateStr === '2024-12-30' || dateStr === '2024-12-31' || dateStr === '2025-01-01')) {
        console.log(`  ❌ ${dateStr} にデータがありません`);
        
        // 前後の日のデータを確認
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevCount = await prisma.locationEvent.count({
          where: {
            eventDate: {
              gte: prevDate,
              lt: date
            }
          }
        });
        
        const nextCount = await prisma.locationEvent.count({
          where: {
            eventDate: {
              gte: nextDate,
              lt: new Date(nextDate.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });
        
        console.log(`    前日 (${prevDate.toISOString().split('T')[0]}): ${prevCount}件`);
        console.log(`    翌日 (${nextDate.toISOString().split('T')[0]}): ${nextCount}件`);
      }
    }
    
    // 計算年度別の確認
    console.log('\n=== 計算年度別のイベント数 ===');
    const yearGroups = await prisma.locationEvent.groupBy({
      by: ['calculationYear'],
      _count: {
        id: true
      },
      orderBy: {
        calculationYear: 'asc'
      }
    });
    
    yearGroups.forEach(group => {
      console.log(`${group.calculationYear}年: ${group._count.id}件`);
    });
    
    // 2024 年と 2025 年の境界付近のイベントタイプ分析
    console.log('\n=== 年末年始のイベントタイプ分析 ===');
    const typeAnalysis = await prisma.locationEvent.groupBy({
      by: ['eventType', 'eventDate'],
      _count: {
        id: true
      },
      where: {
        eventDate: {
          gte: new Date('2024-12-27'),
          lt: new Date('2025-01-04')
        }
      },
      orderBy: [
        { eventDate: 'asc' },
        { eventType: 'asc' }
      ]
    });
    
    typeAnalysis.forEach(analysis => {
      console.log(`${analysis.eventDate.toISOString().split('T')[0]} ${analysis.eventType}: ${analysis._count.id}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugYearEndDetail().catch(console.error);