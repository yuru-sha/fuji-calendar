const { createPrismaClient } = require('../lib/prisma-client');

const prisma = await createPrismaClient();

const newLocations = [
  // 富士山東側地点（夕方のダイヤモンド富士）
  {
    name: '伊豆の国パノラマパーク・富士見テラス',
    prefecture: '静岡県',
    latitude: 35.039,
    longitude: 138.913,
    elevation: 452,
    description: '駿河湾越しに富士山を望む絶景スポット。夕方のダイヤモンド富士観測地として人気。ロープウェイでアクセス可能。',
    accessInfo: '伊豆長岡駅からバス約15分「パノラマパーク」下車、ロープウェイ7分',
    parkingInfo: '無料駐車場あり（約200台）'
  },
  {
    name: '達磨山高原レストハウス',
    prefecture: '静岡県',
    latitude: 34.969,
    longitude: 138.832,
    elevation: 620,
    description: '駿河湾越しの雄大な富士山を望む撮影地。夕方のダイヤモンド富士観測に最適。',
    accessInfo: '伊豆スカイライン・西伊豆スカイライン利用、車でのアクセス推奨',
    parkingInfo: '無料駐車場あり（レストハウス併設）'
  },
  {
    name: '大瀬崎',
    prefecture: '静岡県',
    latitude: 35.029,
    longitude: 138.789,
    elevation: 5,
    description: '駿河湾に突き出た岬から海と富士山を同時撮影可能。夕方のダイヤモンド富士観測地。',
    accessInfo: '沼津駅からバス約90分「大瀬岬」下車、車でのアクセスが一般的',
    parkingInfo: '有料駐車場あり'
  },
  {
    name: '沼津アルプス・香貫山展望台',
    prefecture: '静岡県',
    latitude: 35.092,
    longitude: 138.873,
    elevation: 193,
    description: '沼津市街地の南側低山から市街地と富士山の眺望。夕方のダイヤモンド富士観測可能。',
    accessInfo: '各登山口までバスまたは車、香貫山は麓から徒歩30-40分',
    parkingInfo: '登山口周辺に数台分駐車スペース'
  },
  // 富士山西側地点（朝のダイヤモンド富士）
  {
    name: '竜ヶ岳山頂',
    prefecture: '山梨県',
    latitude: 35.419,
    longitude: 138.590,
    elevation: 1485,
    description: '富士山西側の代表的朝ダイヤモンド富士観測地。12月上旬～1月上旬が見頃。登山必要。',
    accessInfo: '本栖湖キャンプ場付近登山口から登山2-3時間、未明登山開始（ヘッドライト必須）',
    parkingInfo: '本栖湖キャンプ場駐車場、国道139号線沿い駐車スペース（年末年始混雑）'
  },
  {
    name: '本栖湖北岸・浩庵キャンプ場前',
    prefecture: '山梨県',
    latitude: 35.473,
    longitude: 138.584,
    elevation: 900,
    description: '千円札の富士山デザインで有名。春（4月）・夏（8月）に朝ダイヤモンド富士観測可能。',
    accessInfo: '中央道河口湖ICから車30分、国道139号・300号線沿い',
    parkingInfo: '国道沿い複数無料駐車場、千円札撮影地に駐車スペース'
  }
];

async function addEastWestLocations() {
  console.log('🌅 富士山東西両側のダイヤモンド富士観測地点を追加します...');
  
  try {
    let addedCount = 0;
    
    for (const location of newLocations) {
      // 既存地点の重複チェック
      const existing = await prisma.location.findFirst({
        where: {
          name: location.name
        }
      });
      
      if (existing) {
        console.log(`⚠️  ${location.name} は既に存在します（スキップ）`);
        continue;
      }
      
      // 新地点を追加
      const created = await prisma.location.create({
        data: location
      });
      
      console.log(`✅ ${created.name} を追加（ID: ${created.id}）`);
      addedCount++;
    }
    
    console.log(`\n🎯 追加完了: ${addedCount}地点を新規追加しました`);
    
    // 追加後の総地点数を確認
    const totalCount = await prisma.location.count();
    console.log(`📊 総地点数: ${totalCount}地点`);
    
    // 地点別県分布を表示
    const locationsByPrefecture = await prisma.location.groupBy({
      by: ['prefecture'],
      _count: {
        prefecture: true
      }
    });
    
    console.log('\n📍 県別地点数:');
    locationsByPrefecture.forEach(item => {
      console.log(`   ${item.prefecture}: ${item._count.prefecture}地点`);
    });
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEastWestLocations();