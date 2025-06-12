const smartGeminiService = require('./services/smartGeminiService');
const geminiProxyService = require('./services/geminiProxyService');

async function testProxyIntegration() {
    console.log('🧪 开始测试Gemini代理集成...\n');
    
    try {
        // 1. 测试代理服务状态
        console.log('1️⃣ 检查代理服务状态...');
        const proxyStatus = geminiProxyService.getStatus();
        console.log('   代理状态:', proxyStatus.running ? '✅ 运行中' : '❌ 未运行');
        console.log('   代理地址:', proxyStatus.url);
        console.log('   代理端点:', proxyStatus.endpoints.chat);
        console.log('');
        
        // 2. 测试智能服务状态
        console.log('2️⃣ 检查智能服务状态...');
        const smartStatus = smartGeminiService.getStatus();
        console.log('   优先代理:', smartStatus.preferProxy ? '✅ 是' : '❌ 否');
        console.log('   启用回退:', smartStatus.proxyFallbackEnabled ? '✅ 是' : '❌ 否');
        console.log('   API密钥配置:', smartStatus.directService.apiKey ? '✅ 已配置' : '❌ 未配置');
        console.log('');
        
        // 3. 测试连接能力
        console.log('3️⃣ 测试连接能力...');
        const connectionTest = await smartGeminiService.testConnection();
        console.log('   连接测试结果:', connectionTest.success ? '✅ 成功' : '❌ 失败');
        console.log('   推荐方案:', connectionTest.message);
        console.log('   详细结果:');
        console.log('     - 代理连接:', connectionTest.details.proxy?.success ? '✅ 成功' : '❌ 失败');
        console.log('     - 直连:', connectionTest.details.direct?.success ? '✅ 成功' : '❌ 失败');
        console.log('');
        
        // 4. 测试文本处理
        console.log('4️⃣ 测试文本处理...');
        const textResult = await smartGeminiService.processText('请用中文回复：你好', {
            model: 'gpt-3.5-turbo',
            temperature: 0.7
        });
        
        console.log('   文本处理结果:', textResult.success ? '✅ 成功' : '❌ 失败');
        console.log('   使用方法:', textResult.method || '未知');
        console.log('   是否回退:', textResult.fallback ? '是' : '否');
        if (textResult.success) {
            console.log('   AI响应:', textResult.text?.substring(0, 50) + '...');
        } else {
            console.log('   错误信息:', textResult.error);
        }
        console.log('');
        
        // 5. 生成测试总结
        console.log('📊 测试总结:');
        console.log('=====================================');
        
        if (proxyStatus.running && connectionTest.details.proxy?.success) {
            console.log('✅ 代理服务正常，推荐使用代理模式');
        } else if (connectionTest.details.direct?.success) {
            console.log('⚠️ 代理服务异常，但直连可用');
        } else {
            console.log('❌ 所有连接方式都失败，请检查配置');
        }
        
        console.log('\n🎯 使用建议:');
        console.log('- 代理地址: http://localhost:8080');
        console.log('- OpenAI兼容端点: http://localhost:8080/v1/chat/completions');
        console.log('- 模型映射: gpt-3.5-turbo → gemini-1.5-flash');
        console.log('- Python代理脚本: openai_proxy_service.py');
        console.log('- 智能路由: 自动选择最佳连接方式');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 运行测试
testProxyIntegration().then(() => {
    console.log('\n🏁 测试完成');
    process.exit(0);
}).catch(error => {
    console.error('💥 测试异常:', error);
    process.exit(1);
}); 