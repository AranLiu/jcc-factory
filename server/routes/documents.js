const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mammoth = require('mammoth');
const htmlToDocx = require('html-to-docx');
const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.doc', '.docx', '.txt', '.html'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

// 确保上传目录存在
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads/documents');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 保存文档内容
router.post('/save', async (req, res) => {
  try {
    const { title, content, format = 'json' } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    await ensureUploadDir();
    
    const filename = `${title}-${Date.now()}.${format}`;
    const filepath = path.join(__dirname, '../uploads/documents', filename);
    
    // 根据格式保存文件
    let fileContent;
    if (format === 'json') {
      fileContent = JSON.stringify({ title, content, createdAt: new Date() }, null, 2);
    } else if (format === 'html') {
      fileContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;
    } else {
      fileContent = content;
    }
    
    await fs.writeFile(filepath, fileContent, 'utf8');
    
    res.json({
      message: '文档保存成功',
      filename,
      filepath: `/api/documents/download/${filename}`
    });
  } catch (error) {
    console.error('保存文档失败:', error);
    res.status(500).json({ error: '保存文档失败' });
  }
});

// 获取文档列表
router.get('/list', async (req, res) => {
  try {
    await ensureUploadDir();
    const documentsDir = path.join(__dirname, '../uploads/documents');
    const files = await fs.readdir(documentsDir);
    
    const documents = await Promise.all(
      files.map(async (file) => {
        const filepath = path.join(documentsDir, file);
        const stats = await fs.stat(filepath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          downloadUrl: `/api/documents/download/${file}`
        };
      })
    );
    
    res.json(documents.sort((a, b) => b.modifiedAt - a.modifiedAt));
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// 获取单个文档内容
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/documents', filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filepath);
    } catch (error) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    const ext = path.extname(filename).toLowerCase();
    const content = await fs.readFile(filepath, 'utf8');
    
    // 根据文件类型返回不同格式的内容
    if (ext === '.json') {
      const data = JSON.parse(content);
      res.json(data);
    } else {
      res.json({ content, filename });
    }
  } catch (error) {
    console.error('获取文档失败:', error);
    res.status(500).json({ error: '获取文档失败' });
  }
});

// 下载文档
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/documents', filename);
    
    // 检查文件是否存在
    try {
      await fs.access(filepath);
    } catch (error) {
      return res.status(404).json({ error: '文档不存在' });
    }
    
    res.download(filepath, filename);
  } catch (error) {
    console.error('下载文档失败:', error);
    res.status(500).json({ error: '下载文档失败' });
  }
});

// 上传文档
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }
    
    const { filename, originalname, mimetype, size } = req.file;
    const filepath = req.file.path;
    
    // 处理不同格式的文件
    let content = '';
    const ext = path.extname(originalname).toLowerCase();
    
    if (ext === '.docx') {
      // 使用mammoth处理docx文件
      const result = await mammoth.extractRawText({ path: filepath });
      content = result.value;
    } else if (ext === '.txt' || ext === '.html') {
      content = await fs.readFile(filepath, 'utf8');
    }
    
    res.json({
      message: '文档上传成功',
      filename: originalname,
      content,
      uploadedFile: filename,
      downloadUrl: `/api/documents/download/${filename}`
    });
  } catch (error) {
    console.error('上传文档失败:', error);
    res.status(500).json({ error: '上传文档失败' });
  }
});

// 将HTML内容转换为DOCX
router.post('/convert/html-to-docx', async (req, res) => {
  try {
    const { htmlContent, title = 'document' } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML内容不能为空' });
    }
    
    // 转换HTML为DOCX
    const docxBuffer = await htmlToDocx(htmlContent, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    
    const filename = `${title}-${Date.now()}.docx`;
    const filepath = path.join(__dirname, '../uploads/documents', filename);
    
    await fs.writeFile(filepath, docxBuffer);
    
    res.json({
      message: '转换成功',
      filename,
      downloadUrl: `/api/documents/download/${filename}`
    });
  } catch (error) {
    console.error('HTML转DOCX失败:', error);
    res.status(500).json({ error: 'HTML转DOCX失败' });
  }
});

// 删除文档
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/documents', filename);
    
    try {
      await fs.access(filepath);
      await fs.unlink(filepath);
      res.json({ message: '文档删除成功' });
    } catch (error) {
      res.status(404).json({ error: '文档不存在' });
    }
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ error: '删除文档失败' });
  }
});

// 搜索文档
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const documentsDir = path.join(__dirname, '../uploads/documents');
    
    await ensureUploadDir();
    const files = await fs.readdir(documentsDir);
    
    const matchedDocuments = [];
    
    for (const file of files) {
      const filepath = path.join(documentsDir, file);
      const stats = await fs.stat(filepath);
      
      // 检查文件名是否匹配
      if (file.toLowerCase().includes(query.toLowerCase())) {
        matchedDocuments.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          downloadUrl: `/api/documents/download/${file}`,
          matchType: 'filename'
        });
        continue;
      }
      
      // 检查文件内容是否匹配（仅限文本文件）
      const ext = path.extname(file).toLowerCase();
      if (['.txt', '.json', '.html'].includes(ext)) {
        try {
          const content = await fs.readFile(filepath, 'utf8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            matchedDocuments.push({
              filename: file,
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              downloadUrl: `/api/documents/download/${file}`,
              matchType: 'content'
            });
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    }
    
    res.json(matchedDocuments.sort((a, b) => b.modifiedAt - a.modifiedAt));
  } catch (error) {
    console.error('搜索文档失败:', error);
    res.status(500).json({ error: '搜索文档失败' });
  }
});

// 更新知识库文件内容
router.put('/knowledge-base/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '文档内容不能为空' });
    }

    // 这里需要与知识库系统集成
    // 假设我们有知识库的API来获取文件路径
    // 实际实现时需要调用知识库的API或数据库查询
    
    res.json({
      message: '文档更新成功',
      fileId,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ error: '更新文档失败' });
  }
});

module.exports = router; 