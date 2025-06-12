#!/usr/bin/env node
/**
 * 检查数据库结构
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

class DatabaseStructureChecker {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'jcc_factory'
        };
    }

    async connectToDatabase() {
        try {
            this.connection = await mysql.createConnection(this.dbConfig);
            console.log('✅ 数据库连接成功');
            return true;
        } catch (error) {
            console.error('❌ 数据库连接失败:', error.message);
            return false;
        }
    }

    async checkTables() {
        console.log('\n🔍 检查数据库表结构...');
        
        try {
            const [tables] = await this.connection.execute('SHOW TABLES');
            
            console.log('📋 数据库中的表:');
            if (tables.length === 0) {
                console.log('⚠️ 数据库中没有表');
                return;
            }

            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   📄 ${tableName}`);
            });

            // 检查是否有system_configs表
            const systemConfigsExists = tables.some(table => 
                Object.values(table)[0] === 'system_configs'
            );

            if (!systemConfigsExists) {
                console.log('\n❌ system_configs表不存在');
                console.log('💡 需要创建system_configs表');
                
                // 提供创建表的SQL
                console.log('\n📝 创建system_configs表的SQL:');
                console.log(`
CREATE TABLE system_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT,
    user_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
                `);
            } else {
                console.log('\n✅ system_configs表存在');
                await this.checkSystemConfigsStructure();
            }

        } catch (error) {
            console.error('❌ 检查表结构失败:', error.message);
        }
    }

    async checkSystemConfigsStructure() {
        console.log('\n🔍 检查system_configs表结构...');
        
        try {
            const [columns] = await this.connection.execute('DESCRIBE system_configs');
            
            console.log('📋 system_configs表字段:');
            columns.forEach(column => {
                console.log(`   📄 ${column.Field} (${column.Type}) ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? column.Key : ''}`);
            });

            // 检查是否有代理相关配置
            const [configs] = await this.connection.execute(
                'SELECT config_key, config_value FROM system_configs WHERE config_key LIKE "%proxy%"'
            );

            if (configs.length === 0) {
                console.log('\n⚠️ 没有找到代理相关配置');
                console.log('💡 需要初始化代理配置');
            } else {
                console.log('\n📋 现有代理配置:');
                configs.forEach(config => {
                    console.log(`   🔧 ${config.config_key}: ${config.config_value}`);
                });
            }

        } catch (error) {
            console.error('❌ 检查system_configs表结构失败:', error.message);
        }
    }

    async createSystemConfigsTable() {
        console.log('\n🔧 创建system_configs表...');
        
        try {
            await this.connection.execute(`
                CREATE TABLE system_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    config_key VARCHAR(255) NOT NULL UNIQUE,
                    config_value TEXT,
                    user_id INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ system_configs表创建成功');
            
            // 插入默认代理配置
            await this.insertDefaultProxyConfigs();
            
        } catch (error) {
            console.error('❌ 创建system_configs表失败:', error.message);
        }
    }

    async insertDefaultProxyConfigs() {
        console.log('\n🔧 插入默认代理配置...');
        
        try {
            const defaultConfigs = [
                {
                    key: 'proxy_service_urls',
                    value: JSON.stringify({
                        local: 'http://localhost:8080',
                        netlify: 'https://chimerical-stardust-d347a4.netlify.app',
                        vercel: '',
                        cloudflare: '',
                        custom: ''
                    })
                },
                {
                    key: 'proxy_config',
                    value: JSON.stringify({
                        enabled: true,
                        provider: 'netlify',
                        customUrl: '',
                        fallbackToLocal: true
                    })
                }
            ];

            for (const config of defaultConfigs) {
                await this.connection.execute(
                    'INSERT INTO system_configs (config_key, config_value, user_id) VALUES (?, ?, ?)',
                    [config.key, config.value, 1]
                );
                console.log(`✅ 插入配置: ${config.key}`);
            }
            
        } catch (error) {
            console.error('❌ 插入默认配置失败:', error.message);
        }
    }

    async run() {
        console.log('🚀 开始检查数据库结构');
        console.log('=' * 60);

        // 连接数据库
        if (!(await this.connectToDatabase())) {
            return;
        }

        try {
            await this.checkTables();
        } finally {
            await this.connection.end();
            console.log('\n✅ 数据库连接已关闭');
        }
    }

    async createTable() {
        console.log('🚀 创建system_configs表');
        console.log('=' * 60);

        // 连接数据库
        if (!(await this.connectToDatabase())) {
            return;
        }

        try {
            await this.createSystemConfigsTable();
        } finally {
            await this.connection.end();
            console.log('\n✅ 数据库连接已关闭');
        }
    }

    showHelp() {
        console.log(`
📋 数据库结构检查工具

用法:
  node check-database-structure.js              # 检查数据库结构
  node check-database-structure.js --create     # 创建system_configs表
  node check-database-structure.js --help       # 显示帮助

功能:
  - 检查数据库表结构
  - 检查system_configs表是否存在
  - 创建system_configs表
  - 插入默认代理配置
        `);
    }
}

// 运行检查
async function main() {
    const checker = new DatabaseStructureChecker();
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        checker.showHelp();
        return;
    }

    if (args.includes('--create')) {
        await checker.createTable();
        return;
    }

    try {
        await checker.run();
    } catch (error) {
        console.error('💥 检查过程中发生错误:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = DatabaseStructureChecker; 