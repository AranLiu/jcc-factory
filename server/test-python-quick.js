const PythonGeminiService = require('./services/pythonGeminiService');
require('dotenv').config();

async function quickTest() {
    console.log('🚀 快速测试Python Gemini服务');
    
    try {
        const service = new PythonGeminiService();
        
        console.log('\n📡 测试连接...');
        const result = await service.testConnection();
        
        if (result.success) {
            console.log('✅ 连接成功！');
            console.log('📝 响应:', result.response);
        } else {
            console.log('❌ 连接失败:', result.message);
        }
        
    } catch (error) {
        console.error('💥 测试失败:', error.message);
    }
}

quickTest(); 