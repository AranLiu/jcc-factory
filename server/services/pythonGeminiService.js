const { spawn } = require('child_process');
const path = require('path');
const proxyConfig = require('../config/proxyConfig');
require('dotenv').config();

class PythonGeminiService {
    constructor() {
        this.pythonServicePath = path.join(__dirname, '../python_services/gemini_service_simple.py');
        this.pythonCommand = process.env.PYTHON_COMMAND || 'python';
        
        // 从环境变量读取模型配置
        this.defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash';
        this.availableModels = process.env.GEMINI_AVAILABLE_MODELS ? 
            process.env.GEMINI_AVAILABLE_MODELS.split(',') : 
            ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        
        console.log('🐍 初始化 Python Gemini 服务包装器');
        console.log(`   Python脚本路径: ${this.pythonServicePath}`);
        console.log(`   Python命令: ${this.pythonCommand}`);
        console.log('   可用模型:', this.availableModels);
        console.log('   默认模型:', this.defaultModel);
        
        // 显示代理配置状态
        const proxyStatus = proxyConfig.getStatus();
        if (proxyStatus.enabled) {
            console.log('🔗 代理配置已启用:');
            if (proxyStatus.httpProxy) console.log(`   HTTP代理: ${proxyStatus.httpProxy}`);
            if (proxyStatus.httpsProxy) console.log(`   HTTPS代理: ${proxyStatus.httpsProxy}`);
            if (proxyStatus.socksProxy) console.log(`   SOCKS代理: ${proxyStatus.socksProxy}`);
        } else {
            console.log('🔗 未配置代理，使用直连模式');
        }
    }

    async callPythonService(command, args = []) {
        return new Promise((resolve, reject) => {
            const fullArgs = [this.pythonServicePath, command, ...args];
            
            console.log(`🔄 执行Python命令: ${this.pythonCommand} ${fullArgs.join(' ')}`);
            
            // 准备环境变量，包含代理配置
            const pythonEnv = {
                ...process.env,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY,
                PYTHONIOENCODING: 'utf-8',
                PYTHONLEGACYWINDOWSSTDIO: '0',
                ...proxyConfig.getPythonProxyEnv()
            };
            
            // 如果启用了调试模式，添加调试环境变量
            if (process.env.GEMINI_DEBUG === 'true') {
                pythonEnv.GEMINI_DEBUG = 'true';
            }
            
            const pythonProcess = spawn(this.pythonCommand, fullArgs, {
                env: pythonEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
                encoding: 'utf8'
            });

            // 设置15分钟超时
            const timeout = setTimeout(() => {
                pythonProcess.kill('SIGTERM');
                reject(new Error('Python进程执行超时（15分钟）'));
            }, 15 * 60 * 1000);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.setEncoding('utf8');
            pythonProcess.stderr.setEncoding('utf8');

            pythonProcess.stdout.on('data', (data) => {
                output += data;
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data;
            });

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    try {
                        // 清理输出并查找JSON
                        const cleanOutput = output.trim();
                        const lines = cleanOutput.split('\n');
                        
                        // 找到最后一行包含JSON的内容
                        let jsonLine = '';
                        for (let i = lines.length - 1; i >= 0; i--) {
                            const line = lines[i].trim();
                            if (line.startsWith('{') && line.includes('"success"')) {
                                jsonLine = line;
                                break;
                            }
                        }
                        
                        if (jsonLine) {
                            const result = JSON.parse(jsonLine);
                            resolve(result);
                        } else {
                            // 如果没有找到JSON行，尝试整个输出
                            if (cleanOutput.startsWith('{') && cleanOutput.endsWith('}')) {
                                const result = JSON.parse(cleanOutput);
                                resolve(result);
                            } else {
                                resolve({
                                    success: false,
                                    error: '未找到有效的JSON输出',
                                    raw_output: output,
                                    stderr: errorOutput
                                });
                            }
                        }
                        
                    } catch (parseError) {
                        console.error('JSON解析错误:', parseError.message);
                        console.error('原始输出:', output);
                        console.error('错误输出:', errorOutput);
                        resolve({
                            success: false,
                            error: `JSON解析失败: ${parseError.message}`,
                            raw_output: output,
                            stderr: errorOutput
                        });
                    }
                } else {
                    reject(new Error(`Python进程退出，代码: ${code}\n错误输出: ${errorOutput}\n标准输出: ${output}`));
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Python进程错误: ${error.message}`));
            });
        });
    }

    async analyzeVideo(prompt, videoInfo, modelConfig = {}) {
        try {
            console.log('🎥 开始视频分析（Python）');
            
            // 构建视频文件路径
            const videoPath = videoInfo.path || videoInfo.filePath;
            if (!videoPath) {
                throw new Error('视频文件路径未提供');
            }
            
            console.log('📁 视频文件路径:', videoPath);
            console.log('💬 分析提示词:', prompt);
            console.log('🔧 模型配置:', modelConfig);
            
            const args = [videoPath];
            if (prompt) {
                args.push(prompt);
            }
            
            // 添加模型配置参数
            if (Object.keys(modelConfig).length > 0) {
                args.push(JSON.stringify(modelConfig));
            }
            
            console.log('🔧 Python命令参数:', args);
            const result = await this.callPythonService('video', args);
            
            if (result.success) {
                return {
                    success: true,
                    text: result.text,
                    usage: result.usage || {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            } else {
                throw new Error(result.error || '视频分析失败');
            }
            
        } catch (error) {
            console.error('Python视频分析失败:', error.message);
            throw new Error(`AI分析失败: ${error.message}`);
        }
    }

    async analyzeContent(prompt, content, modelConfig = {}) {
        try {
            console.log('📝 开始内容分析（Python）');
            console.log('🔧 模型配置:', modelConfig);
            
            const fullPrompt = `${prompt}\n\n内容：${content}`;
            const systemInstruction = modelConfig.systemInstruction || null;
            
            const args = [fullPrompt];
            if (systemInstruction) {
                args.push(systemInstruction);
            }
            
            // 添加模型配置参数
            if (Object.keys(modelConfig).length > 0) {
                args.push(JSON.stringify(modelConfig));
            }
            
            const result = await this.callPythonService('text', args);
            
            if (result.success) {
                return {
                    success: true,
                    text: result.text,
                    usage: {
                        promptTokens: result.usage?.prompt_tokens || 0,
                        completionTokens: result.usage?.completion_tokens || 0,
                        totalTokens: result.usage?.total_tokens || 0
                    }
                };
            } else {
                throw new Error(result.error || '内容分析失败');
            }
            
        } catch (error) {
            console.error('Python内容分析失败:', error.message);
            throw new Error(`AI分析失败: ${error.message}`);
        }
    }

    async analyzeNovel(prompt, textContent, modelConfig = {}) {
        try {
            console.log('📚 开始小说分析（Python）');
            
            const args = [textContent, prompt];
            const result = await this.callPythonService('novel', args);
            
            if (result.success) {
                return {
                    success: true,
                    text: result.text,
                    usage: {
                        promptTokens: result.usage?.prompt_tokens || 0,
                        completionTokens: result.usage?.completion_tokens || 0,
                        totalTokens: result.usage?.total_tokens || 0
                    }
                };
            } else {
                throw new Error(result.error || '小说分析失败');
            }
            
        } catch (error) {
            console.error('Python小说分析失败:', error.message);
            throw error;
        }
    }

    async integrateScript(integrationPrompt, draftContent, modelConfig = {}) {
        try {
            console.log('📝 开始剧本整合（Python）');
            console.log('🔧 模型配置:', modelConfig);
            
            const fullPrompt = `**任务：剧本整合**

**整合要求 (用户指令):**
${integrationPrompt}

---

**待整合的剧本草稿内容:**
${draftContent}

---

请严格按照用户的整合要求，对以上草稿内容进行处理。`;
            
            const systemInstruction = modelConfig.systemInstruction || "You are a professional script writer and editor.";
            
            const args = [fullPrompt];
            if (systemInstruction) {
                args.push(systemInstruction);
            }
            
            // 添加模型配置参数
            if (Object.keys(modelConfig).length > 0) {
                args.push(JSON.stringify(modelConfig));
            }
            
            const result = await this.callPythonService('text', args);
            
            if (result.success) {
                return {
                    success: true,
                    text: result.text,
                    usage: {
                        promptTokens: result.usage?.prompt_tokens || 0,
                        completionTokens: result.usage?.completion_tokens || 0,
                        totalTokens: result.usage?.total_tokens || 0
                    }
                };
            } else {
                throw new Error(result.error || '剧本整合失败');
            }
            
        } catch (error) {
            console.error('Python剧本整合失败:', error.message);
            throw new Error(`剧本整合失败: ${error.message}`);
        }
    }

    async testConnection() {
        try {
            console.log('🔧 测试Python Gemini连接');
            
            const result = await this.callPythonService('text', ['Hello, please respond in Chinese with a greeting.']);
            
            if (result.success) {
                return {
                    success: true,
                    message: 'Python Gemini API连接正常',
                    response: result.text
                };
            } else {
                return {
                    success: false,
                    message: `Python Gemini API连接失败: ${result.error}`,
                    error: result.error
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Python Gemini API连接失败: ${error.message}`,
                error: error.message
            };
        }
    }

    // 兼容性方法
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PythonGeminiService; 