const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const systemConfigService = require('./systemConfigService');

class GeminiProxyService {
    constructor() {
        this.proxyApp = null;
        this.proxyServer = null;
        this.proxyPort = 8080;
        this.isRunning = false;
    }

    /**
     * 检查端口是否可用
     */
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                } else {
                    resolve(false);
                }
            });
            
            server.once('listening', () => {
                server.close(() => {
                    resolve(true);
                });
            });
            
            server.listen(port);
        });
    }

    /**
     * 启动Gemini代理服务器
     */
    async startProxy() {
        try {
            if (this.isRunning) {
                console.log('🔄 Gemini代理服务已在运行');
                return true;
            }

            // 获取API密钥
            const apiKey = await systemConfigService.getConfig('gemini_api_key');
            if (!apiKey) {
                console.warn('⚠️ 未配置Gemini API密钥，跳过代理服务启动');
                return false;
            }

            // 检查端口是否可用
            const isAvailable = await this.isPortAvailable(this.proxyPort);
            if (!isAvailable) {
                console.warn(`⚠️ 端口 ${this.proxyPort} 已被占用，尝试下一个端口`);
                this.proxyPort = 8081;
                const nextAvailable = await this.isPortAvailable(this.proxyPort);
                if (!nextAvailable) {
                    console.warn(`⚠️ 端口 ${this.proxyPort} 也被占用，跳过代理服务启动`);
                    return false;
                }
            }

            // 创建Express应用
            this.proxyApp = express();
            
            // 设置CORS
            this.proxyApp.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                } else {
                    next();
                }
            });

            // 健康检查端点
            this.proxyApp.get('/health', (req, res) => {
                res.json({ 
                    status: 'ok', 
                    service: 'gemini-proxy',
                    port: this.proxyPort,
                    timestamp: new Date().toISOString()
                });
            });

            // OpenAI兼容的聊天完成端点
            this.proxyApp.post('/v1/chat/completions', async (req, res) => {
                try {
                    await this.handleChatCompletion(req, res, apiKey);
                } catch (error) {
                    console.error('聊天完成代理错误:', error);
                    res.status(500).json({
                        error: {
                            message: error.message,
                            type: 'proxy_error'
                        }
                    });
                }
            });

            // OpenAI兼容的嵌入端点
            this.proxyApp.post('/v1/embeddings', async (req, res) => {
                try {
                    await this.handleEmbeddings(req, res, apiKey);
                } catch (error) {
                    console.error('嵌入代理错误:', error);
                    res.status(500).json({
                        error: {
                            message: error.message,
                            type: 'proxy_error'
                        }
                    });
                }
            });

            // 模型列表端点
            this.proxyApp.get('/v1/models', (req, res) => {
                this.handleModels(req, res);
            });

            // 启动服务器
            this.proxyServer = this.proxyApp.listen(this.proxyPort, () => {
                console.log(`🚀 Gemini代理服务启动成功: http://localhost:${this.proxyPort}`);
                console.log(`📝 OpenAI兼容端点: http://localhost:${this.proxyPort}/v1/chat/completions`);
                this.isRunning = true;
            });

            return true;
        } catch (error) {
            console.error('启动Gemini代理服务失败:', error);
            return false;
        }
    }

    /**
     * 处理聊天完成请求
     */
    async handleChatCompletion(req, res, apiKey) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        
        try {
            const { model, messages, temperature = 0.7, max_tokens = 1000, stream = false } = req.body;
            
            // 模型映射
            const modelMapping = {
                'gpt-3.5-turbo': 'gemini-1.5-flash',
                'gpt-4': 'gemini-1.5-pro',
                'gpt-4-turbo': 'gemini-1.5-pro',
                'gpt-4o': 'gemini-2.0-flash-exp'
            };
            
            const geminiModel = modelMapping[model] || 'gemini-1.5-flash';
            
            // 初始化Gemini客户端
            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiClient = genAI.getGenerativeModel({ model: geminiModel });
            
            // 转换消息格式
            const prompt = this.convertMessagesToPrompt(messages);
            
            // 生成内容
            const result = await geminiClient.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: max_tokens,
                }
            });
            
            const response = await result.response;
            const text = response.text();
            
            // 返回OpenAI格式的响应
            const openaiResponse = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: text
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: prompt.length,
                    completion_tokens: text.length,
                    total_tokens: prompt.length + text.length
                }
            };
            
            res.json(openaiResponse);
            
        } catch (error) {
            throw new Error(`Gemini API调用失败: ${error.message}`);
        }
    }

    /**
     * 处理嵌入请求
     */
    async handleEmbeddings(req, res, apiKey) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        
        try {
            const { input, model = 'text-embedding-ada-002' } = req.body;
            
            const genAI = new GoogleGenerativeAI(apiKey);
            const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
            
            const texts = Array.isArray(input) ? input : [input];
            const embeddings = [];
            
            for (const text of texts) {
                const result = await embeddingModel.embedContent(text);
                embeddings.push({
                    object: 'embedding',
                    embedding: result.embedding.values,
                    index: embeddings.length
                });
            }
            
            res.json({
                object: 'list',
                data: embeddings,
                model: model,
                usage: {
                    prompt_tokens: texts.join('').length,
                    total_tokens: texts.join('').length
                }
            });
            
        } catch (error) {
            throw new Error(`Gemini嵌入API调用失败: ${error.message}`);
        }
    }

    /**
     * 处理模型列表请求
     */
    handleModels(req, res) {
        const models = [
            {
                id: 'gpt-3.5-turbo',
                object: 'model',
                created: 1677610602,
                owned_by: 'openai',
                permission: [],
                root: 'gpt-3.5-turbo',
                parent: null
            },
            {
                id: 'gpt-4',
                object: 'model',
                created: 1687882411,
                owned_by: 'openai',
                permission: [],
                root: 'gpt-4',
                parent: null
            },
            {
                id: 'gpt-4-turbo',
                object: 'model',
                created: 1712361441,
                owned_by: 'openai',
                permission: [],
                root: 'gpt-4-turbo',
                parent: null
            },
            {
                id: 'text-embedding-ada-002',
                object: 'model',
                created: 1671217299,
                owned_by: 'openai',
                permission: [],
                root: 'text-embedding-ada-002',
                parent: null
            }
        ];
        
        res.json({
            data: models,
            object: 'list'
        });
    }

    /**
     * 将OpenAI消息格式转换为Gemini提示
     */
    convertMessagesToPrompt(messages) {
        return messages.map(msg => {
            if (msg.role === 'system') {
                return `System: ${msg.content}`;
            } else if (msg.role === 'user') {
                return `User: ${msg.content}`;
            } else if (msg.role === 'assistant') {
                return `Assistant: ${msg.content}`;
            }
            return msg.content;
        }).join('\n\n');
    }

    /**
     * 停止代理服务器
     */
    async stopProxy() {
        try {
            if (this.proxyServer) {
                this.proxyServer.close();
                this.proxyServer = null;
                this.proxyApp = null;
                this.isRunning = false;
                console.log('🛑 Gemini代理服务已停止');
                return true;
            }
            return true;
        } catch (error) {
            console.error('停止Gemini代理服务失败:', error);
            return false;
        }
    }

    /**
     * 重启代理服务器
     */
    async restartProxy() {
        await this.stopProxy();
        return await this.startProxy();
    }

    /**
     * 获取代理状态
     */
    getStatus() {
        return {
            running: this.isRunning,
            port: this.proxyPort,
            url: `http://localhost:${this.proxyPort}`,
            endpoints: {
                chat: `http://localhost:${this.proxyPort}/v1/chat/completions`,
                embeddings: `http://localhost:${this.proxyPort}/v1/embeddings`,
                models: `http://localhost:${this.proxyPort}/v1/models`,
                health: `http://localhost:${this.proxyPort}/health`
            }
        };
    }
}

module.exports = new GeminiProxyService(); 