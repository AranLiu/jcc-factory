const express = require('express');
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Files will be stored in a user-specific directory
        const userUploadsDir = path.join(process.cwd(), 'knowledge_base_files', String(req.user.id));
        if (!fs.existsSync(userUploadsDir)) {
            fs.mkdirSync(userUploadsDir, { recursive: true });
        }
        cb(null, userUploadsDir);
    },
    filename: (req, file, cb) => {
        // Use original file name, but sanitize it and add a timestamp to avoid conflicts
        const sanitizedName = file.originalname.replace(/[\/\\?%*:|"<>]/g, '-');
        cb(null, `${Date.now()}-${sanitizedName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'text/plain'
        ) {
            cb(null, true);
        } else {
            cb(null, false);
            // Passing an error to cb in fileFilter will be caught by Express error handler
            const err = new Error('只允许上传 .doc, .docx, .txt 文件!');
            err.status = 400;
            return cb(err);
        }
    }
});

// All routes require authentication
router.use(authenticateToken);

// POST /api/knowledge-base/upload - Upload a new file
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { id: userId } = req.user;
    const { originalname, path: filePath, mimetype, size } = req.file;

    // Use a relative path for storing in the database
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    try {
        const [result] = await pool.execute(
            'INSERT INTO knowledge_base (user_id, title, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
            [userId, originalname, relativePath, mimetype, size]
        );
        const insertedId = result.insertId;
        res.status(201).json({
            message: 'File uploaded successfully.',
            fileId: insertedId,
            filePath: relativePath
        });
    } catch (error) {
        console.error('Failed to save file info to database:', error);
        // If DB insert fails, delete the uploaded file
        fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Internal server error while saving file information.' });
    }
});

// DELETE /api/knowledge-base/:id - Delete a file
router.delete('/:id', async (req, res) => {
    const { id: entryId } = req.params;
    const { id: userId } = req.user;

    try {
        // 1. Get file path from DB to verify ownership and for deletion
        const [entries] = await pool.execute(
            'SELECT file_path, user_id FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: 'File not found.' });
        }
        if (entries[0].user_id !== userId) {
            return res.status(403).json({ message: 'You do not have permission to delete this file.' });
        }

        // 2. Delete from filesystem (only if file_path exists)
        if (entries[0].file_path) {
            const absolutePath = path.join(process.cwd(), entries[0].file_path);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        // 3. Delete from database (tags are handled by ON DELETE CASCADE)
        await pool.execute('DELETE FROM knowledge_base WHERE id = ?', [entryId]);

        res.status(200).json({ message: 'File deleted successfully.' });

    } catch (error) {
        console.error(`Failed to delete file entry ${entryId}:`, error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// 存档（创建DOCX文件）
router.post('/archive', async (req, res) => {
    const { title, content, projectId } = req.body;
    const { id: userId } = req.user;

    if (!title || !content || !projectId) {
        return res.status(400).json({ message: '标题、内容和项目ID均不能为空' });
    }

    // 1. 定义知识库文件存储目录
    const knowledgeBaseDir = path.join(process.cwd(), 'knowledge_base_files', String(userId));
    if (!fs.existsSync(knowledgeBaseDir)) {
        fs.mkdirSync(knowledgeBaseDir, { recursive: true });
    }

    // 2. 创建 DOCX 文档，专门针对剧本格式进行优化
    const doc = new Document({
        creator: "JCC Factory",
        title: title,
        description: "剧本整合存档",
        sections: [{
            properties: {},
            children: [
                // 添加文档标题
                new Paragraph({
                    children: [new TextRun({
                        text: title,
                        bold: true,
                        size: 32 // 16pt
                    })],
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 400,
                        before: 200
                    }
                }),
                // 添加内容
                ...content.split('\n').map((textLine, index) => {
                    // 如果是空行，创建空段落
                    if (textLine.trim() === '') {
                        return new Paragraph({
                            children: [new TextRun('')],
                        });
                    }
                    
                    // 检查是否是标题行（通常剧本标题会包含特定格式）
                    if (textLine.includes('第') && textLine.includes('集') || 
                        textLine.includes('场景') || 
                        textLine.includes('SCENE') ||
                        textLine.startsWith('=') ||
                        textLine.startsWith('#')) {
                        return new Paragraph({
                            children: [new TextRun({
                                text: textLine,
                                bold: true,
                                size: 28 // 14pt
                            })],
                            heading: HeadingLevel.HEADING_1,
                            spacing: {
                                after: 200, // 段后间距
                                before: 200 // 段前间距
                            }
                        });
                    }
                    
                    // 检查是否是角色名称（通常全大写或以冒号结尾）
                    if (textLine.match(/^[A-Z\u4e00-\u9fa5]+[:：]/) || 
                        textLine.match(/^[A-Z\u4e00-\u9fa5]+\s*\(/) ||
                        (textLine === textLine.toUpperCase() && textLine.length < 20 && textLine.length > 1)) {
                        return new Paragraph({
                            children: [new TextRun({
                                text: textLine,
                                bold: true,
                                color: '0066CC'
                            })],
                            spacing: {
                                after: 100,
                                before: 100
                            }
                        });
                    }
                    
                    // 检查是否是舞台指示（通常包含在括号中）
                    if (textLine.match(/^\s*[（(].*[）)]\s*$/)) {
                        return new Paragraph({
                            children: [new TextRun({
                                text: textLine,
                                italics: true,
                                color: '666666'
                            })],
                            spacing: {
                                after: 100
                            }
                        });
                    }
                    
                    // 普通文本段落
                    return new Paragraph({
                        children: [new TextRun(textLine)],
                        spacing: {
                            after: 100
                        }
                    });
                })
            ],
        }],
    });

    // 3. 将文档写入文件系统
    const sanitizedTitle = title.replace(/[\/\\?%*:|"<>]/g, '-'); // 清理文件名
    const docxFilename = `${sanitizedTitle}-${Date.now()}.docx`;
    const docxFilePath = path.join(knowledgeBaseDir, docxFilename);
    const relativeDocxPath = path.relative(process.cwd(), docxFilePath).replace(/\\/g, '/');

    try {
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(docxFilePath, buffer);

        // 4. 将文件元信息存入数据库
        const fileSize = buffer.length; // DOCX文件的大小
        // 确保标题以.docx结尾，以便前端正确显示文件类型
        const titleWithExtension = title.endsWith('.docx') ? title : `${title}.docx`;
        await pool.execute(
            'INSERT INTO knowledge_base (project_id, user_id, title, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
            [projectId, userId, titleWithExtension, relativeDocxPath, 'docx', fileSize]
        );

        res.status(201).json({ message: '成功存档为DOCX文件' });

    } catch (error) {
        console.error('存档为DOCX失败:', error);
        // 如果出错，尝试删除已生成的文件
        if (fs.existsSync(docxFilePath)) {
            fs.unlinkSync(docxFilePath);
        }
        res.status(500).json({ message: '服务器内部错误，存档失败' });
    }
});

// GET /api/knowledge-base/ - Get knowledge base list, with tag filtering
router.get('/', async (req, res) => {
    const { id: userId } = req.user;
    const { tagIds } = req.query; // e.g., ?tagIds=1,2,3

    try {
        let query = `
            SELECT kb.*, GROUP_CONCAT(t.id) as tag_ids, GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.color) as tag_colors
            FROM knowledge_base kb
            LEFT JOIN knowledge_base_tags kbt ON kb.id = kbt.knowledge_base_id
            LEFT JOIN tags t ON kbt.tag_id = t.id
            WHERE kb.user_id = ?
        `;
        const params = [userId];

        if (tagIds) {
            const tagIdArray = tagIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
            if(tagIdArray.length > 0) {
                // 为 IN 子句创建占位符
                const placeholders = tagIdArray.map(() => '?').join(',');
                query += `
                   AND kb.id IN (
                        SELECT knowledge_base_id
                        FROM knowledge_base_tags
                        WHERE tag_id IN (${placeholders})
                        GROUP BY knowledge_base_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )
                `;
                // 添加每个标签ID到参数数组
                params.push(...tagIdArray);
                params.push(tagIdArray.length);
            }
        }

        query += ' GROUP BY kb.id ORDER BY kb.created_at DESC';

        const [items] = await pool.execute(query, params);

        const processedItems = items.map(item => ({
            ...item,
            tags: item.tag_ids ? item.tag_ids.split(',').map((id, index) => ({
                id: parseInt(id),
                name: item.tag_names.split(',')[index],
                color: item.tag_colors.split(',')[index]
            })) : [],
            tag_ids: undefined, // remove redundant fields
            tag_names: undefined,
            tag_colors: undefined
        }));

        res.json({ items: processedItems });

    } catch (error) {
        console.error('Failed to get knowledge base list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/knowledge-base/:id/content - 获取文件内容用于预览
router.get('/:id/content', async (req, res) => {
    const { id: entryId } = req.params;
    const { id: userId } = req.user;

    try {
        // 1. 从数据库获取文件信息
        const [entries] = await pool.execute(
            'SELECT file_path, user_id, file_type, content FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        const entry = entries[0];

        // 2. 验证所有权
        if (entry.user_id !== userId) {
            return res.status(403).json({ message: '无权访问此文件' });
        }

        // 3. 如果有文件路径，读取DOCX文件并转换为文本
        if (entry.file_path) {
            const absolutePath = path.join(process.cwd(), entry.file_path);

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({ message: '文件在服务器上不存在' });
            }

            try {
                // 使用 mammoth 提取纯文本内容
                const result = await mammoth.extractRawText({ path: absolutePath });
                const textContent = result.value;

                res.json({ content: textContent });
            } catch (error) {
                console.error('提取DOCX文本内容失败:', error);
                res.status(500).json({ message: '无法读取文件内容' });
            }
        } else if (entry.content) {
            // 如果没有文件路径但有存储的内容
            res.json({ content: entry.content });
        } else {
            res.json({ content: '暂无内容' });
        }

    } catch (error) {
        console.error(`获取文件内容失败 ID ${entryId}:`, error);
        res.status(500).json({ message: '获取文件内容失败' });
    }
});

// GET /api/knowledge-base/:id/preview - 预览DOCX文件内容
router.get('/:id/preview', async (req, res) => {
    const { id: entryId } = req.params;
    const { id: userId } = req.user;

    try {
        // 1. 从数据库获取文件路径
        const [entries] = await pool.execute(
            'SELECT file_path, user_id FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 2. 验证所有权
        if (entries[0].user_id !== userId) {
            return res.status(403).json({ message: '无权访问此文件' });
        }

        const { file_path } = entries[0];
        
        // 检查是否有文件路径
        if (!file_path) {
            return res.status(400).json({ message: '此项目没有关联的文件，无法预览' });
        }
        
        const absolutePath = path.join(process.cwd(), file_path);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: '文件在服务器上不存在' });
        }

        // 3. 使用 mammoth 将 .docx 转换为 HTML
        const result = await mammoth.convertToHtml({ path: absolutePath });
        const html = result.value; // The generated HTML

        res.json({ html });

    } catch (error) {
        console.error(`预览文件ID ${entryId} 失败:`, error);
        res.status(500).json({ message: '无法生成文件预览' });
    }
});

// PUT /api/knowledge-base/:id/title - Update a knowledge item title
router.put('/:id/title', async (req, res) => {
    const { id: knowledgeBaseId } = req.params;
    const { title } = req.body;
    const { id: userId } = req.user;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title is required.' });
    }

    try {
        // Verify user owns the knowledge base item
        const [kbItems] = await pool.execute('SELECT user_id FROM knowledge_base WHERE id = ?', [knowledgeBaseId]);
        if (kbItems.length === 0 || kbItems[0].user_id !== userId) {
            return res.status(404).json({ message: 'Knowledge base item not found or permission denied.'});
        }

        await pool.execute(
            'UPDATE knowledge_base SET title = ? WHERE id = ?',
            [title.trim(), knowledgeBaseId]
        );
        res.status(200).json({ message: 'Title updated successfully.' });
    } catch (error) {
        console.error('Failed to update knowledge base item title:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST /api/knowledge-base/:id/tags - Add a tag to a knowledge item
router.post('/:id/tags', async (req, res) => {
    const { id: knowledgeBaseId } = req.params;
    const { tagId } = req.body;
    const { id: userId } = req.user;

    if (!tagId) {
        return res.status(400).json({ message: 'Tag ID is required.' });
    }

    try {
        // Verify user owns the knowledge base item
        const [kbItems] = await pool.execute('SELECT user_id FROM knowledge_base WHERE id = ?', [knowledgeBaseId]);
        if (kbItems.length === 0 || kbItems[0].user_id !== userId) {
            return res.status(404).json({ message: 'Knowledge base item not found or permission denied.'});
        }
        // Verify user owns the tag
        const [tags] = await pool.execute('SELECT user_id FROM tags WHERE id = ?', [tagId]);
        if (tags.length === 0 || tags[0].user_id !== userId) {
            return res.status(404).json({ message: 'Tag not found or permission denied.'});
        }

        await pool.execute(
            'INSERT INTO knowledge_base_tags (knowledge_base_id, tag_id) VALUES (?, ?)',
            [knowledgeBaseId, tagId]
        );
        res.status(201).json({ message: 'Tag added successfully.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This tag has already been added to the item.' });
        }
        console.error('Failed to add tag to knowledge base item:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// DELETE /api/knowledge-base/:id/tags/:tagId - Remove a tag from an item
router.delete('/:id/tags/:tagId', async (req, res) => {
    const { id: knowledgeBaseId, tagId } = req.params;
    const { id: userId } = req.user;

    try {
        // Verify ownership by checking if the user owns the knowledge base item.
        // A more complex check could join all three tables, but this is sufficient.
        const [kbItems] = await pool.execute('SELECT user_id FROM knowledge_base WHERE id = ?', [knowledgeBaseId]);
        if (kbItems.length === 0 || kbItems[0].user_id !== userId) {
            return res.status(404).json({ message: 'Knowledge base item not found or permission denied.'});
        }

        const [result] = await pool.execute(
            'DELETE FROM knowledge_base_tags WHERE knowledge_base_id = ? AND tag_id = ?',
            [knowledgeBaseId, tagId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tag association not found.' });
        }
        res.status(200).json({ message: 'Tag removed successfully.' });

    } catch (error) {
        console.error('Failed to remove tag from knowledge base item:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// GET /api/knowledge-base/:id/content - 获取文件的原始内容（用于编辑）
router.get('/:id/content', async (req, res) => {
    const { id: entryId } = req.params;
    const { id: userId } = req.user;

    try {
        // 获取文件信息
        const [entries] = await pool.execute(
            'SELECT file_path, user_id, file_type FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (entries[0].user_id !== userId) {
            return res.status(403).json({ message: '无权访问此文件' });
        }

        const { file_path, file_type } = entries[0];
        
        if (!file_path) {
            return res.status(400).json({ message: '此项目没有关联的文件' });
        }
        
        const absolutePath = path.join(process.cwd(), file_path);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: '文件在服务器上不存在' });
        }

        let content = '';

        // 根据文件类型读取内容
        if (file_type === 'text/plain') {
            content = fs.readFileSync(absolutePath, 'utf8');
        } else if (file_type.includes('wordprocessingml') || file_type.includes('msword')) {
            // 从DOCX文件提取纯文本
            const result = await mammoth.extractRawText({ path: absolutePath });
            content = result.value;
        } else {
            return res.status(400).json({ message: '不支持编辑此文件类型' });
        }

        res.json({ content });

    } catch (error) {
        console.error(`获取文件内容失败 ID ${entryId}:`, error);
        res.status(500).json({ message: '获取文件内容失败' });
    }
});

// PUT /api/knowledge-base/:id/content - 更新文件内容
router.put('/:id/content', async (req, res) => {
    const { id: entryId } = req.params;
    const { content } = req.body;
    const { id: userId } = req.user;

    if (!content) {
        return res.status(400).json({ message: '文档内容不能为空' });
    }

    try {
        // 获取文件信息
        const [entries] = await pool.execute(
            'SELECT file_path, user_id, file_type, title FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (entries[0].user_id !== userId) {
            return res.status(403).json({ message: '无权修改此文件' });
        }

        const { file_path, file_type, title } = entries[0];
        
        if (!file_path) {
            return res.status(400).json({ message: '此项目没有关联的文件' });
        }
        
        const absolutePath = path.join(process.cwd(), file_path);

        // 根据文件类型保存内容
        if (file_type === 'text/plain') {
            // 直接写入文本文件
            fs.writeFileSync(absolutePath, content, 'utf8');
        } else if (file_type.includes('wordprocessingml') || file_type.includes('msword')) {
            // 创建新的DOCX文件
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: content.split('\n').map(textLine =>
                        new Paragraph({
                            children: [new TextRun(textLine)],
                        })
                    ),
                }],
            });

            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(absolutePath, buffer);
            
            // 更新文件大小
            await pool.execute(
                'UPDATE knowledge_base SET file_size = ? WHERE id = ?',
                [buffer.length, entryId]
            );
        } else {
            return res.status(400).json({ message: '不支持编辑此文件类型' });
        }

        res.json({ 
            message: '文档更新成功',
            updatedAt: new Date()
        });

    } catch (error) {
        console.error(`更新文件内容失败 ID ${entryId}:`, error);
        res.status(500).json({ message: '更新文件内容失败' });
    }
});

// GET /api/knowledge-base/:id/download - 下载文件
router.get('/:id/download', async (req, res) => {
    const { id: entryId } = req.params;
    const { id: userId } = req.user;

    try {
        // 获取文件信息
        const [entries] = await pool.execute(
            'SELECT file_path, user_id, title FROM knowledge_base WHERE id = ?',
            [entryId]
        );

        if (entries.length === 0) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (entries[0].user_id !== userId) {
            return res.status(403).json({ message: '无权访问此文件' });
        }

        const { file_path, title } = entries[0];
        
        if (!file_path) {
            return res.status(400).json({ message: '此项目没有关联的文件' });
        }
        
        const absolutePath = path.join(process.cwd(), file_path);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: '文件在服务器上不存在' });
        }

        // 设置下载响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // 发送文件
        res.sendFile(absolutePath, (err) => {
            if (err) {
                console.error('文件下载失败:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: '文件下载失败' });
                }
            }
        });

    } catch (error) {
        console.error(`下载文件失败 ID ${entryId}:`, error);
        res.status(500).json({ message: '文件下载失败' });
    }
});

module.exports = router;