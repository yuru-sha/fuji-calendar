const { PrismaClient } = require('@prisma/client');

async function checkAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('管理者アカウント確認...');
    
    const admins = await prisma.admin.findMany();
    
    console.log(`管理者アカウント数: ${admins.length}`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ID: ${admin.id}, ユーザー名: ${admin.username}, メール: ${admin.email}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();