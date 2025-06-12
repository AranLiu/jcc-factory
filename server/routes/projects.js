const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

// 辅助函数：为相对路径生成完整的URL，并处理Windows路径
const getFullUrl = (req, filePath) => {
  if (!filePath) return null;
  // 如果路径已经是完整的URL，则直接返回
  if (filePath.startsWith('http')) return filePath;
  // 将所有反斜杠（Windows）替换为正斜杠（URL）
  const normalizedPath = filePath.replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/${normalizedPath}`;
};

// 所有路由都需要认证
router.use(authenticateToken);

// 获取项目列表
router.get('/', async (req, res) => {
    try {
        let sql, params;
        
        // 调试日志
        console.log('用户权限信息:', {
            id: req.user.id,
            username: req.user.username,
            permission: req.user.permission,
            role: req.user.role
        });
        
        // 根据用户权限决定查询范围（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';
        
        if (userPermission === 'global' || userPermission === 'readonly_global') {
            // 全局权限：查看所有项目，并显示项目所有者
            sql = `SELECT p.id, p.name, p.type, p.status, p.created_at, p.description, p.last_operation_at,
                          u.username as last_operator_name,
                          owner.username as owner_name,
                          p.user_id,
                          (SELECT COUNT(*) FROM files f WHERE f.project_id = p.id) as file_count 
                   FROM projects p 
                   LEFT JOIN users u ON p.last_operator_id = u.id
                   LEFT JOIN users owner ON p.user_id = owner.id
                   ORDER BY p.last_operation_at DESC`;
            params = [];
        } else {
            // 个人权限：只查看自己的项目
            sql = `SELECT p.id, p.name, p.type, p.status, p.created_at, p.description, p.last_operation_at,
                          u.username as last_operator_name,
                          p.user_id,
                          (SELECT COUNT(*) FROM files f WHERE f.project_id = p.id) as file_count 
                   FROM projects p 
                   LEFT JOIN users u ON p.last_operator_id = u.id
                   WHERE p.user_id = ? 
                   ORDER BY p.last_operation_at DESC`;
            params = [req.user.id];
        }
        
        const [projects] = await pool.execute(sql, params);
        res.json({ projects });
    } catch (error) {
        console.error('获取项目列表错误:', error);
        res.status(500).json({ message: '获取项目列表失败' });
    }
});

// 获取单个项目详情
router.get('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;

        let sql, params;
        
        // 根据用户权限决定查询条件（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';
        
        if (userPermission === 'global' || userPermission === 'readonly_global') {
            // 全局权限：可以访问任何项目
            sql = 'SELECT * FROM projects WHERE id = ?';
            params = [projectId];
        } else {
            // 个人权限：只能访问自己的项目
            sql = 'SELECT * FROM projects WHERE id = ? AND user_id = ?';
            params = [projectId, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);

        if (projects.length === 0) {
            return res.status(404).json({ message: '项目不存在或无权访问' });
        }
        
        const projectData = projects[0];

        // 获取项目文件
        const [files] = await pool.execute(
            'SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC',
            [projectId]
        );

        const filesWithFullUrl = files.map(file => ({
            ...file,
            file_path: getFullUrl(req, file.file_path),
            thumbnail_path: getFullUrl(req, file.thumbnail_path),
        }));

        // 获取AI任务
        const [tasks] = await pool.execute(
            'SELECT * FROM ai_tasks WHERE project_id = ? ORDER BY created_at DESC',
            [projectId]
        );

        res.json({
            project: projectData,
            files: filesWithFullUrl,
            tasks
        });
    } catch (error) {
        console.error('获取项目详情错误:', error);
        res.status(500).json({ message: '获取项目详情失败' });
    }
});

// 创建新项目
router.post('/', async (req, res) => {
    const { name, type, description } = req.body;
    if (!name || !type) {
        return res.status(400).json({ message: '项目名称和类型是必需的' });
    }
    try {
        const [result] = await pool.execute(
            'INSERT INTO projects (name, type, description, user_id) VALUES (?, ?, ?, ?)',
            [name, type, description || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, name, type, description });
    } catch (error) {
        console.error('创建项目错误:', error);
        res.status(500).json({ message: '创建项目失败' });
    }
});

// 新增：更新项目配置（prompts）
router.put('/:id/prompts', async (req, res) => {
    const { id } = req.params;
    const { analysis_prompt, integration_prompt } = req.body;

    try {
        // 权限检查（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';
        
        // 验证项目权限
        let sql, params;
        if (userPermission === 'global') {
            // 全局权限：可以修改任何项目
            sql = 'SELECT id, user_id FROM projects WHERE id = ?';
            params = [id];
        } else {
            // personal和readonly_global权限：只能修改自己的项目
            sql = 'SELECT id, user_id FROM projects WHERE id = ? AND user_id = ?';
            params = [id, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);
        if (projects.length === 0) {
            return res.status(404).json({ message: '项目不存在或无权访问' });
        }

        await pool.execute(
            'UPDATE projects SET analysis_prompt = ?, integration_prompt = ? WHERE id = ?',
            [analysis_prompt, integration_prompt, id]
        );
        
        // 更新最后操作时间
        await updateProjectLastOperation(id, req.user.id);
        
        res.json({ message: '项目配置更新成功' });
    } catch (error) {
        console.error('更新项目配置错误:', error);
        res.status(500).json({ message: '更新项目配置失败' });
    }
});

// 更新项目
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, analysis_prompt, integration_prompt } = req.body;

    try {
        // 权限检查（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';

        // 准备更新的字段和值
        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (analysis_prompt !== undefined) {
            updates.push('analysis_prompt = ?');
            values.push(analysis_prompt);
        }
        if (integration_prompt !== undefined) {
            updates.push('integration_prompt = ?');
            values.push(integration_prompt);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: '没有提供要更新的字段' });
        }

        // 根据权限设置WHERE条件
        let whereClause, whereParams;
        if (userPermission === 'global') {
            // 全局权限：可以修改任何项目
            whereClause = 'WHERE id = ?';
            whereParams = [id];
        } else {
            // personal和readonly_global权限：只能修改自己的项目
            whereClause = 'WHERE id = ? AND user_id = ?';
            whereParams = [id, req.user.id];
        }

        values.push(...whereParams);

        const sql = `UPDATE projects SET ${updates.join(', ')} ${whereClause}`;
        const [result] = await pool.execute(sql, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '项目不存在或无权更新' });
        }

        // 更新最后操作时间
        await updateProjectLastOperation(id, req.user.id);

        res.json({ message: '项目更新成功' });
    } catch (error) {
        console.error('更新项目错误:', error);
        res.status(500).json({ message: '更新项目失败' });
    }
});

// 删除项目
router.delete('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;

        // 权限检查（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';

        // 验证项目权限
        let sql, params;
        if (userPermission === 'global') {
            // 全局权限：可以删除任何项目
            sql = 'SELECT id FROM projects WHERE id = ?';
            params = [projectId];
        } else {
            // personal和readonly_global权限：只能删除自己的项目
            sql = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
            params = [projectId, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);

        if (projects.length === 0) {
            return res.status(404).json({ message: '项目不存在或无权删除' });
        }

        // 删除项目（相关文件和任务会通过外键约束自动删除）
        await pool.execute('DELETE FROM projects WHERE id = ?', [projectId]);

        res.json({ message: '项目删除成功' });
    } catch (error) {
        console.error('删除项目错误:', error);
        res.status(500).json({ message: '删除项目失败' });
    }
});

module.exports = router; 