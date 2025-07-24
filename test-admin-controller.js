const express = require('express');

async function testAdminController() {
  try {
    console.log('AdminControllerのテスト開始...');
    
    // AdminControllerをインポートしてみる
    const { AdminController } = await import('./src/server/controllers/AdminController.ts');
    console.log('✅ AdminController インポート成功');
    
    // インスタンス化してみる
    const adminController = new AdminController();
    console.log('✅ AdminController インスタンス化成功');
    
    console.log('✅ AdminController テスト完了');
    
  } catch (error) {
    console.error('❌ AdminController テストエラー:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testAdminController();