// 2025-12-24から12-28の海ほたるPAの月の出入り調査
const Astronomy = require('astronomy-engine');

// 海ほたるPAの座標
const umihotaruLocation = {
  id: 265,
  name: '海ほたるパーキングエリア',
  prefecture: '千葉県',
  latitude: 35.4469,
  longitude: 139.8331,
  elevation: 10
};

async function debugMoonRiseSetRange() {
  console.log('=== 2025-12-24から12-28の海ほたるPA 月の出入り調査 ===\n');

  const observer = new Astronomy.Observer(umihotaruLocation.latitude, umihotaruLocation.longitude, umihotaruLocation.elevation);

  for (let day = 24; day <= 28; day++) {
    const targetDate = new Date(2025, 11, day); // 2025年12月
    console.log(`\n--- ${targetDate.toLocaleDateString('ja-JP')} ---`);

    // その日の0時から24時の範囲
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // 前日から翌日までの範囲で月の出・入りを検索
      const searchStart = new Date(targetDate);
      searchStart.setDate(searchStart.getDate() - 1);

      // 月の出を検索
      let moonrise = null;
      try {
        const riseResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, searchStart, 3);
        if (riseResult && riseResult.date >= startOfDay && riseResult.date <= endOfDay) {
          moonrise = riseResult;
        }
      } catch (error) {
        console.log(`  月の出検索エラー: ${error.message}`);
      }

      // 月の入りを検索
      let moonset = null;
      try {
        const setResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, searchStart, 3);
        if (setResult && setResult.date >= startOfDay && setResult.date <= endOfDay) {
          moonset = setResult;
        }
      } catch (error) {
        console.log(`  月の入り検索エラー: ${error.message}`);
      }

      // 月相情報
      const moonPhase = Astronomy.MoonPhase(targetDate);
      const illuminationFraction = Math.abs(Math.sin(moonPhase * Math.PI / 180));

      console.log(`  月の出: ${moonrise ? moonrise.date.toLocaleString('ja-JP') : 'なし'}`);
      console.log(`  月の入り: ${moonset ? moonset.date.toLocaleString('ja-JP') : 'なし'}`);
      console.log(`  月相: ${moonPhase.toFixed(1)}° (照光面積: ${(illuminationFraction * 100).toFixed(1)}%)`);

      // より広い範囲で月の出入りを検索（参考情報）
      try {
        const wideSearchStart = new Date(targetDate);
        wideSearchStart.setDate(wideSearchStart.getDate() - 2);

        const wideRiseResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, wideSearchStart, 5);
        const wideSetResult = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, wideSearchStart, 5);

        console.log(`  [参考] 最近の月の出: ${wideRiseResult ? wideRiseResult.date.toLocaleString('ja-JP') : 'なし'}`);
        console.log(`  [参考] 最近の月の入り: ${wideSetResult ? wideSetResult.date.toLocaleString('ja-JP') : 'なし'}`);

      } catch (error) {
        console.log(`  参考情報取得エラー: ${error.message}`);
      }

    } catch (error) {
      console.log(`  エラー: ${error.message}`);
    }
  }

  console.log(`\n=== 月の軌道の特徴 ===`);
  console.log(`月は約24.8時間周期で出入りするため、毎日約50分ずつ遅くなります。`);
  console.log(`そのため、特定の日には月の出や月の入りが発生しない場合があります。`);
  console.log(`これは正常な天体現象です。`);
}

debugMoonRiseSetRange().catch(console.error);