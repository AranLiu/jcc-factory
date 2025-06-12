const PythonGeminiService = require('./services/pythonGeminiService');
require('dotenv').config();

async function testPythonCall() {
    console.log('🔧 测试Python服务调用');
    console.log('API Key:', process.env.GEMINI_API_KEY ? '已设置' : '未设置');
    
    try {
        const service = new PythonGeminiService();
        
        console.log('\n📝 测试文本生成...');
        const result = await service.analyzeContent(
            '分析这个内容',
            '这是一个测试内容，请简单分析一下。',
            {}
        );
        
        console.log('✅ 结果:', result);
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        console.error('完整错误:', error);
    }
}

testPythonCall(); 