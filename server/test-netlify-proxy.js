#!/usr/bin/env node
/**
 * Netlify代理专项测试工具
 */

const https = require('https');
const http = require('http');
require('dotenv').config();

class NetlifyProxyTester {
    constructor() {
        this.netlifyUrl = 'https://chimerical-stardust-d347a4.netlify.app';
        this.apiKey = process.env.GEMINI_API_KEY;
        this.timeout = 10000; // 10秒超时
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const isHttps = url.startsWith('https://');
            const client = isHttps ? https : http;
            
            const requestOptions = {
                method: 'GET',
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'JCC-Factory-Test/1.0',
                    'Accept': 'application/json',
                    ...options.headers
                },
                ...options
            };

            console.log(`🔍 测试请求: ${options.method || 'GET'} ${url}`);
            console.log(`📋 请求头:`, requestOptions.headers);

            const req = client.request(url, requestOptions, (res) => {
                let data = '';
                
                console.log(`📤 响应状态: ${res.statusCode}`);
                console.log(`📋 响应头:`, res.headers);
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data,
                            raw: true
                        });
                    }
                });
            });

            req.on('error', (error) => {
                console.log(`❌ 请求错误: ${error.message}`);
                reject(error);
            });

            req.on('timeout', () => {
                console.log(`⏰ 请求超时 (${this.timeout}ms)`);
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                console.log(`📝 请求体:`, options.body);
                req.write(options.body);
            }
            
            req.end();
        });
    }

    async testBasicConnectivity() {
        console.log('\n🔍 测试基本连接性...');
        console.log(`🌐 目标地址: ${this.netlifyUrl}`);
        
        try {
            // 测试根路径
            const result = await this.makeRequest(this.netlifyUrl);
            
            if (result.success) {
                console.log('✅ 基本连接成功');
                console.log(`   状态码: ${result.statusCode}`);
                console.log(`   响应类型: ${result.headers['content-type'] || '未知'}`);
            } else {
                console.log('❌ 基本连接失败');
                console.log(`   状态码: ${result.statusCode}`);
            }
            
            return result.success;
        } catch (error) {
            console.log('❌ 基本连接异常');
            console.log(`   错误: ${error.message}`);
            return false;
        }
    }

    async testModelsEndpoint() {
        console.log('\n🔍 测试模型列表端点...');
        
        try {
            const modelsUrl = `${this.netlifyUrl}/v1/models`;
            const result = await this.makeRequest(modelsUrl);
            
            if (result.success) {
                console.log('✅ 模型端点可访问');
                console.log(`   状态码: ${result.statusCode}`);
                if (result.data && result.data.data) {
                    console.log(`   可用模型: ${result.data.data.length}个`);
                    result.data.data.forEach(model => {
                        console.log(`     - ${model.id}`);
                    });
                }
            } else {
                console.log('❌ 模型端点失败');
                console.log(`   状态码: ${result.statusCode}`);
                if (result.data) {
                    console.log(`   响应内容: ${JSON.stringify(result.data, null, 2)}`);
                }
            }
            
            return result.success;
        } catch (error) {
            console.log('❌ 模型端点异常');
            console.log(`   错误: ${error.message}`);
            return false;
        }
    }

    async testChatEndpoint() {
        console.log('\n🔍 测试聊天端点...');
        
        if (!this.apiKey) {
            console.log('⚠️  未设置API密钥，跳过聊天测试');
            return false;
        }
        
        console.log(`🔑 使用API密钥: ${this.apiKey.substring(0, 10)}...`);
        
        try {
            const chatUrl = `${this.netlifyUrl}/v1/chat/completions`;
            const requestBody = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: '请用中文简单回答：你好' }
                ],
                temperature: 0.7,
                max_tokens: 100
            });
            
            const result = await this.makeRequest(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: requestBody
            });
            
            if (result.success) {
                console.log('✅ 聊天端点测试成功');
                console.log(`   状态码: ${result.statusCode}`);
                if (result.data && result.data.choices && result.data.choices[0]) {
                    const response = result.data.choices[0].message.content;
                    console.log(`   AI响应: ${response.substring(0, 100)}...`);
                    console.log(`   Token使用: ${result.data.usage?.total_tokens || '未知'}`);
                }
            } else {
                console.log('❌ 聊天端点测试失败');
                console.log(`   状态码: ${result.statusCode}`);
                if (result.data) {
                    console.log(`   错误信息: ${JSON.stringify(result.data, null, 2)}`);
                }
            }
            
            return result.success;
        } catch (error) {
            console.log('❌ 聊天端点异常');
            console.log(`   错误: ${error.message}`);
            return false;
        }
    }

    async runFullTest() {
        console.log('🚀 开始Netlify代理专项测试');
        console.log('='.repeat(60));
        
        // 检查基本配置
        console.log('\n📋 配置检查:');
        console.log(`代理地址: ${this.netlifyUrl}`);
        console.log(`API密钥: ${this.apiKey ? '已配置' : '❌ 未配置'}`);
        console.log(`超时设置: ${this.timeout}ms`);
        
        const results = {
            connectivity: false,
            models: false,
            chat: false
        };
        
        // 测试基本连接
        results.connectivity = await this.testBasicConnectivity();
        
        // 测试模型端点
        results.models = await this.testModelsEndpoint();
        
        // 测试聊天端点
        results.chat = await this.testChatEndpoint();
        
        // 输出测试总结
        console.log('\n📊 测试结果总结:');
        console.log('='.repeat(60));
        console.log(`基本连接: ${results.connectivity ? '✅ 成功' : '❌ 失败'}`);
        console.log(`模型端点: ${results.models ? '✅ 成功' : '❌ 失败'}`);
        console.log(`聊天端点: ${results.chat ? '✅ 成功' : '❌ 失败'}`);
        
        // 诊断建议
        console.log('\n💡 诊断建议:');
        if (!results.connectivity) {
            console.log('- 基本连接失败，可能原因：');
            console.log('  1. Netlify应用未部署或已停止');
            console.log('  2. 网络连接问题');
            console.log('  3. DNS解析问题');
            console.log('- 建议检查Netlify部署状态');
        } else if (!results.models) {
            console.log('- 基本连接成功但模型端点失败，可能原因：');
            console.log('  1. Netlify函数未正确部署');
            console.log('  2. 路由配置错误');
            console.log('- 建议检查netlify.toml配置和函数代码');
        } else if (!results.chat) {
            console.log('- 模型端点成功但聊天失败，可能原因：');
            console.log('  1. API密钥未在Netlify环境变量中设置');
            console.log('  2. Gemini API调用失败');
            console.log('  3. 函数执行超时');
            console.log('- 建议检查Netlify环境变量GEMINI_API_KEY');
        } else {
            console.log('- 所有测试通过，Netlify代理工作正常！');
        }
        
        return results.connectivity && results.models && results.chat;
    }
}

// 主执行函数
async function main() {
    const tester = new NetlifyProxyTester();
    
    try {
        const success = await tester.runFullTest();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n💥 测试过程中发生异常:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = NetlifyProxyTester; 