const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const systemConfigService = require('../services/systemConfigService');

const router = express.Router();

// 所有系统配置路由都需要管理员权限
router.use(authenticateToken, requireAdmin);

/**
 * 获取所有系统配置
 */
router.get('/', async (req, res) => {
    try {
        const configs = await systemConfigService.getAllConfigs();
        
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('获取系统配置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取系统配置失败',
            error: error.message
        });
    }
});

/**
 * 获取连接状态
 */
router.get('/status', async (req, res) => {
    try {
        const status = await systemConfigService.getConnectionStatus();
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('获取连接状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取连接状态失败',
            error: error.message
        });
    }
});

/**
 * 更新Gemini API密钥
 */
router.put('/gemini-key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'API密钥不能为空'
            });
        }

        await systemConfigService.updateConfig('gemini_api_key', apiKey, req.user.id);
        await systemConfigService.applyConfigs();
        
        res.json({
            success: true,
            message: 'API密钥更新成功'
        });
    } catch (error) {
        console.error('更新API密钥失败:', error);
        res.status(500).json({
            success: false,
            message: '更新API密钥失败',
            error: error.message
        });
    }
});

/**
 * 更新模型配置
 */
router.put('/models', async (req, res) => {
    try {
        const { defaultModel, availableModels } = req.body;
        
        if (!defaultModel || !Array.isArray(availableModels) || availableModels.length === 0) {
            return res.status(400).json({
                success: false,
                message: '默认模型和可用模型列表不能为空'
            });
        }

        if (!availableModels.includes(defaultModel)) {
            return res.status(400).json({
                success: false,
                message: '默认模型必须在可用模型列表中'
            });
        }

        // 更新默认模型
        await systemConfigService.updateConfig('gemini_default_model', defaultModel, req.user.id);
        
        // 更新可用模型列表
        await systemConfigService.updateConfig('gemini_available_models', availableModels, req.user.id);
        
        await systemConfigService.applyConfigs();
        
        res.json({
            success: true,
            message: '模型配置更新成功'
        });
    } catch (error) {
        console.error('更新模型配置失败:', error);
        res.status(500).json({
            success: false,
            message: '更新模型配置失败',
            error: error.message
        });
    }
});

/**
 * 更新代理配置
 */
router.put('/proxy', async (req, res) => {
    try {
        const { enabled, httpProxy, httpsProxy, noProxy } = req.body;
        
        // 更新代理启用状态
        await systemConfigService.updateConfig('proxy_enabled', Boolean(enabled), req.user.id);
        
        if (enabled) {
            // 如果启用代理，更新代理配置
            if (httpProxy) {
                await systemConfigService.updateConfig('proxy_http', httpProxy, req.user.id);
            }
            
            if (httpsProxy) {
                await systemConfigService.updateConfig('proxy_https', httpsProxy, req.user.id);
            }
            
            if (noProxy !== undefined) {
                await systemConfigService.updateConfig('proxy_no_proxy', noProxy || 'localhost,127.0.0.1', req.user.id);
            }
        }
        
        await systemConfigService.applyConfigs();
        
        res.json({
            success: true,
            message: enabled ? '代理配置更新成功' : '代理已禁用'
        });
    } catch (error) {
        console.error('更新代理配置失败:', error);
        res.status(500).json({
            success: false,
            message: '更新代理配置失败',
            error: error.message
        });
    }
});

/**
 * 测试Gemini API连接
 */
router.post('/test-gemini', async (req, res) => {
    try {
        const result = await systemConfigService.testGeminiConnection();
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('测试Gemini连接失败:', error);
        res.status(500).json({
            success: false,
            message: '测试连接失败',
            error: error.message
        });
    }
});

/**
 * 测试代理连接
 */
router.post('/test-proxy', async (req, res) => {
    try {
        const result = await systemConfigService.testProxyConnection();
        
        res.json({
            success: true,
            data: result
        });
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
 * 应用配置到运行环境
 */
router.post('/apply', async (req, res) => {
    try {
        const success = await systemConfigService.applyConfigs();
        
        if (success) {
            res.json({
                success: true,
                message: '配置应用成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '配置应用失败'
            });
        }
    } catch (error) {
        console.error('应用配置失败:', error);
        res.status(500).json({
            success: false,
            message: '应用配置失败',
            error: error.message
        });
    }
});

/**
 * 清除配置缓存
 */
router.post('/clear-cache', async (req, res) => {
    try {
        systemConfigService.clearCache();
        
        res.json({
            success: true,
            message: '缓存清除成功'
        });
    } catch (error) {
        console.error('清除缓存失败:', error);
        res.status(500).json({
            success: false,
            message: '清除缓存失败',
            error: error.message
        });
    }
});

/**
 * 获取推荐的代理URL
 */
router.get('/proxy-urls', async (req, res) => {
    try {
        const urls = await systemConfigService.getRecommendedProxyUrls();
        
        res.json({
            success: true,
            data: urls
        });
    } catch (error) {
        console.error('获取代理URL失败:', error);
        res.status(500).json({
            success: false,
            message: '获取代理URL失败',
            error: error.message
        });
    }
});

/**
 * 获取代理服务配置
 */
router.get('/proxy-config', async (req, res) => {
    try {
        const config = await systemConfigService.getProxyConfig();
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('获取代理服务配置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取代理服务配置失败',
            error: error.message
        });
    }
});

/**
 * 更新代理服务配置
 */
router.put('/proxy-config', async (req, res) => {
    try {
        const { enabled, provider, customUrl, fallbackToLocal } = req.body;
        
        const config = {
            enabled: Boolean(enabled),
            provider: provider || 'local',
            customUrl: customUrl || '',
            fallbackToLocal: Boolean(fallbackToLocal)
        };
        
        const result = await systemConfigService.setProxyConfig(config);
        
        res.json({
            success: true,
            data: result,
            message: '代理服务配置更新成功'
        });
    } catch (error) {
        console.error('更新代理服务配置失败:', error);
        res.status(500).json({
            success: false,
            message: '更新代理服务配置失败',
            error: error.message
        });
    }
});

/**
 * 获取单个配置
 */
router.get('/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = await systemConfigService.getConfig(key);
        
        res.json({
            success: true,
            data: value
        });
    } catch (error) {
        console.error(`获取配置 ${req.params.key} 失败:`, error);
        res.status(500).json({
            success: false,
            message: '获取配置失败',
            error: error.message
        });
    }
});

/**
 * 设置单个配置
 */
router.put('/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value, userId } = req.body;
        
        const success = await systemConfigService.updateConfig(key, value, userId || req.user.id);
        
        if (success) {
            res.json({
                success: true,
                message: '配置更新成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '配置更新失败'
            });
        }
    } catch (error) {
        console.error(`设置配置 ${req.params.key} 失败:`, error);
        res.status(500).json({
            success: false,
            message: '设置配置失败',
            error: error.message
        });
    }
});

module.exports = router; 