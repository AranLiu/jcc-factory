const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY 环境变量未设置');
        }
        
        // 临时禁用代理，使用直连模式（因为Python脚本显示网络连接正常）
        console.log('初始化 Gemini 服务（直连模式）');
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // 从环境变量读取模型配置
        this.defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash';
        this.availableModels = process.env.GEMINI_AVAILABLE_MODELS ? 
            process.env.GEMINI_AVAILABLE_MODELS.split(',') : 
            ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        
        console.log('可用模型:', this.availableModels);
        console.log('默认模型:', this.defaultModel);
    }

    async analyzeContent(prompt, content, modelConfig = {}) {
        try {
            const selectedModel = modelConfig.model || this.defaultModel;
            console.log('使用模型:', selectedModel, '温度:', modelConfig.temperature || 0.7);
            
            const model = this.genAI.getGenerativeModel({ 
                model: selectedModel,
                generationConfig: {
                    temperature: modelConfig.temperature || 0.7,
                    topK: modelConfig.topK || 40,
                    topP: modelConfig.topP || 0.95,
                    maxOutputTokens: modelConfig.maxOutputTokens || 8192,
                }
            });

            const fullPrompt = `${prompt}\n\n内容：${content}`;
            
            const result = await model.generateContent(fullPrompt);
            const response = result.response;
            const usageMetadata = result.response.usageMetadata;
            
            return {
                success: true,
                text: response.text(),
                usage: {
                    promptTokens: usageMetadata.promptTokenCount,
                    completionTokens: usageMetadata.candidatesTokenCount,
                    totalTokens: usageMetadata.totalTokenCount
                }
            };
        } catch (error) {
            console.error('Gemini API 调用失败:', error);
            
            if (error.message?.includes('API_KEY')) {
                throw new Error('API密钥无效或已过期');
            } else if (error.message?.includes('QUOTA')) {
                throw new Error('API配额已用完');
            } else if (error.message?.includes('SAFETY')) {
                throw new Error('内容被安全过滤器拦截');
            } else {
                throw new Error(`AI分析失败: ${error.message}`);
            }
        }
    }

    async analyzeVideo(prompt, videoInfo, modelConfig = {}) {
        try {
            // 检查是否支持真实的视频分析
            if (this.supportsVideoAnalysis()) {
                return await this.analyzeVideoWithGemini(prompt, videoInfo, modelConfig);
            } else {
                // 回退到基于文件信息的分析
                const videoPrompt = `
                    请分析以下视频信息：
                    文件名: ${videoInfo.originalName}
                    文件大小: ${this.formatFileSize(videoInfo.fileSize)}
                    时长: ${videoInfo.duration || '未知'}
                    
                    用户要求: ${prompt}
                    
                    请基于视频的基本信息和用户需求，提供相应的分析和建议。
                    注意：由于技术限制，目前无法直接分析视频内容，请根据文件信息进行推断性分析。
                `;

                return await this.analyzeContent(videoPrompt, '', modelConfig);
            }
        } catch (error) {
            throw error;
        }
    }

    supportsVideoAnalysis() {
        // 检查是否支持视频分析功能
        try {
            const genaiModule = require('@google/generative-ai');
            return !!(genaiModule.createUserContent && genaiModule.createPartFromUri);
        } catch {
            return false;
        }
    }

    async analyzeVideoWithGemini(prompt, videoInfo, modelConfig = {}) {
        try {
            console.log('🎥 使用 Gemini 视频分析功能');
            
            // 使用新的API方式（基于官方文档）
            const model = this.genAI.getGenerativeModel({ 
                model: 'gemini-1.5-flash' // 1.5版本支持视频
            });

            // 构建包含视频的请求
            const result = await model.generateContent([
                {
                    text: `${prompt}\n\n请分析这个视频并根据用户要求提供分析结果。`
                },
                {
                    inlineData: {
                        mimeType: videoInfo.mimeType || 'video/mp4',
                        data: videoInfo.base64Data // 需要base64编码的视频数据
                    }
                }
            ]);

            const response = result.response;
            return {
                success: true,
                text: response.text(),
                usage: {
                    promptTokens: response.usageMetadata?.promptTokenCount || 0,
                    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: response.usageMetadata?.totalTokenCount || 0
                }
            };

        } catch (error) {
            console.error('视频分析失败，回退到基本分析:', error.message);
            // 如果视频分析失败，回退到基本分析
            throw error;
        }
    }

    async analyzeNovel(prompt, textContent, modelConfig = {}) {
        try {
            // 如果文本太长，进行分块处理
            const maxLength = 30000; // 约30k字符
            
            if (textContent.length <= maxLength) {
                return await this.analyzeContent(prompt, textContent, modelConfig);
            } else {
                // 分块处理长文本
                const chunks = this.splitText(textContent, maxLength);
                const results = [];
                
                for (let i = 0; i < chunks.length; i++) {
                    const chunkPrompt = `${prompt}\n\n这是文本的第${i + 1}部分（共${chunks.length}部分）：`;
                    const result = await this.analyzeContent(chunkPrompt, chunks[i], modelConfig);
                    results.push(result);
                    
                    // 避免API调用过快
                    if (i < chunks.length - 1) {
                        await this.delay(1000);
                    }
                }
                
                // 合并结果
                const combinedText = results.map((r, i) => `第${i + 1}部分分析：\n${r.text}`).join('\n\n');
                
                return {
                    success: true,
                    text: combinedText,
                    usage: {
                        promptTokens: results.reduce((sum, r) => sum + r.usage.promptTokens, 0),
                        completionTokens: results.reduce((sum, r) => sum + r.usage.completionTokens, 0),
                        totalTokens: results.reduce((sum, r) => sum + r.usage.totalTokens, 0)
                    }
                };
            }
        } catch (error) {
            throw error;
        }
    }

    splitText(text, maxLength) {
        const chunks = [];
        let currentChunk = '';
        const sentences = text.split(/[。！？\n]/);
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    // 如果单个句子就超长，强制分割
                    chunks.push(sentence.substring(0, maxLength));
                    currentChunk = sentence.substring(maxLength);
                }
            } else {
                currentChunk += sentence + '。';
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 新增：整合剧本的方法
    async integrateScript(prompt, draftContent, modelConfig = {}) {
        try {
            const model = this.genAI.getGenerativeModel({
                model: modelConfig.model || 'gemini-1.5-flash',
                generationConfig: {
                    temperature: modelConfig.temperature || 0.7,
                    topK: modelConfig.topK || 40,
                    topP: modelConfig.topP || 0.95,
                    maxOutputTokens: modelConfig.maxOutputTokens || 8192,
                }
            });

            // 构建一个更适合整合任务的Prompt
            const fullPrompt = `
                **任务：剧本整合**

                **整合要求 (用户指令):**
                ${prompt}

                ---

                **待整合的剧本草稿内容:**
                ${draftContent}

                ---

                请严格按照用户的整合要求，对以上草稿内容进行处理，生成一个完整、连贯的最终剧本。
            `;

            const result = await model.generateContent(fullPrompt);
            const response = result.response;
            const usageMetadata = result.response.usageMetadata;

            return {
                success: true,
                text: response.text(),
                usage: {
                    promptTokens: usageMetadata.promptTokenCount,
                    completionTokens: usageMetadata.candidatesTokenCount,
                    totalTokens: usageMetadata.totalTokenCount
                }
            };
        } catch (error) {
            console.error('Gemini 剧本整合调用失败:', error);
             if (error.message?.includes('SAFETY')) {
                throw new Error('内容因安全问题被模型拒绝。请检查草稿内容和指令，避免不当信息。');
            } else {
                throw new Error(`AI整合失败: ${error.message}`);
            }
        }
    }

    // 验证API密钥
    async testConnection() {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent('测试连接');
            return { success: true, message: 'Gemini API连接正常' };
        } catch (error) {
            return { success: false, message: `Gemini API连接失败: ${error.message}` };
        }
    }
}

module.exports = GeminiService; 