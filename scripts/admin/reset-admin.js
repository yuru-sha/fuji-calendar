const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function resetAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('管理者アカウントリセット開始...');
    
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@example.com';
    
    // 既存のアカウントを削除
    await prisma.admin.deleteMany({
      where: { username }
    });
    console.log('既存のアカウントを削除しました');
    
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
    
    console.log('✅ 管理者アカウントがリセットされました:');
    console.log(`   ユーザー名: ${username}`);
    console.log(`   パスワード: ${password}`);
    console.log(`   ID: ${admin.id}`);
    
    // パスワード検証テスト
    const isValid = await bcrypt.compare(password, passwordHash);
    console.log(`   パスワード検証: ${isValid ? '✅ 成功' : '❌ 失敗'}`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();