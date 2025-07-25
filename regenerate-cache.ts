import { PrismaClientManager } from './src/server/database/prisma';
import { EventCacheService } from './src/server/services/EventCacheService';

async function regenerateCache() {
  const prisma = PrismaClientManager.getInstance();
  const eventCacheService = new EventCacheService();
  
  try {
    console.log('30秒間隔でキャッシュを再生成します...');
    
    // 富津岬の地点ID:6を再生成
    const result = await eventCacheService.generateLocationCache(6, 2025);
    
    console.log('再生成結果:', {
      success: result.success,
      totalEvents: result.totalEvents,
      timeMs: result.timeMs
    });
    
    if (result.success) {
      // 8月13日のパール富士イベントを確認
      const events = await prisma.locationFujiEvent.findMany({
        where: {
          locationId: 6,
          eventDate: new Date(2025, 7, 13), // 8月13日
          eventType: 'pearl_moonset'
        },
        orderBy: {
          eventTime: 'asc'
        }
      });
      
      console.log('\n8月13日のパール富士イベント:');
      events.forEach(event => {
        const time = event.eventTime.toLocaleTimeString('ja-JP');
        console.log(`  ${time} - 仰角: ${event.altitude.toFixed(3)}度`);
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateCache();