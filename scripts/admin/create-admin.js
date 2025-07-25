const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('管理者アカウント作成開始...');
    
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@example.com';
    
    // パスワードのハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 管理者を作成
    const admin = await prisma.admin.create({
      data: {
        username,
        email,
        passwordHash
      }
    });
    
    console.log('✅ 管理者アカウントが作成されました:');
    console.log(`   ユーザー名: ${username}`);
    console.log(`   パスワード: ${password}`);
    console.log(`   ID: ${admin.id}`);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  管理者アカウントは既に存在します');
    } else {
      console.error('❌ エラー:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();