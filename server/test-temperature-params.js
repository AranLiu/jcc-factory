const PythonGeminiService = require('./services/pythonGeminiService');

async function testTemperatureParams() {
    console.log('🧪 测试温度参数传递...');
    
    try {
        const service = new PythonGeminiService();
        
        // 测试模型配置
        console.log('\n📊 当前模型配置:');
        console.log('默认模型:', service.defaultModel);
        console.log('可用模型:', service.availableModels);
        
        // 测试不同温度值
        const testConfigs = [
            { model: 'gemini-1.5-flash', temperature: 0.3 },
            { model: 'gemini-1.5-flash', temperature: 1.0 },
            { model: 'gemini-1.5-flash', temperature: 1.8 },
        ];
        
        for (const config of testConfigs) {
            console.log(`\n🔬 测试配置: 模型=${config.model}, 温度=${config.temperature}`);
            
            try {
                const result = await service.analyzeContent(
                    "请简短回答：1+1等于多少？",
                    "",
                    config
                );
                
                if (result.success) {
                    console.log('✅ 成功:', result.text.substring(0, 100) + '...');
                } else {
                    console.log('❌ 失败:', result.error || result.message);
                }
            } catch (error) {
                console.log('❌ 错误:', error.message);
            }
        }
        
    } catch (error) {
        console.error('🚨 测试失败:', error.message);
    }
}

// 运行测试
testTemperatureParams().then(() => {
    console.log('\n✨ 测试完成');
    process.exit(0);
}).catch(error => {
    console.error('🚨 测试异常:', error);
    process.exit(1);
}); 