const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jcc_factory',
    charset: 'utf8mb4',
    connectionLimit: 10,
    acquireTimeout: 60000,
    connectTimeout: 60000
};

console.log('=======================================');
console.log('  ATTEMPTING TO CONNECT WITH DATABASE  ');
console.log('---------------------------------------');
console.log(`  Host:     ${dbConfig.host}`);
console.log(`  Port:     ${dbConfig.port}`);
console.log(`  User:     ${dbConfig.user}`);
console.log(`  Database: ${dbConfig.database}`);
console.log(`  Password: ${dbConfig.password ? 'Provided' : 'NOT PROVIDED (empty)'}`);
console.log('=======================================');

const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ 数据库连接成功');
        connection.release();
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }
}

module.exports = { pool, testConnection }; 