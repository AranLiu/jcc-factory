const { spawn } = require('child_process');
const path = require('path');
const systemConfigService = require('./systemConfigService');
const geminiProxyService = require('./geminiProxyService');

class SmartGeminiService {
    constructor() {
        this.preferProxy = true; // 优先使用代理
        this.proxyFallbackEnabled = true; // 启用代理失败回退
        this.directFallbackEnabled = true; // 启用直连失败回退
    }

    /**
     * 智能选择处理方式：代理优先，失败时回退到直连
     */
    async processRequest(type, content, options = {}) {
        let lastError = null;
        
        // 策略1: 尝试使用代理服务
        if (this.preferProxy) {
            try {
                const proxyResult = await this.tryProxyService(type, content, options);
                if (proxyResult.success) {
                    return {
                        ...proxyResult,
                        method: 'proxy',
                        fallback: false
                    };
                } else if (proxyResult.fallback_to_direct) {
                    console.log('📢 代理服务建议回退到直连模式');
                } else {
                    lastError = proxyResult.error;
                    console.warn('⚠️ 代理服务失败，准备回退:', proxyResult.error);
                }
            } catch (error) {
                lastError = error.message;
                console.warn('⚠️ 代理服务异常，准备回退:', error.message);
            }
        }
        
        // 策略2: 回退到直连服务
        if (this.directFallbackEnabled) {
            try {
                console.log('🔄 尝试直连模式...');
                const directResult = await this.tryDirectService(type, content, options);
                if (directResult.success) {
                    return {
                        ...directResult,
                        method: 'direct',
                        fallback: true,
                        original_error: lastError
                    };
                } else {
                    console.warn('⚠️ 直连服务也失败:', directResult.error);
                }
            } catch (error) {
                console.warn('⚠️ 直连服务异常:', error.message);
            }
        }
        
        // 全部失败
        return {
            success: false,
            error: '所有连接方式都失败',
            details: {
                proxy_error: lastError,
                direct_available: this.directFallbackEnabled
            },
            method: 'none',
            fallback: false
        };
    }

    /**
     * 尝试使用代理服务
     */
    async tryProxyService(type, content, options = {}) {
        const proxyStatus = geminiProxyService.getStatus();
        
        if (!proxyStatus.running) {
            // 尝试启动代理服务
            console.log('🚀 代理服务未运行，尝试启动...');
            const started = await geminiProxyService.startProxy();
            if (!started) {
                throw new Error('代理服务启动失败');
            }
            // 等待代理服务启动
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return await this.executeProxyPython(type, content, options);
    }

    /**
     * 尝试使用直连服务
     */
    async tryDirectService(type, content, options = {}) {
        return await this.executeDirectPython(type, content, options);
    }

    /**
     * 执行代理Python脚本
     */
    async executeProxyPython(type, content, options = {}) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../python_services/openai_proxy_service_simple.py');
            const pythonCommand = process.env.PYTHON_COMMAND || 'python';
            
            // 构建参数
            const args = [scriptPath, type, content];
            
            if (options.model) {
                args.push(`model=${options.model}`);
            }
            if (options.temperature !== undefined) {
                args.push(`temperature=${options.temperature}`);
            }
            if (options.systemInstruction) {
                args.push(`system=${options.systemInstruction}`);
            }
            
            // 设置环境变量
            const env = {
                ...process.env,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY,
                GEMINI_PROXY_URL: 'http://localhost:8080',
                DEBUG: 'true'
            };
            
            console.log(`🔄 执行代理Python命令: ${pythonCommand} ${args.join(' ')}`);
            
            const pythonProcess = spawn(pythonCommand, args, {
                env: env,
                timeout: 300000 // 5分钟超时
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        resolve({
                            success: false,
                            error: `Python输出解析失败: ${parseError.message}`,
                            raw_output: stdout
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: `Python进程退出，代码: ${code}`,
                        stderr: stderr,
                        stdout: stdout
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Python进程错误: ${error.message}`
                });
            });
        });
    }

    /**
     * 执行直连Python脚本
     */
    async executeDirectPython(type, content, options = {}) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../python_services/gemini_service_clean.py');
            const pythonCommand = process.env.PYTHON_COMMAND || 'python';
            
            // 构建参数
            const args = [scriptPath, type, content];
            
            if (options.model) {
                args.push(`model=${options.model}`);
            }
            if (options.temperature !== undefined) {
                args.push(`temperature=${options.temperature}`);
            }
            if (options.systemInstruction) {
                args.push(`system=${options.systemInstruction}`);
            }
            
            // 设置环境变量
            const env = {
                ...process.env,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY
            };
            
            console.log(`🔄 执行直连Python命令: ${pythonCommand} ${args.join(' ')}`);
            
            const pythonProcess = spawn(pythonCommand, args, {
                env: env,
                timeout: 300000 // 5分钟超时
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        resolve({
                            success: false,
                            error: `Python输出解析失败: ${parseError.message}`,
                            raw_output: stdout
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: `Python进程退出，代码: ${code}`,
                        stderr: stderr,
                        stdout: stdout
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Python进程错误: ${error.message}`
                });
            });
        });
    }

    /**
     * 处理文本请求
     */
    async processText(text, options = {}) {
        return await this.processRequest('text', text, options);
    }

    /**
     * 处理视频请求
     */
    async processVideo(videoPath, prompt, options = {}) {
        // 视频处理优先使用直连，因为代理可能不支持
        const originalPreference = this.preferProxy;
        this.preferProxy = false;
        
        try {
            const result = await this.processRequest('video', videoPath, {
                ...options,
                systemInstruction: prompt
            });
            return result;
        } finally {
            this.preferProxy = originalPreference;
        }
    }

    /**
     * 测试连接
     */
    async testConnection() {
        console.log('🧪 开始智能连接测试...');
        
        const results = {
            proxy: null,
            direct: null,
            recommendation: null
        };
        
        // 测试代理连接
        try {
            console.log('🔧 测试代理连接...');
            results.proxy = await this.tryProxyService('test', 'proxy_test');
        } catch (error) {
            results.proxy = {
                success: false,
                error: error.message
            };
        }
        
        // 测试直连
        try {
            console.log('🔧 测试直连...');
            results.direct = await this.tryDirectService('test', 'direct_test');
        } catch (error) {
            results.direct = {
                success: false,
                error: error.message
            };
        }
        
        // 生成建议
        if (results.proxy?.success && results.direct?.success) {
            results.recommendation = 'both_available_prefer_proxy';
        } else if (results.proxy?.success) {
            results.recommendation = 'proxy_only';
        } else if (results.direct?.success) {
            results.recommendation = 'direct_only';
        } else {
            results.recommendation = 'none_available';
        }
        
        return {
            success: results.proxy?.success || results.direct?.success || false,
            message: this.getRecommendationMessage(results.recommendation),
            details: results
        };
    }

    /**
     * 获取建议消息
     */
    getRecommendationMessage(recommendation) {
        const messages = {
            'both_available_prefer_proxy': '代理和直连都可用，建议使用代理模式',
            'proxy_only': '仅代理连接可用，将使用代理模式',
            'direct_only': '仅直连可用，将使用直连模式',
            'none_available': '所有连接方式都不可用，请检查网络和配置'
        };
        return messages[recommendation] || '未知状态';
    }

    /**
     * 设置连接偏好
     */
    setPreference(preferProxy = true, enableFallback = true) {
        this.preferProxy = preferProxy;
        this.proxyFallbackEnabled = enableFallback;
        this.directFallbackEnabled = enableFallback;
        
        console.log(`🔧 连接偏好已更新: 优先代理=${preferProxy}, 启用回退=${enableFallback}`);
    }

    /**
     * 获取服务状态
     */
    getStatus() {
        const proxyStatus = geminiProxyService.getStatus();
        
        return {
            preferProxy: this.preferProxy,
            proxyFallbackEnabled: this.proxyFallbackEnabled,
            directFallbackEnabled: this.directFallbackEnabled,
            proxyService: proxyStatus,
            directService: {
                available: true, // 直连服务总是可用的
                apiKey: !!process.env.GEMINI_API_KEY
            }
        };
    }
}

module.exports = new SmartGeminiService(); 