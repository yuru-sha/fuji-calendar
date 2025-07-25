import { PrismaClientManager } from './src/server/database/prisma';
import { AstronomicalCalculatorImpl } from './src/server/services/AstronomicalCalculator';

async function testElevationError() {
  const prisma = PrismaClientManager.getInstance();
  
  try {
    // テスト地点を取得
    const location = await prisma.location.findFirst();
    if (!location) {
      console.log('No location found');
      return;
    }
    
    console.log('Testing with location:', {
      id: location.id,
      name: location.name,
      latitude: typeof location.latitude, 
      longitude: typeof location.longitude,
      elevation: typeof location.elevation,
      values: {
        latitude: location.latitude,
        longitude: location.longitude, 
        elevation: location.elevation
      }
    });
    
    // AstronomicalCalculatorをテスト
    const calculator = new AstronomicalCalculatorImpl();
    const testDate = new Date();
    
    console.log('Testing getSunPosition...');
    const sunPos = calculator.getSunPosition(testDate, location.latitude, location.longitude, location.elevation);
    console.log('Sun position:', sunPos);
    
    console.log('Testing getMoonPosition...');
    const moonPos = calculator.getMoonPosition(testDate, location.latitude, location.longitude, location.elevation);
    console.log('Moon position:', moonPos);
    
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testElevationError();