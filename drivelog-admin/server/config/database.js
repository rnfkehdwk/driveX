const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'drivelog',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drivelog_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+09:00',
  // 날짜를 문자열로 반환 (JavaScript Date 변환 방지)
  dateStrings: true,
});

// 연결 테스트
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
