import { PrismaClientManager } from './src/server/database/prisma';
import { EventCacheService } from './src/server/services/EventCacheService';

async function testEventCacheGeneration() {
  const prisma = PrismaClientManager.getInstance();
  
  try {
    // 既存の地点を取得
    const location = await prisma.location.findFirst();
    if (!location) {
      console.log('No location found');
      return;
    }
    
    console.log('Testing with existing location:', {
      id: location.id,
      name: location.name
    });
    
    // EventCacheServiceで新しいキャッシュを生成
    const eventCacheService = new EventCacheService();
    
    console.log('Starting cache generation for 2025...');
    const result = await eventCacheService.generateLocationCache(location.id, 2025);
    
    console.log('Cache generation result:', {
      success: result.success,
      totalEvents: result.totalEvents,
      timeMs: result.timeMs
    });
    
    if (result.success) {
      console.log('✅ Event cache generation completed successfully!');
    } else {
      console.log('❌ Event cache generation failed');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEventCacheGeneration();