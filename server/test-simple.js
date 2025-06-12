// 简单测试脚本
require('dotenv').config();

async function testServices() {
    console.log('🧪 测试简化版本的服务...\n');
    
    try {
        // 1. 测试直连服务
        console.log('1️⃣ 测试直连服务...');
        const smartGeminiService = require('./services/smartGeminiService');
        
        // 强制使用直连模式
        smartGeminiService.setPreference(false, false);
        
        const directResult = await smartGeminiService.processText('请用中文回复：你好', {
            model: 'gpt-3.5-turbo',
            temperature: 0.7
        });
        
        console.log('直连结果:', directResult);
        console.log('');
        
        // 2. 测试代理服务（如果可用）
        console.log('2️⃣ 测试代理服务...');
        
        // 启动代理服务
        const geminiProxyService = require('./services/geminiProxyService');
        const proxyStarted = await geminiProxyService.startProxy();
        
        if (proxyStarted) {
            console.log('✅ 代理服务启动成功');
            
            // 等待服务启动
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 强制使用代理模式
            smartGeminiService.setPreference(true, false);
            
            const proxyResult = await smartGeminiService.processText('请用中文回复：你好', {
                model: 'gpt-3.5-turbo',
                temperature: 0.7
            });
            
            console.log('代理结果:', proxyResult);
            
            // 停止代理服务
            await geminiProxyService.stopProxy();
            console.log('✅ 代理服务已停止');
        } else {
            console.log('⚠️ 代理服务启动失败或跳过');
        }
        
        console.log('\n🎉 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testServices(); 