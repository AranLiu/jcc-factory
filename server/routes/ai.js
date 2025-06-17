const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const PythonGeminiService = require('../services/pythonGeminiService');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 初始化Gemini服务
let geminiService;
try {
    geminiService = new PythonGeminiService();
} catch (error) {
    console.error('Python Gemini服务初始化失败:', error.message);
}

// 辅助函数：更新项目最后操作时间和操作人
const updateProjectLastOperation = async (projectId, userId) => {
    try {
        await pool.execute(
            'UPDATE projects SET last_operation_at = NOW(), last_operator_id = ? WHERE id = ?',
            [userId, projectId]
        );
    } catch (error) {
        console.warn('更新项目最后操作时间失败:', error);
    }
};

// 获取模型配置
router.get('/models', async (req, res) => {
    try {
        if (!geminiService) {
            return res.status(500).json({ message: 'Gemini服务未初始化，请检查API密钥配置' });
        }

        const config = {
            defaultModel: geminiService.defaultModel,
            availableModels: geminiService.availableModels
        };
        
        res.json(config);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `获取模型配置失败: ${error.message}` 
        });
    }
});

// 测试AI连接
router.get('/test', async (req, res) => {
    try {
        if (!geminiService) {
            return res.status(500).json({ message: 'Gemini服务未初始化，请检查API密钥配置' });
        }

        const result = await geminiService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `连接测试失败: ${error.message}` 
        });
    }
});

// 创建AI分析任务
router.post('/analyze', async (req, res) => {
    try {
        if (!geminiService) {
            return res.status(500).json({ message: 'Gemini服务未初始化，请检查API密钥配置' });
        }

        const { projectId, fileId, prompt, modelConfig = {} } = req.body;

        if (!projectId || !prompt) {
            return res.status(400).json({ message: '项目ID和提示词不能为空' });
        }

        // 权限检查（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';

        // 验证项目权限
        let sql, params;
        if (userPermission === 'global' || req.user.role === 'admin') {
            // 管理员或全局权限：可以对任何项目创建任务
            sql = 'SELECT id, type FROM projects WHERE id = ?';
            params = [projectId];
        } else {
            // personal和readonly_global权限：只能对自己的项目创建任务
            sql = 'SELECT id, type FROM projects WHERE id = ? AND user_id = ?';
            params = [projectId, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);

        if (projects.length === 0) {
            return res.status(404).json({ message: '项目不存在或无权访问' });
        }

        const project = projects[0];

        // 如果指定了文件ID，验证文件
        let fileInfo = null;
        if (fileId) {
            const [files] = await pool.execute(
                'SELECT * FROM files WHERE id = ? AND project_id = ?',
                [fileId, projectId]
            );

            if (files.length === 0) {
                return res.status(404).json({ message: '文件不存在' });
            }
            fileInfo = files[0];
        }

        // 创建AI任务记录
        const [taskResult] = await pool.execute(
            'INSERT INTO ai_tasks (project_id, file_id, prompt, model_config, status) VALUES (?, ?, ?, ?, ?)',
            [projectId, fileId || null, prompt, JSON.stringify(modelConfig), 'pending']
        );

        const taskId = taskResult.insertId;

        // 更新项目最后操作时间和操作人
        await updateProjectLastOperation(projectId, req.user.id);

        // 异步处理AI分析
        processAITask(taskId, project, fileInfo, prompt, modelConfig)
            .catch(error => {
                console.error('AI任务处理失败:', error);
            });

        res.json({
            message: 'AI分析任务已创建',
            taskId: taskId
        });
    } catch (error) {
        console.error('创建AI任务错误:', error);
        res.status(500).json({ message: '创建AI任务失败' });
    }
});

// 处理AI任务
async function processAITask(taskId, project, fileInfo, prompt, modelConfig) {
    try {
        // 更新任务状态为处理中
        await pool.execute(
            'UPDATE ai_tasks SET status = ? WHERE id = ?',
            ['processing', taskId]
        );

        let result;

        if (fileInfo) {
            // 处理特定文件
            if (project.type === 'video') {
                // 视频分析 - 确保使用绝对路径
                const absolutePath = path.isAbsolute(fileInfo.file_path) 
                    ? fileInfo.file_path 
                    : path.resolve(fileInfo.file_path);
                
                // 检查文件是否存在
                try {
                    await fs.access(absolutePath);
                    console.log('✅ 视频文件存在:', absolutePath);
                } catch (error) {
                    console.error('❌ 视频文件不存在:', absolutePath);
                    throw new Error(`视频文件不存在: ${absolutePath}`);
                }
                    
                result = await geminiService.analyzeVideo(prompt, {
                    path: absolutePath,
                    originalName: fileInfo.original_name,
                    fileSize: fileInfo.file_size,
                    duration: null
                }, modelConfig);
            } else if (project.type === 'novel') {
                // 读取文本文件内容 - 确保使用绝对路径
                const absolutePath = path.isAbsolute(fileInfo.file_path) 
                    ? fileInfo.file_path 
                    : path.resolve(fileInfo.file_path);
                    
                const fileContent = await readTextFile(absolutePath, fileInfo.mime_type);
                result = await geminiService.analyzeNovel(prompt, fileContent, modelConfig);
            }
        } else {
            // 项目整体分析
            const projectContent = await getProjectContent(project.id);
            result = await geminiService.analyzeContent(prompt, projectContent, modelConfig);
        }

        // 更新任务结果
        await pool.execute(
            'UPDATE ai_tasks SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['completed', result.text, taskId]
        );

    } catch (error) {
        console.error('AI任务处理错误:', error);
        
        // 更新任务状态为失败
        await pool.execute(
            'UPDATE ai_tasks SET status = ?, error_message = ? WHERE id = ?',
            ['failed', error.message, taskId]
        );
    }
}

// 读取文本文件内容
async function readTextFile(filePath, mimeType) {
    try {
        if (mimeType === 'text/plain') {
            return await fs.readFile(filePath, 'utf8');
        } else {
            return await fs.readFile(filePath, 'utf8');
        }
    } catch (error) {
        throw new Error(`文件读取失败: ${error.message}`);
    }
}

// 获取项目所有内容
async function getProjectContent(projectId) {
    try {
        const [files] = await pool.execute(
            'SELECT * FROM files WHERE project_id = ?',
            [projectId]
        );

        const contents = [];
        for (const file of files) {
            try {
                if (file.mime_type.startsWith('text/')) {
                    // 确保使用绝对路径
                    const absolutePath = path.isAbsolute(file.file_path) 
                        ? file.file_path 
                        : path.resolve(file.file_path);
                    const content = await readTextFile(absolutePath, file.mime_type);
                    contents.push(`文件：${file.original_name}\n${content}`);
                } else {
                    contents.push(`文件：${file.original_name}（${file.mime_type}，无法提取文本内容）`);
                }
            } catch (error) {
                contents.push(`文件：${file.original_name}（读取失败：${error.message}）`);
            }
        }

        return contents.join('\n\n---\n\n');
    } catch (error) {
        throw new Error(`获取项目内容失败: ${error.message}`);
    }
}

// 获取AI任务状态
router.get('/task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const [tasks] = await pool.execute(`
            SELECT at.*, p.user_id 
            FROM ai_tasks at 
            JOIN projects p ON at.project_id = p.id 
            WHERE at.id = ?
        `, [taskId]);

        if (tasks.length === 0) {
            return res.status(404).json({ message: '任务不存在' });
        }

        const task = tasks[0];
        const userPermission = req.user.permission || 'personal';
        
        // 权限检查：管理员、全局权限用户或项目所有者可以访问
        if (task.user_id !== req.user.id && req.user.role !== 'admin' && userPermission !== 'global') {
            console.warn(`[AI任务权限拒绝] user_id=${req.user.id}, taskId=${taskId}, task_owner=${task.user_id}, role=${req.user.role}, permission=${userPermission}`);
            return res.status(403).json({ message: '没有权限访问此任务' });
        }

        res.json({ task });
    } catch (error) {
        console.error('获取任务状态错误:', error);
        res.status(500).json({ message: '获取任务状态失败' });
    }
});

// 新增：剧本整合接口
router.post('/integrate-script', authenticateToken, async (req, res) => {
    try {
        if (!geminiService) {
            return res.status(500).json({ message: 'Gemini服务未初始化，请检查API密钥配置' });
        }

        const { integrationPrompt, draftContent, projectId, modelConfig } = req.body;

        if (!integrationPrompt || !draftContent || !projectId) {
            return res.status(400).json({ message: '项目ID、整合提示词和草稿内容不能为空' });
        }

        // 权限检查（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';

        // 验证项目权限
        let sql, params;
        if (userPermission === 'global' || req.user.role === 'admin') {
            // 管理员或全局权限：可以对任何项目进行整合
            sql = 'SELECT id FROM projects WHERE id = ?';
            params = [projectId];
        } else {
            // personal和readonly_global权限：只能对自己的项目进行整合
            sql = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
            params = [projectId, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);

        if (projects.length === 0) {
            return res.status(403).json({ message: '无权访问此项目' });
        }

        // 调用AI服务进行整合
        const result = await geminiService.integrateScript(integrationPrompt, draftContent, modelConfig);

        res.json({
            success: true,
            integratedScript: result.text
        });

    } catch (error) {
        console.error('剧本整合错误:', error);
        res.status(500).json({ 
            success: false, 
            message: `剧本整合失败: ${error.message}` 
        });
    }
});

module.exports = router; 