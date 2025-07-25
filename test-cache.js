const { PrismaClient } = require('@prisma/client');

async function testEventCache() {
  const prisma = new PrismaClient();
  
  try {
    // テスト地点を作成
    const location = await prisma.location.create({
      data: {
        name: 'テスト地点',
        prefecture: '神奈川県',
        latitude: 35.5,
        longitude: 139.5,
        elevation: 100,
        description: 'テスト用の地点です',
        accessInfo: '車でアクセス可能'
      }
    });
    
    console.log('Created test location:', location.id);
    
    // EventCacheServiceを使ってキャッシュ生成をテスト
    const { EventCacheService } = require('./src/server/services/EventCacheService.ts');
    const eventCacheService = new EventCacheService();
    
    const result = await eventCacheService.generateLocationCache(location.id, 2025);
    console.log('Cache generation result:', result);
    
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEventCache();