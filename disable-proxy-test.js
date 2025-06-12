/**
 * 临时禁用代理的 Gemini 测试脚本
 */

require('dotenv').config({ path: './server/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testWithoutProxy() {
    console.log('🔧 测试 Gemini API（禁用代理）...');
    console.log(`API Key: ${process.env.GEMINI_API_KEY ? '✅ 已设置' : '❌ 未设置'}`);
    
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ 请先设置 GEMINI_API_KEY');
        return;
    }
    
    try {
        // 不使用代理，直接连接
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        console.log('📡 发送测试请求...');
        const result = await model.generateContent('请用中文简单问候一下');
        const response = result.response;
        const text = response.text();
        
        console.log('✅ 测试成功！');
        console.log('📝 响应:', text);
        
        return true;
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        
        if (error.message.includes('fetch failed')) {
            console.log('💡 网络连接问题，可能需要：');
            console.log('   1. 使用 VPN');
            console.log('   2. 配置有效的代理服务器');
            console.log('   3. 检查网络防火墙设置');
        }
        
        return false;
    }
}

// 运行测试
testWithoutProxy(); 