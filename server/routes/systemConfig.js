const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const systemConfigService = require('../services/systemConfigService');

const router = express.Router();

/**
 * 获取公开的默认Prompt配置 (不需要管理员权限，只需要登录)
 */
router.get('/public-prompts', authenticateToken, async (req, res) => {
    try {
        const configs = await systemConfigService.getAllConfigs();
        
        // 只返回公开的Prompt配置
        const publicPrompts = {
            video_analysis_prompt: configs.video_analysis_prompt || null,
            script_integration_prompt: configs.script_integration_prompt || null
        };
        
        res.json({
            success: true,
            data: publicPrompts
        });
    } catch (error) {
        console.error('获取公开Prompt配置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取默认Prompt配置失败',
            error: error.message
        });
    }
});

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

/**
 * 测试代理连通性
 */
router.post('/test-proxy', async (req, res) => {
    try {
        const result = await systemConfigService.testProxyConnection();
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('测试代理连通性失败:', error);
        res.status(500).json({
            success: false,
            message: '测试代理连通性失败',
            error: error.message
        });
    }
});

/**
 * 更新视频解析Prompt
 */
router.put('/video-analysis-prompt', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                success: false,
                message: '视频解析Prompt不能为空'
            });
        }

        await systemConfigService.updateConfig('video_analysis_prompt', prompt, req.user.id);
        
        res.json({
            success: true,
            message: '视频解析Prompt更新成功'
        });
    } catch (error) {
        console.error('更新视频解析Prompt失败:', error);
        res.status(500).json({
            success: false,
            message: '更新视频解析Prompt失败',
            error: error.message
        });
    }
});

/**
 * 更新剧本整合Prompt
 */
router.put('/script-integration-prompt', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                success: false,
                message: '剧本整合Prompt不能为空'
            });
        }

        await systemConfigService.updateConfig('script_integration_prompt', prompt, req.user.id);
        
        res.json({
            success: true,
            message: '剧本整合Prompt更新成功'
        });
    } catch (error) {
        console.error('更新剧本整合Prompt失败:', error);
        res.status(500).json({
            success: false,
            message: '更新剧本整合Prompt失败',
            error: error.message
        });
    }
});

module.exports = router; 