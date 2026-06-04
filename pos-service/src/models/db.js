// ============================================
// POS Database Connection (MySQL)
// ============================================
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'pos_user',
  password: process.env.DB_PASS || 'pos_secret_2024',
  database: process.env.DB_NAME || 'pos_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
