#!/usr/bin/env node
/**
 * 直接测试Netlify代理服务
 */

const https = require('https');
const http = require('http');

class NetlifyProxyTester {
    constructor() {
        this.netlifyUrl = 'https://chimerical-stardust-d347a4.netlify.app';
        this.timeout = 15000; // 15秒超时
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const isHttps = url.startsWith('https://');
            const client = isHttps ? https : http;
            
            const requestOptions = {
                method: options.method || 'GET',
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'JCC-Factory-Test/1.0',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            console.log(`🔄 发起请求: ${options.method || 'GET'} ${url}`);
            console.log(`📋 请求头:`, requestOptions.headers);
            
            if (options.body) {
                console.log(`📝 请求体:`, options.body);
            }

            const req = client.request(url, requestOptions, (res) => {
                let data = '';
                
                console.log(`📊 响应状态: ${res.statusCode}`);
                console.log(`📋 响应头:`, res.headers);
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data,
                            parsedBody: null
                        };
                        
                        // 尝试解析JSON
                        if (data.trim()) {
                            try {
                                result.parsedBody = JSON.parse(data);
                            } catch (e) {
                                console.log(`⚠️ 响应不是有效的JSON: ${e.message}`);
                            }
                        }
                        
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`❌ 请求错误: ${error.message}`);
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    async testBasicConnection() {
        console.log('\n🔍 测试1: 基础连接测试');
        console.log('=' * 50);
        
        try {
            const response = await this.makeRequest(this.netlifyUrl);
            console.log(`✅ 基础连接成功`);
            console.log(`📊 状态码: ${response.statusCode}`);
            console.log(`📝 响应体: ${response.body.substring(0, 200)}...`);
            return true;
        } catch (error) {
            console.error(`❌ 基础连接失败: ${error.message}`);
            return false;
        }
    }

    async testModelsEndpoint() {
        console.log('\n🔍 测试2: 模型列表端点测试');
        console.log('=' * 50);
        
        try {
            const url = `${this.netlifyUrl}/.netlify/functions/v1/models`;
            const response = await this.makeRequest(url);
            
            console.log(`✅ 模型端点响应成功`);
            console.log(`📊 状态码: ${response.statusCode}`);
            
            if (response.parsedBody) {
                console.log(`📝 模型列表:`, JSON.stringify(response.parsedBody, null, 2));
            } else {
                console.log(`📝 原始响应: ${response.body}`);
            }
            
            return response.statusCode === 200;
        } catch (error) {
            console.error(`❌ 模型端点测试失败: ${error.message}`);
            return false;
        }
    }

    async testChatEndpoint() {
        console.log('\n🔍 测试3: 聊天端点测试（无API密钥）');
        console.log('=' * 50);
        
        try {
            const url = `${this.netlifyUrl}/.netlify/functions/v1/chat/completions`;
            const requestBody = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: 'Hello, this is a test message.' }
                ],
                temperature: 0.7,
                max_tokens: 100
            });

            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test-key'
                },
                body: requestBody
            });
            
            console.log(`📊 状态码: ${response.statusCode}`);
            
            if (response.parsedBody) {
                console.log(`📝 响应内容:`, JSON.stringify(response.parsedBody, null, 2));
            } else {
                console.log(`📝 原始响应: ${response.body}`);
            }
            
            // 401是预期的，因为我们使用的是测试密钥
            if (response.statusCode === 401) {
                console.log(`✅ 聊天端点正常工作（正确拒绝了无效API密钥）`);
                return true;
            } else {
                console.log(`⚠️ 意外的状态码: ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ 聊天端点测试失败: ${error.message}`);
            return false;
        }
    }

    async testWithRealApiKey() {
        console.log('\n🔍 测试4: 使用真实API密钥测试（如果有的话）');
        console.log('=' * 50);
        
        // 检查环境变量中是否有API密钥
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.log(`⚠️ 未找到GEMINI_API_KEY环境变量，跳过真实API测试`);
            return true;
        }

        try {
            const url = `${this.netlifyUrl}/.netlify/functions/v1/chat/completions`;
            const requestBody = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: '请用中文回复：你好' }
                ],
                temperature: 0.7,
                max_tokens: 100
            });

            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: requestBody
            });
            
            console.log(`📊 状态码: ${response.statusCode}`);
            
            if (response.parsedBody) {
                console.log(`📝 响应内容:`, JSON.stringify(response.parsedBody, null, 2));
            } else {
                console.log(`📝 原始响应: ${response.body}`);
            }
            
            if (response.statusCode === 200) {
                console.log(`✅ 真实API密钥测试成功！`);
                return true;
            } else {
                console.log(`❌ 真实API密钥测试失败，状态码: ${response.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ 真实API密钥测试失败: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 开始Netlify代理服务测试');
        console.log(`🌐 目标URL: ${this.netlifyUrl}`);
        console.log('=' * 60);
        
        const results = [];
        
        // 测试1: 基础连接
        results.push(await this.testBasicConnection());
        
        // 测试2: 模型端点
        results.push(await this.testModelsEndpoint());
        
        // 测试3: 聊天端点（无效密钥）
        results.push(await this.testChatEndpoint());
        
        // 测试4: 真实API密钥
        results.push(await this.testWithRealApiKey());
        
        // 总结
        console.log('\n📊 测试结果总结');
        console.log('=' * 60);
        
        const passedTests = results.filter(r => r).length;
        const totalTests = results.length;
        
        console.log(`✅ 通过测试: ${passedTests}/${totalTests}`);
        
        if (passedTests === totalTests) {
            console.log(`🎉 所有测试通过！Netlify代理服务工作正常。`);
        } else {
            console.log(`⚠️ 部分测试失败，请检查Netlify代理服务配置。`);
        }
        
        return passedTests === totalTests;
    }
}

// 运行测试
async function main() {
    const tester = new NetlifyProxyTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('💥 测试过程中发生错误:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = NetlifyProxyTester; 