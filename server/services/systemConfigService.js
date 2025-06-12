const { pool } = require('../config/database');
const proxyConfig = require('../config/proxyConfig');
const PythonGeminiService = require('./pythonGeminiService');

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
     * 测试代理连接
     */
    async testProxyConnection() {
        try {
            const proxyEnabled = await this.getConfig('proxy_enabled');
            
            if (!proxyEnabled) {
                return {
                    success: true,
                    message: '代理未启用',
                    details: 'Proxy is disabled'
                };
            }

            const httpProxy = await this.getConfig('proxy_http');
            const httpsProxy = await this.getConfig('proxy_https');

            if (!httpProxy && !httpsProxy) {
                return {
                    success: false,
                    message: '未配置代理服务器',
                    details: 'No proxy server configured'
                };
            }

            // 临时设置代理环境变量进行测试
            const originalHttpProxy = process.env.HTTP_PROXY;
            const originalHttpsProxy = process.env.HTTPS_PROXY;
            
            if (httpProxy) process.env.HTTP_PROXY = httpProxy;
            if (httpsProxy) process.env.HTTPS_PROXY = httpsProxy;

            try {
                const pythonService = new PythonGeminiService();
                const startTime = Date.now();
                const result = await pythonService.testConnection();
                const responseTime = Date.now() - startTime;

                return {
                    success: result.success,
                    message: result.success ? '代理连接正常' : '代理连接失败',
                    details: result.message || result.error,
                    responseTime
                };
            } finally {
                // 恢复原始代理设置
                if (originalHttpProxy) {
                    process.env.HTTP_PROXY = originalHttpProxy;
                } else {
                    delete process.env.HTTP_PROXY;
                }
                
                if (originalHttpsProxy) {
                    process.env.HTTPS_PROXY = originalHttpsProxy;
                } else {
                    delete process.env.HTTPS_PROXY;
                }
            }
        } catch (error) {
            console.error('测试代理连接失败:', error);
            return {
                success: false,
                message: '代理测试异常',
                details: error.message
            };
        }
    }

    /**
     * 获取当前连接状态
     */
    async getConnectionStatus() {
        try {
            const [geminiTest, proxyTest] = await Promise.all([
                this.testGeminiConnection(),
                this.testProxyConnection()
            ]);

            return {
                gemini: geminiTest,
                proxy: proxyTest,
                overall: geminiTest.success && proxyTest.success
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

            // 应用代理配置
            if (configs.proxy_enabled?.value) {
                if (configs.proxy_http?.value) {
                    process.env.HTTP_PROXY = configs.proxy_http.value;
                    process.env.http_proxy = configs.proxy_http.value;
                }
                if (configs.proxy_https?.value) {
                    process.env.HTTPS_PROXY = configs.proxy_https.value;
                    process.env.https_proxy = configs.proxy_https.value;
                }
                if (configs.proxy_no_proxy?.value) {
                    process.env.NO_PROXY = configs.proxy_no_proxy.value;
                    process.env.no_proxy = configs.proxy_no_proxy.value;
                }
            } else {
                // 如果禁用代理，清除环境变量
                delete process.env.HTTP_PROXY;
                delete process.env.http_proxy;
                delete process.env.HTTPS_PROXY;
                delete process.env.https_proxy;
                delete process.env.NO_PROXY;
                delete process.env.no_proxy;
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
     * 获取推荐的代理URL
     */
    async getRecommendedProxyUrls() {
        try {
            const configStr = await this.getConfig('proxy_service_urls');
            if (configStr) {
                return JSON.parse(configStr);
            }
        } catch (error) {
            console.error('获取代理URLs配置失败:', error);
        }
        
        // 返回默认配置
        return {
            local: 'http://localhost:8080',
            netlify: '',
            vercel: '',
            cloudflare: '',
            custom: ''
        };
    }

    /**
     * 设置代理服务配置
     */
    async setProxyConfig(config) {
        const validConfig = {
            enabled: Boolean(config.enabled),
            provider: config.provider || 'local', // local, netlify, vercel, cloudflare
            customUrl: config.customUrl || '',
            fallbackToLocal: Boolean(config.fallbackToLocal)
        };

        await this.updateConfig('proxy_config', JSON.stringify(validConfig), 1);
        
        // 更新环境变量
        if (validConfig.enabled) {
            const proxyUrls = await this.getRecommendedProxyUrls();
            const proxyUrl = validConfig.provider === 'custom' 
                ? validConfig.customUrl 
                : proxyUrls[validConfig.provider];
                
            if (proxyUrl) {
                process.env.GEMINI_PROXY_URL = proxyUrl;
                console.log(`🌐 代理服务已设置为: ${proxyUrl}`);
            }
        } else {
            delete process.env.GEMINI_PROXY_URL;
            console.log('🌐 代理服务已禁用');
        }
        
        return validConfig;
    }

    /**
     * 获取代理服务配置
     */
    async getProxyConfig() {
        try {
            const configStr = await this.getConfig('proxy_config');
            if (configStr) {
                return JSON.parse(configStr);
            }
        } catch (error) {
            console.error('解析代理配置失败:', error);
        }
        
        return {
            enabled: false,
            provider: 'local',
            customUrl: '',
            fallbackToLocal: true
        };
    }
}

module.exports = new SystemConfigService(); 