const PythonGeminiService = require('./services/pythonGeminiService');
require('dotenv').config();

async function debugTest() {
    console.log('🔍 调试Python输出');
    
    try {
        const service = new PythonGeminiService();
        
        console.log('\n测试简单文本生成...');
        const result = await service.testConnection();
        
        console.log('✅ 结果:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        console.error('完整错误:', error);
    }
}

debugTest(); 