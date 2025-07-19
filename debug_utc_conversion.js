// UTC変換の動作を詳細にデバッグ
console.log('=== UTC変換の比較テスト ===\n');

// テスト用のJST時刻
const jstDate = new Date(2025, 1, 18, 17, 15, 0); // 2月18日 17:15 JST
console.log('元のJST時刻:', jstDate);
console.log('  toString():', jstDate.toString());
console.log('  toISOString():', jstDate.toISOString());
console.log('  getHours():', jstDate.getHours());
console.log('  getTimezoneOffset():', jstDate.getTimezoneOffset(), '分');

console.log('\n=== 修正案: getTimezoneOffset()使用 ===');
const utcTime1 = new Date(jstDate.getTime() - (jstDate.getTimezoneOffset() * 60000));
console.log('getTimezoneOffset()変換後:', utcTime1);
console.log('  toString():', utcTime1.toString());
console.log('  toISOString():', utcTime1.toISOString());
console.log('  getHours():', utcTime1.getHours());

console.log('\n=== timeUtils.jstToUtc()との比較 ===');
const JST_OFFSET = 9; // UTC+9
const utcTime2 = new Date(jstDate.getTime() - JST_OFFSET * 60 * 60 * 1000);
console.log('JST_OFFSET変換後:', utcTime2);
console.log('  toString():', utcTime2.toString());
console.log('  toISOString():', utcTime2.toISOString());
console.log('  getHours():', utcTime2.getHours());

console.log('\n=== 比較結果 ===');
console.log('getTimezoneOffset()とJST_OFFSETの差:', 
  (utcTime1.getTime() - utcTime2.getTime()) / (1000 * 60), '分');
console.log('元JST - getTimezoneOffset()変換:', 
  (jstDate.getTime() - utcTime1.getTime()) / (1000 * 60 * 60), '時間');
console.log('元JST - JST_OFFSET変換:', 
  (jstDate.getTime() - utcTime2.getTime()) / (1000 * 60 * 60), '時間');

console.log('\n=== 期待される変換 ===');
console.log('JST 17:15 → UTC 08:15 になるべき');
console.log('実際の結果:');
console.log('  getTimezoneOffset():', utcTime1.getHours() + ':' + utcTime1.getMinutes().toString().padStart(2, '0'));
console.log('  JST_OFFSET:', utcTime2.getHours() + ':' + utcTime2.getMinutes().toString().padStart(2, '0'));