const { AdminModel } = require('../dist/server/models/Admin');
const bcrypt = require('bcrypt');

async function createDefaultAdmin() {
  const dbPath = path.join(__dirname, '../data/fuji_calendar.db');
  const db = new Database(dbPath);
  
  try {
    // デフォルト管理者の情報
    const username = 'admin';
    const email = 'admin@fuji-calendar.local';
    const password = 'FujiAdmin2024!'; // 本番環境では必ず変更すること
    
    // 既存の管理者をチェック
    const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    
    if (existingAdmin) {
      console.log('管理者アカウントは既に存在します。');
      return;
    }
    
    // パスワードをハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 管理者を作成
    const stmt = db.prepare(`
      INSERT INTO admins (username, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now', '+9 hours'))
    `);
    
    const result = stmt.run(username, email, passwordHash);
    
    if (result.changes > 0) {
      console.log('🎉 デフォルト管理者アカウントが作成されました！');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 ログイン情報');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ユーザー名: ${username}`);
      console.log(`パスワード: ${password}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  セキュリティのため、初回ログイン後にパスワードを変更してください。');
      console.log('🌐 ログインURL: http://localhost:3001/admin/login');
    } else {
      console.error('❌ 管理者アカウントの作成に失敗しました。');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    db.close();
  }
}

createDefaultAdmin();