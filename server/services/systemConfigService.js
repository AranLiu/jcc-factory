const { pool } = require('../config/database');
const PythonGeminiService = require('./pythonGeminiService');
const { spawn } = require('child_process');
const path = require('path');

class SystemConfigService {
    constructor() {
        this.configCache = new Map(); // 配置缓存
        this.lastCacheUpdate = 0;
        this.cacheExpiry = 30000; // 30秒缓存过期时间
    }

    /**
     * 获取所有系统配置
     */
    async getAllConfigs() {
        try {
            const [configs] = await pool.execute(`
                SELECT sc.config_key, sc.config_value, sc.config_type, sc.description, 
                       sc.updated_at, sc.updated_by, u.username as updated_by_name
                FROM system_config sc
                LEFT JOIN users u ON sc.updated_by = u.id
                ORDER BY sc.config_key
            `);

            const result = {};
            configs.forEach(config => {
                let value = config.config_value;
                
                // 根据配置类型转换值
                if (config.config_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.warn(`配置 ${config.config_key} JSON解析失败:`, e);
                        value = [];
                    }
                } else if (config.config_type === 'boolean') {
                    value = value === 'true';
                }

                result[config.config_key] = {
                    value,
                    type: config.config_type,
                    description: config.description,
                    updated_at: config.updated_at,
                    updated_by: config.updated_by,
                    updated_by_name: config.updated_by_name
                };
            });

            return result;
        } catch (error) {
            console.error('获取系统配置失败:', error);
            throw new Error('获取系统配置失败');
        }
    }

    /**
     * 获取单个配置值
     */
    async getConfig(key) {
        try {
            // 检查缓存
            if (this.configCache.has(key) && 
                Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
                return this.configCache.get(key);
            }

            const [configs] = await pool.execute(
                'SELECT config_value, config_type FROM system_config WHERE config_key = ?',
                [key]
            );

            if (configs.length === 0) {
                return null;
            }

            let value = configs[0].config_value;
            const type = configs[0].config_type;

            // 转换数据类型
            if (type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = [];
                }
            } else if (type === 'boolean') {
                value = value === 'true';
            }

            // 更新缓存
            this.configCache.set(key, value);
            this.lastCacheUpdate = Date.now();

            return value;
        } catch (error) {
            console.error(`获取配置 ${key} 失败:`, error);
            return null;
        }
    }

    /**
     * 更新配置
     */
    async updateConfig(key, value, userId) {
        try {
            let stringValue = value;
            let configType = 'string';

            // 根据值的类型确定存储方式
            if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
                configType = 'json';
            } else if (typeof value === 'boolean') {
                stringValue = value.toString();
                configType = 'boolean';
            }

            await pool.execute(`
                UPDATE system_config 
                SET config_value = ?, config_type = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE config_key = ?
            `, [stringValue, configType, userId, key]);

            // 清除缓存
            this.configCache.delete(key);

            console.log(`✅ 配置 ${key} 更新成功:`, value);
            return true;
        } catch (error) {
            console.error(`更新配置 ${key} 失败:`, error);
            throw new Error(`更新配置失败: ${error.message}`);
        }
    }

    /**
     * 测试Gemini API连接
     */
    async testGeminiConnection() {
        try {
            const apiKey = await this.getConfig('gemini_api_key');
            
            if (!apiKey) {
                return {
                    success: false,
                    message: '未配置Gemini API密钥',
                    details: 'Please set API key first'
                };
            }

            // 临时设置API密钥进行测试
            const originalKey = process.env.GEMINI_API_KEY;
            process.env.GEMINI_API_KEY = apiKey;

            try {
                const pythonService = new PythonGeminiService();
                const result = await pythonService.testConnection();
                
                return {
                    success: result.success,
                    message: result.success ? 'API连接正常' : '连接失败',
                    details: result.message || result.error,
                    responseTime: result.responseTime
                };
            } finally {
                // 恢复原始API密钥
                if (originalKey) {
                    process.env.GEMINI_API_KEY = originalKey;
                } else {
                    delete process.env.GEMINI_API_KEY;
                }
            }
        } catch (error) {
            console.error('测试Gemini连接失败:', error);
            return {
                success: false,
                message: '连接测试异常',
                details: error.message
            };
        }
    }

    /**
     * 获取当前连接状态
     */
    async getConnectionStatus() {
        try {
            const [geminiTest] = await Promise.all([
                this.testGeminiConnection()
            ]);

            return {
                gemini: geminiTest,
                proxy: { success: true, message: '状态检查失败' },
                overall: geminiTest.success
            };
        } catch (error) {
            console.error('获取连接状态失败:', error);
            return {
                gemini: { success: false, message: '状态检查失败' },
                proxy: { success: false, message: '状态检查失败' },
                overall: false
            };
        }
    }

    /**
     * 应用配置到运行环境
     */
    async applyConfigs() {
        try {
            const configs = await this.getAllConfigs();
            
            // 应用Gemini API密钥
            if (configs.gemini_api_key?.value) {
                process.env.GEMINI_API_KEY = configs.gemini_api_key.value;
            }

            // 应用默认模型
            if (configs.gemini_default_model?.value) {
                process.env.GEMINI_DEFAULT_MODEL = configs.gemini_default_model.value;
            }

            // 应用可用模型列表
            if (configs.gemini_available_models?.value) {
                process.env.GEMINI_AVAILABLE_MODELS = configs.gemini_available_models.value.join(',');
            }

            console.log('✅ 系统配置已应用到运行环境');
            return true;
        } catch (error) {
            console.error('应用配置失败:', error);
            return false;
        }
    }

    /**
     * 清除配置缓存
     */
    clearCache() {
        this.configCache.clear();
        this.lastCacheUpdate = 0;
    }

    /**
     * 测试代理连通性
     */
    async testProxyConnection() {
        return new Promise((resolve, reject) => {
            const pythonCmd = process.env.PYTHON_COMMAND || 'python';
            const proxyUrl = process.env.GEMINI_PROXY_URL || 'http://localhost:8080';
            const args = [pythonCmd, 'test', '连接测试', `proxy=${proxyUrl}`];
            
            const proc = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
            let output = '';
            let errorOutput = '';
            proc.stdout.on('data', (data) => { output += data; });
            proc.stderr.on('data', (data) => { errorOutput += data; });
            proc.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim().split('\n').pop());
                        resolve(result);
                    } catch (e) {
                        resolve({ success: false, message: 'JSON解析失败', error: e.message, raw: output, stderr: errorOutput });
                    }
                } else {
                    resolve({ success: false, message: 'Python进程异常', code, stderr: errorOutput, raw: output });
                }
            });
            proc.on('error', (err) => {
                resolve({ success: false, message: 'Python进程启动失败', error: err.message });
            });
        });
    }
}

module.exports = new SystemConfigService(); 