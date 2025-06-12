#!/usr/bin/env node
/**
 * 检查数据库中的代理配置
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

class DatabaseProxyChecker {
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

    async checkProxyConfigs() {
        console.log('\n🔍 检查数据库中的代理配置...');
        console.log('=' * 50);

        try {
            // 查询所有系统配置
            const [rows] = await this.connection.execute(
                'SELECT config_key, config_value, updated_at FROM system_config WHERE config_key LIKE "%proxy%" ORDER BY config_key'
            );

            if (rows.length === 0) {
                console.log('⚠️ 数据库中没有找到代理相关配置');
                return;
            }

            console.log('📋 找到以下代理配置:');
            rows.forEach(row => {
                console.log(`\n🔧 ${row.config_key}:`);
                try {
                    const value = JSON.parse(row.config_value);
                    console.log('   值:', JSON.stringify(value, null, 2));
                } catch (e) {
                    console.log('   值:', row.config_value);
                }
                console.log('   更新时间:', row.updated_at);
            });

            // 特别检查 proxy_service_urls
            const proxyUrlsRow = rows.find(row => row.config_key === 'proxy_service_urls');
            if (proxyUrlsRow) {
                console.log('\n🌐 代理服务URLs详情:');
                try {
                    const urls = JSON.parse(proxyUrlsRow.config_value);
                    Object.entries(urls).forEach(([provider, url]) => {
                        console.log(`   ${provider}: ${url || '未设置'}`);
                    });
                } catch (e) {
                    console.log('   解析失败:', proxyUrlsRow.config_value);
                }
            }

            // 特别检查 proxy_config
            const proxyConfigRow = rows.find(row => row.config_key === 'proxy_config');
            if (proxyConfigRow) {
                console.log('\n⚙️ 代理服务配置详情:');
                try {
                    const config = JSON.parse(proxyConfigRow.config_value);
                    console.log(`   启用状态: ${config.enabled ? '✅ 已启用' : '❌ 已禁用'}`);
                    console.log(`   提供商: ${config.provider}`);
                    console.log(`   自定义URL: ${config.customUrl || '未设置'}`);
                    console.log(`   本地回退: ${config.fallbackToLocal ? '✅ 启用' : '❌ 禁用'}`);
                } catch (e) {
                    console.log('   解析失败:', proxyConfigRow.config_value);
                }
            }

        } catch (error) {
            console.error('❌ 查询代理配置失败:', error.message);
        }
    }

    async getCurrentNetlifyUrl() {
        console.log('\n🔍 获取当前Netlify代理URL...');
        
        try {
            const [rows] = await this.connection.execute(
                'SELECT config_value FROM system_configs WHERE config_key = "proxy_service_urls"'
            );

            if (rows.length === 0) {
                console.log('⚠️ 未找到proxy_service_urls配置');
                return null;
            }

            const urls = JSON.parse(rows[0].config_value);
            const netlifyUrl = urls.netlify;
            
            console.log(`📍 数据库中的Netlify URL: ${netlifyUrl || '未设置'}`);
            return netlifyUrl;
            
        } catch (error) {
            console.error('❌ 获取Netlify URL失败:', error.message);
            return null;
        }
    }

    async testNetlifyUrl(netlifyUrl) {
        if (!netlifyUrl) {
            console.log('⚠️ Netlify URL为空，跳过测试');
            return false;
        }

        console.log('\n🧪 测试Netlify代理URL...');
        console.log(`🌐 测试地址: ${netlifyUrl}`);

        const https = require('https');
        
        return new Promise((resolve) => {
            const testUrl = `${netlifyUrl}/.netlify/functions/v1/models`;
            console.log(`🔄 请求: ${testUrl}`);

            https.get(testUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`📊 响应状态: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        console.log('✅ Netlify代理测试成功！');
                        try {
                            const parsed = JSON.parse(data);
                            console.log('📝 返回的模型数量:', parsed.data?.length || 0);
                        } catch (e) {
                            console.log('📝 响应数据:', data.substring(0, 100) + '...');
                        }
                        resolve(true);
                    } else {
                        console.log('❌ Netlify代理测试失败');
                        console.log('📝 响应内容:', data.substring(0, 200) + '...');
                        resolve(false);
                    }
                });
            }).on('error', (error) => {
                console.error('❌ 请求失败:', error.message);
                resolve(false);
            });
        });
    }

    async updateNetlifyUrl(newUrl) {
        console.log('\n🔧 更新Netlify URL...');
        
        try {
            // 首先获取当前的URLs配置
            const [rows] = await this.connection.execute(
                'SELECT config_value FROM system_configs WHERE config_key = "proxy_service_urls"'
            );

            let urls = {
                local: 'http://localhost:8080',
                netlify: '',
                vercel: '',
                cloudflare: '',
                custom: ''
            };

            if (rows.length > 0) {
                try {
                    urls = JSON.parse(rows[0].config_value);
                } catch (e) {
                    console.log('⚠️ 解析现有配置失败，使用默认配置');
                }
            }

            // 更新Netlify URL
            urls.netlify = newUrl;

            // 保存到数据库
            await this.connection.execute(
                'INSERT INTO system_configs (config_key, config_value, user_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()',
                ['proxy_service_urls', JSON.stringify(urls), 1, JSON.stringify(urls)]
            );

            console.log('✅ Netlify URL更新成功');
            console.log(`📍 新的Netlify URL: ${newUrl}`);
            
            return true;
        } catch (error) {
            console.error('❌ 更新Netlify URL失败:', error.message);
            return false;
        }
    }

    async run() {
        console.log('🚀 开始检查数据库代理配置');
        console.log('=' * 60);

        // 连接数据库
        if (!(await this.connectToDatabase())) {
            return;
        }

        try {
            // 检查所有代理配置
            await this.checkProxyConfigs();

            // 获取当前Netlify URL
            const netlifyUrl = await this.getCurrentNetlifyUrl();

            // 测试Netlify URL
            if (netlifyUrl) {
                const testResult = await this.testNetlifyUrl(netlifyUrl);
                
                if (!testResult) {
                    console.log('\n💡 建议操作:');
                    console.log('1. 检查Netlify站点是否正确部署');
                    console.log('2. 确认Netlify函数是否正常工作');
                    console.log('3. 检查GEMINI_API_KEY环境变量是否在Netlify中设置');
                    console.log('4. 运行 node deploy-netlify.js 重新部署');
                }
            } else {
                console.log('\n💡 需要设置Netlify URL:');
                console.log('请在系统配置页面设置正确的Netlify代理地址');
            }

        } finally {
            await this.connection.end();
            console.log('\n✅ 数据库连接已关闭');
        }
    }

    showHelp() {
        console.log(`
📋 数据库代理配置检查工具

用法:
  node check-database-proxy.js              # 检查当前配置
  node check-database-proxy.js --help       # 显示帮助
  node check-database-proxy.js --update-netlify <URL>  # 更新Netlify URL

示例:
  node check-database-proxy.js --update-netlify https://your-app.netlify.app

功能:
  - 检查数据库中的代理配置
  - 测试Netlify代理URL连接
  - 更新Netlify代理URL
  - 提供修复建议
        `);
    }
}

// 运行检查
async function main() {
    const checker = new DatabaseProxyChecker();
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        checker.showHelp();
        return;
    }

    if (args.includes('--update-netlify')) {
        const urlIndex = args.indexOf('--update-netlify') + 1;
        if (urlIndex < args.length) {
            const newUrl = args[urlIndex];
            
            if (!(await checker.connectToDatabase())) {
                return;
            }
            
            await checker.updateNetlifyUrl(newUrl);
            await checker.connection.end();
        } else {
            console.error('❌ 请提供Netlify URL');
            console.log('用法: node check-database-proxy.js --update-netlify <URL>');
        }
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

module.exports = DatabaseProxyChecker; 