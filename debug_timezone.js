// 時刻変換のデバッグ

// timeUtilsを直接実装
const JST_OFFSET = 9; // UTC+9

const timeUtils = {
  jstToUtc(jstDate) {
    return new Date(jstDate.getTime() - JST_OFFSET * 60 * 60 * 1000);
  },
  
  utcToJst(utcDate) {
    return new Date(utcDate.getTime() + JST_OFFSET * 60 * 60 * 1000);
  }
};

console.log('=== JST ⇔ UTC 変換テスト ===\n');

// テスト用のJST時刻
const jstDate = new Date(2025, 1, 18, 17, 15, 0); // 2月18日 17:15 JST
console.log('元のJST時刻:', jstDate);
console.log('  toString():', jstDate.toString());
console.log('  toISOString():', jstDate.toISOString());
console.log('  getHours():', jstDate.getHours());

// JST → UTC 変換
const utcDate = timeUtils.jstToUtc(jstDate);
console.log('\nJST→UTC変換後:', utcDate);
console.log('  toString():', utcDate.toString());
console.log('  toISOString():', utcDate.toISOString());
console.log('  getHours():', utcDate.getHours());

// UTC → JST 変換
const jstBack = timeUtils.utcToJst(utcDate);
console.log('\nUTC→JST変換後:', jstBack);
console.log('  toString():', jstBack.toString());
console.log('  toISOString():', jstBack.toISOString());
console.log('  getHours():', jstBack.getHours());

console.log('\n=== 時差の確認 ===');
console.log('JST - UTC (時間差):', (jstDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60), '時間');

console.log('\n=== new Date()の動作確認 ===');
const localDate = new Date(2025, 1, 18, 17, 15);
const utcDateDirect = new Date('2025-02-18T17:15:00Z');
console.log('new Date(2025, 1, 18, 17, 15):', localDate.toString());
console.log('new Date("2025-02-18T17:15:00Z"):', utcDateDirect.toString());