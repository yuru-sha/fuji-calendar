/**
 * astronomy-engineライブラリのMoonPhase関数の動作確認
 * 3647.9%という異常な月相値の原因を調査
 */

const Astronomy = require('astronomy-engine');

function debugMoonPhase() {
  console.log('=== astronomy-engine MoonPhase関数の動作確認 ===\n');
  
  // テスト日時（複数の月相で確認）
  const testDates = [
    new Date('2024-01-01T12:00:00+09:00'), // 新月付近
    new Date('2024-01-08T12:00:00+09:00'), // 上弦付近
    new Date('2024-01-15T12:00:00+09:00'), // 満月付近
    new Date('2024-01-23T12:00:00+09:00'), // 下弦付近
    new Date('2024-12-01T12:00:00+09:00'), // 別の月
  ];
  
  testDates.forEach((date, index) => {
    console.log(`テスト ${index + 1}: ${date.toISOString()}`);
    
    try {
      // MoonPhase関数の結果
      const moonPhase = Astronomy.MoonPhase(date);
      console.log(`  MoonPhase(): ${moonPhase}`);
      console.log(`  MoonPhase() * 100: ${(moonPhase * 100).toFixed(1)}%`);
      
      // Illumination関数の結果（比較用）
      const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
      console.log(`  Illumination.phase_fraction: ${moonIllumination.phase_fraction}`);
      console.log(`  Illumination.phase_fraction * 100: ${(moonIllumination.phase_fraction * 100).toFixed(1)}%`);
      
      // 月相の角度（度）として解釈した場合
      console.log(`  MoonPhase()を角度として解釈: ${moonPhase.toFixed(1)}度`);
      
      // 正規化を試す（0-1の範囲に）
      const normalizedPhase = (moonPhase % 360) / 360;
      console.log(`  正規化 (moonPhase % 360) / 360: ${normalizedPhase.toFixed(3)}`);
      console.log(`  正規化 * 100: ${(normalizedPhase * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.log(`  エラー: ${error.message}`);
    }
    
    console.log('');
  });
  
  // 異常値のテスト（3647.9%になるケース）
  console.log('=== 異常値の再現テスト ===');
  const problematicValue = 36.479; // 3647.9% / 100
  console.log(`問題の値: ${problematicValue}`);
  console.log(`この値 * 100: ${(problematicValue * 100).toFixed(1)}%`);
  console.log(`この値を角度として解釈: ${problematicValue.toFixed(1)}度`);
  console.log(`正規化 (値 % 360) / 360: ${((problematicValue % 360) / 360).toFixed(3)}`);
  console.log(`正規化後 * 100: ${(((problematicValue % 360) / 360) * 100).toFixed(1)}%`);
}

// 実行
debugMoonPhase();