const knex = require('knex');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load configuration
const knexConfig = require('./knexfile.js');
const config = knexConfig.development; // hoặc production tùy môi trường

// Initialize database connection
const db = knex(config);

async function fixUnhashedPasswords() {
  try {
    console.log('🔍 Đang kiểm tra mật khẩu chưa được mã hóa...');
    
    // Lấy tất cả users
    const users = await db('users').select('id', 'username', 'password');
    
    let fixedCount = 0;
    let alreadyHashedCount = 0;
    
    for (const user of users) {
      // Kiểm tra xem password đã được hash chưa
      // Bcrypt hash thường bắt đầu với $2a$, $2b$, $2x$, $2y$ và có độ dài khoảng 60 ký tự
      const isHashed = user.password && user.password.startsWith('$2') && user.password.length >= 50;
      
      if (!isHashed) {
        console.log(`⚠️  User ${user.username} (ID: ${user.id}) có mật khẩu chưa được mã hóa: "${user.password}"`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Cập nhật vào database
        await db('users')
          .where('id', user.id)
          .update({ password: hashedPassword });
        
        console.log(`✅ Đã mã hóa mật khẩu cho user ${user.username}`);
        fixedCount++;
      } else {
        console.log(`✓  User ${user.username} (ID: ${user.id}) đã có mật khẩu được mã hóa`);
        alreadyHashedCount++;
      }
    }
    
    console.log('\n📊 Tóm tắt:');
    console.log(`- Tổng số users: ${users.length}`);
    console.log(`- Đã được mã hóa từ trước: ${alreadyHashedCount}`);
    console.log(`- Vừa được sửa: ${fixedCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Hoàn thành! Tất cả mật khẩu đã được mã hóa.');
    } else {
      console.log('\n✅ Tất cả mật khẩu đã được mã hóa từ trước.');
    }
    
  } catch (error) {
    console.error('❌ Lỗi khi sửa mật khẩu:', error);
  } finally {
    await db.destroy();
  }
}

// Chạy script
fixUnhashedPasswords();
