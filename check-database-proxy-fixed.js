#!/usr/bin/env node
/**
 * 检查数据库中的代理配置（修正版）
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
            // 查询所有系统配置（注意表名是system_config，不是system_configs）
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
                'SELECT config_value FROM system_config WHERE config_key = "proxy_service_urls"'
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

            const req = https.get(testUrl, { timeout: 15000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`📊 响应状态: ${res.statusCode}`);
                    console.log(`📋 响应头:`, res.headers);
                    
                    if (res.statusCode === 200) {
                        console.log('✅ Netlify代理测试成功！');
                        try {
                            const parsed = JSON.parse(data);
                            console.log('📝 返回的模型数量:', parsed.data?.length || 0);
                            console.log('📝 模型列表:', parsed.data?.map(m => m.id).join(', '));
                        } catch (e) {
                            console.log('📝 响应数据:', data.substring(0, 200) + '...');
                        }
                        resolve(true);
                    } else {
                        console.log('❌ Netlify代理测试失败');
                        console.log('📝 响应内容:', data.substring(0, 500) + '...');
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ 请求失败:', error.message);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error('❌ 请求超时');
                resolve(false);
            });
        });
    }

    async testNetlifyChatEndpoint(netlifyUrl) {
        if (!netlifyUrl) {
            console.log('⚠️ Netlify URL为空，跳过聊天端点测试');
            return false;
        }

        console.log('\n🧪 测试Netlify聊天端点...');
        
        const https = require('https');
        
        return new Promise((resolve) => {
            const testUrl = `${netlifyUrl}/.netlify/functions/v1/chat/completions`;
            console.log(`🔄 请求: ${testUrl}`);

            const postData = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: 'Hello, this is a test message.' }
                ],
                temperature: 0.7,
                max_tokens: 100
            });

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-key',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 15000
            };

            const req = https.request(testUrl, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`📊 聊天端点响应状态: ${res.statusCode}`);
                    
                    if (res.statusCode === 401) {
                        console.log('✅ 聊天端点正常工作（正确拒绝了测试密钥）');
                        resolve(true);
                    } else {
                        console.log('📝 聊天端点响应:', data.substring(0, 300) + '...');
                        resolve(res.statusCode === 200);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ 聊天端点请求失败:', error.message);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error('❌ 聊天端点请求超时');
                resolve(false);
            });

            req.write(postData);
            req.end();
        });
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
                const modelsTestResult = await this.testNetlifyUrl(netlifyUrl);
                const chatTestResult = await this.testNetlifyChatEndpoint(netlifyUrl);
                
                console.log('\n📊 测试结果总结:');
                console.log('=' * 50);
                console.log(`模型端点: ${modelsTestResult ? '✅ 成功' : '❌ 失败'}`);
                console.log(`聊天端点: ${chatTestResult ? '✅ 成功' : '❌ 失败'}`);
                
                if (!modelsTestResult || !chatTestResult) {
                    console.log('\n💡 问题诊断:');
                    if (!modelsTestResult && !chatTestResult) {
                        console.log('🔍 Netlify函数可能没有正确部署或无法访问');
                        console.log('📝 建议操作:');
                        console.log('   1. 检查Netlify站点部署状态');
                        console.log('   2. 确认函数文件是否存在于 netlify/functions/ 目录');
                        console.log('   3. 检查netlify.toml配置文件');
                        console.log('   4. 运行 node deploy-netlify.js 重新部署');
                    } else if (!modelsTestResult) {
                        console.log('🔍 模型端点无法访问，但聊天端点可能正常');
                    } else if (!chatTestResult) {
                        console.log('🔍 聊天端点有问题，可能是API密钥验证逻辑问题');
                    }
                } else {
                    console.log('\n🎉 Netlify代理服务工作正常！');
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
}

// 运行检查
async function main() {
    const checker = new DatabaseProxyChecker();
    
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