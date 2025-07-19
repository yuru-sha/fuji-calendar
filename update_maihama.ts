// 舞浜海岸の事前計算値を更新するスクリプト
import { LocationModel } from './src/server/models/Location';
import { initializeDatabase } from './src/server/database/connection';

async function updateMaihama() {
  await initializeDatabase();
  const locationModel = new LocationModel();
  
  // 舞浜海岸を検索
  const locations = await locationModel.findAll();
  const maihama = locations.find(loc => loc.name === '舞浜海岸');
  
  if (maihama) {
    console.log(`舞浜海岸を更新中: ID=${maihama.id}`);
    const updated = await locationModel.updatePreCalculatedValues(maihama.id);
    if (updated) {
      console.log('事前計算値を更新しました:');
      console.log(`  富士山への方位角: ${updated.fujiAzimuth?.toFixed(2)}度`);
      console.log(`  富士山頂への仰角: ${updated.fujiElevation?.toFixed(2)}度`);
      console.log(`  富士山までの距離: ${updated.fujiDistance?.toFixed(2)}km`);
    }
  } else {
    console.log('舞浜海岸が見つかりませんでした');
  }
  
  process.exit(0);
}

updateMaihama().catch(console.error);