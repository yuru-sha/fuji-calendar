import { PrismaClientManager } from './src/server/database/prisma';

async function fixEventDates() {
  const prisma = PrismaClientManager.getInstance();
  
  try {
    console.log('イベント日付の修正を開始します...');
    
    // 問題のあるレコードを取得
    const events = await prisma.locationFujiEvent.findMany({
      select: {
        id: true,
        eventDate: true,
        eventTime: true
      }
    });
    
    console.log(`総イベント数: ${events.length}`);
    
    let fixedCount = 0;
    
    for (const event of events) {
      // JSTベースの正しい日付を計算
      const correctDate = new Date(
        event.eventTime.getFullYear(),
        event.eventTime.getMonth(), 
        event.eventTime.getDate()
      );
      
      // 現在のeventDateと比較
      const currentDateString = event.eventDate.toISOString().split('T')[0];
      const correctDateString = correctDate.toISOString().split('T')[0];
      
      if (currentDateString !== correctDateString) {
        console.log(`修正対象: ID ${event.id}`);
        console.log(`  現在: ${currentDateString} (UTC基準)`);
        console.log(`  正しい: ${correctDateString} (JST基準)`);
        
        await prisma.locationFujiEvent.update({
          where: { id: event.id },
          data: { eventDate: correctDate }
        });
        
        fixedCount++;
      }
    }
    
    console.log(`修正完了: ${fixedCount}件のレコードを修正しました`);
    
  } catch (error) {
    console.error('修正エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEventDates();