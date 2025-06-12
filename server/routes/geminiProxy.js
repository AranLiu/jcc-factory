const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const geminiProxyService = require('../services/geminiProxyService');

/**
 * 获取代理服务状态
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = geminiProxyService.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('获取代理状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取代理状态失败',
            error: error.message
        });
    }
});

/**
 * 启动代理服务
 */
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const result = await geminiProxyService.startProxy();
        
        if (result) {
            res.json({
                success: true,
                message: 'Gemini代理服务启动成功',
                data: geminiProxyService.getStatus()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Gemini代理服务启动失败'
            });
        }
    } catch (error) {
        console.error('启动代理服务失败:', error);
        res.status(500).json({
            success: false,
            message: '启动代理服务失败',
            error: error.message
        });
    }
});

/**
 * 停止代理服务
 */
router.post('/stop', authenticateToken, async (req, res) => {
    try {
        const result = await geminiProxyService.stopProxy();
        
        if (result) {
            res.json({
                success: true,
                message: 'Gemini代理服务停止成功',
                data: geminiProxyService.getStatus()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Gemini代理服务停止失败'
            });
        }
    } catch (error) {
        console.error('停止代理服务失败:', error);
        res.status(500).json({
            success: false,
            message: '停止代理服务失败',
            error: error.message
        });
    }
});

/**
 * 重启代理服务
 */
router.post('/restart', authenticateToken, async (req, res) => {
    try {
        const result = await geminiProxyService.restartProxy();
        
        if (result) {
            res.json({
                success: true,
                message: 'Gemini代理服务重启成功',
                data: geminiProxyService.getStatus()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Gemini代理服务重启失败'
            });
        }
    } catch (error) {
        console.error('重启代理服务失败:', error);
        res.status(500).json({
            success: false,
            message: '重启代理服务失败',
            error: error.message
        });
    }
});

/**
 * 测试代理连接
 */
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const status = geminiProxyService.getStatus();
        
        if (!status.running) {
            return res.status(400).json({
                success: false,
                message: 'Gemini代理服务未运行'
            });
        }

        // 使用fetch测试代理端点
        const fetch = (await import('node-fetch')).default;
        const testUrl = `${status.url}/health`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({
                success: true,
                message: '代理连接测试成功',
                data: {
                    proxyStatus: status,
                    testResponse: data,
                    responseTime: Date.now()
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: '代理连接测试失败',
                error: `HTTP ${response.status}: ${response.statusText}`
            });
        }
    } catch (error) {
        console.error('测试代理连接失败:', error);
        res.status(500).json({
            success: false,
            message: '测试代理连接失败',
            error: error.message
        });
    }
});

/**
 * 获取代理使用说明
 */
router.get('/docs', authenticateToken, (req, res) => {
    try {
        const status = geminiProxyService.getStatus();
        
        const docs = {
            overview: '本地Gemini代理服务提供OpenAI兼容的API接口',
            baseUrl: status.url,
            endpoints: {
                chatCompletions: {
                    url: status.endpoints.chat,
                    method: 'POST',
                    description: '聊天完成接口，兼容OpenAI Chat Completions API',
                    example: {
                        model: 'gpt-3.5-turbo',
                        messages: [
                            { role: 'user', content: 'Hello, how are you?' }
                        ],
                        temperature: 0.7
                    }
                },
                embeddings: {
                    url: status.endpoints.embeddings,
                    method: 'POST',
                    description: '文本嵌入接口，兼容OpenAI Embeddings API',
                    example: {
                        model: 'text-embedding-ada-002',
                        input: 'This is a test sentence.'
                    }
                },
                models: {
                    url: status.endpoints.models,
                    method: 'GET',
                    description: '获取可用模型列表'
                }
            },
            modelMapping: {
                'gpt-3.5-turbo': 'gemini-1.5-flash',
                'gpt-4': 'gemini-1.5-pro',
                'gpt-4-turbo': 'gemini-1.5-pro',
                'gpt-4o': 'gemini-2.0-flash-exp',
                'text-embedding-ada-002': 'text-embedding-004'
            },
            usage: {
                authorization: '使用您的Gemini API密钥作为Bearer token',
                contentType: 'application/json',
                pythonExample: `
import openai

# 配置客户端使用本地代理
client = openai.OpenAI(
    api_key="你的Gemini API密钥",
    base_url="${status.url}/v1"
)

# 发送聊天请求
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
                `.trim()
            }
        };
        
        res.json({
            success: true,
            data: docs
        });
    } catch (error) {
        console.error('获取代理文档失败:', error);
        res.status(500).json({
            success: false,
            message: '获取代理文档失败',
            error: error.message
        });
    }
});

module.exports = router; 