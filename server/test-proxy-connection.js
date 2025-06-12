#!/usr/bin/env node
/**
 * 代理连接测试工具
 * 用于验证Gemini API在代理环境下的连接性
 */

const proxyConfig = require('./config/proxyConfig');
const PythonGeminiService = require('./services/pythonGeminiService');
require('dotenv').config();

class ProxyTester {
    constructor() {
        this.service = new PythonGeminiService();
    }

    async testDirectConnection() {
        console.log('\n🔍 测试直连模式...');
        
        // 临时清除代理环境变量
        const originalHttpProxy = process.env.HTTP_PROXY;
        const originalHttpsProxy = process.env.HTTPS_PROXY;
        const originalSocksProxy = process.env.SOCKS_PROXY;
        
        delete process.env.HTTP_PROXY;
        delete process.env.HTTPS_PROXY;
        delete process.env.SOCKS_PROXY;
        delete process.env.http_proxy;
        delete process.env.https_proxy;
        delete process.env.socks_proxy;
        
        try {
            const result = await this.service.testConnection();
            
            if (result.success) {
                console.log('✅ 直连模式测试成功');
                console.log(`   响应时间: ${result.responseTime || '未知'}ms`);
            } else {
                console.log('❌ 直连模式测试失败');
                console.log(`   错误信息: ${result.message}`);
            }
            
            return result.success;
            
        } catch (error) {
            console.log('❌ 直连模式测试异常');
            console.log(`   异常信息: ${error.message}`);
            return false;
        } finally {
            // 恢复原始环境变量
            if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy;
            if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy;
            if (originalSocksProxy) process.env.SOCKS_PROXY = originalSocksProxy;
        }
    }

    async testProxyConnection() {
        console.log('\n🔍 测试代理模式...');
        
        const proxyStatus = proxyConfig.getStatus();
        
        if (!proxyStatus.enabled) {
            console.log('⚠️  未配置代理，跳过代理测试');
            return false;
        }
        
        console.log('🔗 代理配置信息:');
        if (proxyStatus.httpProxy) console.log(`   HTTP代理: ${proxyStatus.httpProxy}`);
        if (proxyStatus.httpsProxy) console.log(`   HTTPS代理: ${proxyStatus.httpsProxy}`);
        if (proxyStatus.socksProxy) console.log(`   SOCKS代理: ${proxyStatus.socksProxy}`);
        
        try {
            const startTime = Date.now();
            const result = await this.service.testConnection();
            const endTime = Date.now();
            
            if (result.success) {
                console.log('✅ 代理模式测试成功');
                console.log(`   响应时间: ${endTime - startTime}ms`);
                return true;
            } else {
                console.log('❌ 代理模式测试失败');
                console.log(`   错误信息: ${result.message}`);
                return false;
            }
            
        } catch (error) {
            console.log('❌ 代理模式测试异常');
            console.log(`   异常信息: ${error.message}`);
            return false;
        }
    }

    async testTextGeneration() {
        console.log('\n🔍 测试文本生成功能...');
        
        try {
            const testPrompt = "请简单回答：什么是人工智能？";
            const result = await this.service.analyzeContent(testPrompt, "", {
                model: 'gemini-1.5-flash',
                temperature: 0.7
            });
            
            if (result.success && result.text) {
                console.log('✅ 文本生成测试成功');
                console.log(`   生成内容长度: ${result.text.length}字符`);
                console.log(`   Token使用: ${result.usage?.totalTokens || '未知'}`);
                console.log(`   内容预览: ${result.text.substring(0, 100)}...`);
                return true;
            } else {
                console.log('❌ 文本生成测试失败');
                console.log(`   错误信息: ${result.error || '未知错误'}`);
                return false;
            }
            
        } catch (error) {
            console.log('❌ 文本生成测试异常');
            console.log(`   异常信息: ${error.message}`);
            return false;
        }
    }

    async runFullTest() {
        console.log('🚀 开始代理连接完整测试');
        console.log('='.repeat(50));
        
        // 检查基本配置
        console.log('\n📋 配置检查:');
        console.log(`API密钥: ${process.env.GEMINI_API_KEY ? '已配置' : '❌ 未配置'}`);
        
        const proxyStatus = proxyConfig.getStatus();
        console.log(`代理配置: ${proxyStatus.enabled ? '已启用' : '未启用'}`);
        
        if (!process.env.GEMINI_API_KEY) {
            console.log('\n❌ 错误: 未设置GEMINI_API_KEY环境变量');
            console.log('请在.env文件中配置您的Gemini API密钥');
            return false;
        }
        
        let testResults = {
            direct: false,
            proxy: false,
            textGeneration: false
        };
        
        // 测试直连
        testResults.direct = await this.testDirectConnection();
        
        // 测试代理（如果配置了）
        if (proxyStatus.enabled) {
            testResults.proxy = await this.testProxyConnection();
        }
        
        // 测试文本生成功能
        testResults.textGeneration = await this.testTextGeneration();
        
        // 输出测试总结
        console.log('\n📊 测试结果总结:');
        console.log('='.repeat(50));
        console.log(`直连模式: ${testResults.direct ? '✅ 成功' : '❌ 失败'}`);
        
        if (proxyStatus.enabled) {
            console.log(`代理模式: ${testResults.proxy ? '✅ 成功' : '❌ 失败'}`);
        } else {
            console.log(`代理模式: ⚪ 未配置`);
        }
        
        console.log(`文本生成: ${testResults.textGeneration ? '✅ 成功' : '❌ 失败'}`);
        
        // 建议
        console.log('\n💡 建议:');
        if (!testResults.direct && !testResults.proxy) {
            console.log('- API连接完全失败，请检查网络连接和API密钥');
            console.log('- 如果在受限地区，建议配置代理服务器');
        } else if (testResults.direct && !proxyStatus.enabled) {
            console.log('- 直连工作正常，无需配置代理');
        } else if (!testResults.direct && testResults.proxy) {
            console.log('- 直连失败但代理成功，建议在生产环境中使用代理');
        } else if (testResults.direct && testResults.proxy) {
            console.log('- 直连和代理都工作正常，可根据需要选择');
        }
        
        return testResults.direct || testResults.proxy;
    }
}

// 主执行函数
async function main() {
    const tester = new ProxyTester();
    
    try {
        const success = await tester.runFullTest();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n💥 测试过程中发生异常:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = ProxyTester; 