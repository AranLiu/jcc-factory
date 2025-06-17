const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 配置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const router = express.Router();

// 辅助函数：为相对路径生成完整的URL，并处理Windows路径
const getFullUrl = (req, filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // 为视频文件生成可直接访问的静态文件路径
  // 确保路径指向静态文件服务而不是下载接口
  if (normalizedPath.startsWith('uploads/')) {
    return `${req.protocol}://${req.get('host')}/${normalizedPath}`;
  } else {
    // 如果路径不是以uploads开头，添加uploads前缀
    return `${req.protocol}://${req.get('host')}/uploads/${normalizedPath}`;
  }
};

// 辅助函数：为视频流生成带token的专用URL
const getVideoStreamUrl = (req, fileId) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return `${req.protocol}://${req.get('host')}/api/files/${fileId}/stream?token=${token}`;
};

// 辅助函数：获取视频时长
const getVideoDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                // 修改此处：直接拒绝Promise，以便上层捕捉
                reject(new Error(`无法获取文件时长: ${err.message}`));
                return;
            }
            resolve(metadata.format.duration || null);
        });
    });
};

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

// 所有路由都需要认证
router.use(authenticateToken);

// 配置multer存储
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 基于用户ID创建子目录，实现文件隔离
        const userDir = path.join(uploadDir, String(req.user.id));
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/mkv'],
        novel: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const projectType = req.body.projectType;
    if (projectType && allowedTypes[projectType]) {
        if (allowedTypes[projectType].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的${projectType === 'video' ? '视频' : '文档'}格式`), false);
        }
    } else {
        cb(null, true); // 允许所有类型，让业务逻辑处理
    }
};

const upload = multer({ storage: storage });

// 文件上传
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '没有上传文件' });
    }

    const { projectId } = req.body;
    const { id: userId } = req.user;
    const { originalname, mimetype, size, path: filePath, filename } = req.file;
    
    // 使用相对路径存储，提高可移植性
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    let duration = null;
    let thumbnailPath = null;

    try {
        // 如果是视频文件，提取时长和缩略图
        if (mimetype.startsWith('video/')) {
            duration = await getVideoDuration(filePath);

            const thumbnailFilename = `thumb-${path.basename(filePath, path.extname(filePath))}.png`;
            const relativeThumbnailPath = path.join(path.dirname(relativePath), thumbnailFilename).replace(/\\/g, '/');
            
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .on('end', () => {
                        thumbnailPath = relativeThumbnailPath;
                        resolve();
                    })
                    .on('error', (err) => reject(new Error(`缩略图生成失败: ${err.message}`)))
                    .screenshots({
                        timestamps: ['1%'],
                        filename: thumbnailFilename,
                        folder: path.dirname(filePath),
                        size: '320x180' // 16:9 比例
                    });
            });
        }

        // 将文件信息存入数据库
        const [result] = await pool.execute(
            'INSERT INTO files (project_id, original_name, filename, mime_type, file_size, file_path, duration, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [projectId, originalname, filename, mimetype, size, relativePath, duration, thumbnailPath]
        );

        // 更新项目最后操作时间和操作人
        await updateProjectLastOperation(projectId, userId);

        res.status(201).json({ 
            message: '文件上传成功', 
            fileId: result.insertId,
            file: {
                id: result.insertId,
                project_id: projectId,
                user_id: userId,
                original_name: originalname,
                mime_type: mimetype,
                file_size: size,
                file_path: getFullUrl(req, relativePath),
                stream_url: mimetype.startsWith('video/') ? getVideoStreamUrl(req, result.insertId) : null,
                duration: duration,
                thumbnail_path: getFullUrl(req, thumbnailPath),
                uploaded_at: new Date().toISOString(),
                task_status: 'pending' // Add initial status
            }
        });

    } catch (error) {
        console.error('文件上传处理失败:', error);
        // 如果发生错误，清理已上传的文件
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: error.message || '文件上传失败' });
    }
});

// 重命名文件
router.put('/:id/rename', async (req, res) => {
    const { id: fileId } = req.params;
    const { name } = req.body;
    const { id: userId } = req.user;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: '文件名不能为空' });
    }

    try {
        // 验证所有权
        const [files] = await pool.execute(
            `SELECT f.project_id, p.user_id 
             FROM files f
             JOIN projects p ON f.project_id = p.id
             WHERE f.id = ?`,
            [fileId]
        );
        if (files.length === 0) return res.status(404).json({ message: '文件不存在' });
        if (files[0].user_id !== userId) return res.status(403).json({ message: '无权修改此文件' });

        // 更新文件名
        await pool.execute(
            'UPDATE files SET original_name = ? WHERE id = ?',
            [name.trim(), fileId]
        );

        // 更新项目最后操作时间和操作人
        await updateProjectLastOperation(files[0].project_id, userId);

        res.json({ message: '文件名更新成功' });
    } catch (error) {
        console.error('重命名文件失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 删除文件
router.delete('/:id', async (req, res) => {
    const { id: fileId } = req.params;
    const { id: userId } = req.user;

    try {
        // 验证所有权并获取文件路径
        const [files] = await pool.execute(
            `SELECT f.file_path, f.thumbnail_path, f.project_id, p.user_id 
             FROM files f
             JOIN projects p ON f.project_id = p.id
             WHERE f.id = ?`,
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }
        // 允许admin全局删除
        if (files[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作此文件' });
        }

        const { file_path, thumbnail_path, project_id } = files[0];

        // 从文件系统删除主文件和缩略图
        if (file_path && fs.existsSync(file_path)) fs.unlinkSync(file_path);
        if (thumbnail_path && fs.existsSync(thumbnail_path)) fs.unlinkSync(thumbnail_path);
        
        // 从数据库删除记录
        await pool.execute('DELETE FROM files WHERE id = ?', [fileId]);
        
        // 更新项目最后操作时间和操作人
        await updateProjectLastOperation(project_id, userId);

        res.status(200).json({ message: '文件删除成功' });
    } catch (error) {
        console.error('删除文件失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 获取文件列表
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        // 验证项目权限（NULL视为personal权限）
        const userPermission = req.user.permission || 'personal';
        let sql, params;
        
        if (userPermission === 'global' || userPermission === 'readonly_global') {
            // 全局权限：可以访问任何项目的文件
            sql = 'SELECT id FROM projects WHERE id = ?';
            params = [projectId];
        } else {
            // 个人权限：只能访问自己的项目文件
            sql = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
            params = [projectId, req.user.id];
        }

        const [projects] = await pool.execute(sql, params);

        if (projects.length === 0) {
            return res.status(404).json({ message: '项目不存在或无权访问' });
        }

        const [files] = await pool.execute(
            'SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC',
            [projectId]
        );

        const processedFiles = files.map(file => ({
            ...file,
            file_path: getFullUrl(req, file.file_path),
            stream_url: file.mime_type.startsWith('video/') ? getVideoStreamUrl(req, file.id) : null,
            thumbnail_path: getFullUrl(req, file.thumbnail_path)
        }));

        res.json({ files: processedFiles });
    } catch (error) {
        console.error('获取文件列表错误:', error);
        res.status(500).json({ message: '获取文件列表失败' });
    }
});

// 文件下载/预览
router.get('/:fileId/download', async (req, res) => {
    try {
        const { fileId } = req.params;

        // 获取文件信息并验证权限
        const [files] = await pool.execute(`
            SELECT f.*, p.user_id 
            FROM files f 
            JOIN projects p ON f.project_id = p.id 
            WHERE f.id = ?
        `, [fileId]);

        if (files.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        const file = files[0];
        if (file.user_id !== req.user.id) {
            return res.status(403).json({ message: '没有权限访问此文件' });
        }

        if (!fs.existsSync(file.file_path)) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 设置响应头
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Length', file.file_size);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);

        // 流式传输文件
        const fileStream = fs.createReadStream(file.file_path);
        fileStream.pipe(res);
    } catch (error) {
        console.error('文件下载错误:', error);
        res.status(500).json({ message: '文件下载失败' });
    }
});

// 更新文件的解析结果
router.put('/:id/analysis-result', async (req, res) => {
    const { id: fileId } = req.params;
    const { result } = req.body;
    const { id: userId } = req.user;

    if (!result) {
        return res.status(400).json({ message: '解析结果不能为空' });
    }

    try {
        // 验证文件所有权
        const [files] = await pool.execute(
            `SELECT f.id, p.user_id 
             FROM files f
             JOIN projects p ON f.project_id = p.id
             WHERE f.id = ?`,
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }
        if (files[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改此文件' });
        }

        // 查找该文件最新的任务记录
        const [tasks] = await pool.execute(
            'SELECT id FROM ai_tasks WHERE file_id = ? ORDER BY created_at DESC LIMIT 1',
            [fileId]
        );

        if (tasks.length > 0) {
            // 更新现有任务的结果
            await pool.execute(
                'UPDATE ai_tasks SET result = ?, status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                [result, tasks[0].id]
            );
        } else {
            // 如果没有任务记录，创建一个新的
            const [projects] = await pool.execute(
                'SELECT id FROM projects WHERE id = (SELECT project_id FROM files WHERE id = ?)',
                [fileId]
            );
            
            if (projects.length > 0) {
                await pool.execute(
                    'INSERT INTO ai_tasks (project_id, file_id, prompt, result, status, completed_at) VALUES (?, ?, ?, ?, "completed", CURRENT_TIMESTAMP)',
                    [projects[0].id, fileId, '手动编辑', result]
                );
            }
        }
        res.json({ message: '解析结果更新成功' });
    } catch (error) {
        console.error('更新解析结果失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 视频流服务 - 支持通过URL参数或Authorization头部认证
router.get('/:fileId/stream', async (req, res) => {
    try {
        const { fileId } = req.params;
        const range = req.headers.range;
        
        // 从URL参数或Authorization头部获取token
        const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: '缺少访问令牌' });
        }

        // 验证token
        const jwt = require('jsonwebtoken');
        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ message: '无效的访问令牌' });
        }

        // 获取文件信息并验证权限
        const [files] = await pool.execute(`
            SELECT f.*, p.user_id 
            FROM files f 
            JOIN projects p ON f.project_id = p.id 
            WHERE f.id = ?
        `, [fileId]);

        if (files.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        const file = files[0];
        
        // 验证权限 - 允许项目所有者和管理员访问
        if (file.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: '没有权限访问此文件' });
        }

        if (!fs.existsSync(file.file_path)) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 只处理视频文件
        if (!file.mime_type.startsWith('video/')) {
            return res.status(400).json({ message: '此接口仅支持视频文件' });
        }

        const fileSize = file.file_size;

        if (range) {
            // 处理Range请求，支持视频的seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                return;
            }

            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(file.file_path, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': file.mime_type,
                'Cache-Control': 'public, max-age=3600',
            };

            res.writeHead(206, head);
            fileStream.pipe(res);
        } else {
            // 完整文件响应
            const head = {
                'Content-Length': fileSize,
                'Content-Type': file.mime_type,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
            };
            res.writeHead(200, head);
            fs.createReadStream(file.file_path).pipe(res);
        }
    } catch (error) {
        console.error('视频流服务错误:', error);
        res.status(500).json({ message: '视频流服务失败' });
    }
});

module.exports = router; 