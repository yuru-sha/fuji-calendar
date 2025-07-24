const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    // 12/31のデータ確認
    const dec31Count = await prisma.celestialOrbitData.count({
      where: {
        date: new Date('2025-12-31')
      }
    });
    
    console.log(`2025-12-31のデータ: ${dec31Count}件`);
    
    // 最後の日付確認
    const lastDate = await prisma.celestialOrbitData.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true }
    });
    
    console.log(`最終日付: ${lastDate?.date.toISOString().split('T')[0]}`);
    
    // 各月の日数確認
    const monthCounts = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        COUNT(DISTINCT date) as days,
        COUNT(*) as total_records
      FROM celestial_orbit_data 
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;
    
    console.log('\n各月のデータ:');
    monthCounts.forEach(row => {
      console.log(`${row.month}月: ${row.days}日分, ${row.total_records}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();