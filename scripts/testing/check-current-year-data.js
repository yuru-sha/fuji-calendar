/**
 * 現在年（2025年）のlocation_fuji_eventsデータ状況を確認
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentYearData() {
  console.log('=== 現在年（2025年）のlocation_fuji_eventsデータ確認 ===\n');
  
  try {
    const currentYear = new Date().getFullYear();
    console.log(`現在年: ${currentYear}`);
    
    // 全体のレコード数
    const totalCount = await prisma.locationFujiEvent.count();
    console.log(`📊 location_fuji_events総レコード数: ${totalCount}`);
    
    // 年別のデータ数
    const years = [2024, 2025, 2026, 2027];
    
    for (const year of years) {
      const yearCount = await prisma.locationFujiEvent.count({
        where: {
          eventDate: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`)
          }
        }
      });
      
      console.log(`📅 ${year}年のイベント数: ${yearCount}`);
      
      if (yearCount > 0) {
        // 月別の詳細
        console.log(`   ${year}年の月別詳細:`);
        for (let month = 1; month <= 12; month++) {
          const monthCount = await prisma.locationFujiEvent.count({
            where: {
              eventDate: {
                gte: new Date(`${year}-${month.toString().padStart(2, '0')}-01`),
                lte: new Date(`${year}-${month.toString().padStart(2, '0')}-31`)
              }
            }
          });
          
          if (monthCount > 0) {
            console.log(`     ${month}月: ${monthCount}件`);
          }
        }
      }
    }
    
    // 現在月のデータ確認
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthCount = await prisma.locationFujiEvent.count({
      where: {
        eventDate: {
          gte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`),
          lte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`)
        }
      }
    });
    
    console.log(`\n🗓️ 現在月（${currentYear}年${currentMonth}月）のイベント数: ${currentMonthCount}`);
    
    // 最新のイベント日付を確認
    const latestEvent = await prisma.locationFujiEvent.findFirst({
      orderBy: {
        eventDate: 'desc'
      },
      select: {
        eventDate: true,
        eventType: true
      }
    });
    
    if (latestEvent) {
      console.log(`📅 最新イベント日付: ${latestEvent.eventDate.toISOString().split('T')[0]} (${latestEvent.eventType})`);
    }
    
    // 最古のイベント日付を確認
    const oldestEvent = await prisma.locationFujiEvent.findFirst({
      orderBy: {
        eventDate: 'asc'
      },
      select: {
        eventDate: true,
        eventType: true
      }
    });
    
    if (oldestEvent) {
      console.log(`📅 最古イベント日付: ${oldestEvent.eventDate.toISOString().split('T')[0]} (${oldestEvent.eventType})`);
    }
    
    // calculationYearフィールドの確認
    const calculationYears = await prisma.locationFujiEvent.groupBy({
      by: ['calculationYear'],
      _count: {
        calculationYear: true
      },
      orderBy: {
        calculationYear: 'asc'
      }
    });
    
    console.log('\n📊 calculationYear別の分布:');
    calculationYears.forEach(item => {
      console.log(`   ${item.calculationYear}年計算: ${item._count.calculationYear}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentYearData();