const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 设置默认的JWT_SECRET（如果环境变量中没有）
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'jcc_factory_jwt_secret_key_2024_stable_version';
    console.log('🔑 使用默认JWT密钥');
}

const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// 创建上传目录
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ 创建上传目录:', uploadDir);
}

// 中间件配置
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            mediaSrc: ["'self'", "blob:", "data:", "http://localhost:3001"],
            connectSrc: ["'self'", "http://localhost:3001"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174', 
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
        'http://127.0.0.1:5177',
        'http://127.0.0.1:5178'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept', 'Accept-Ranges'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
}));

// 限流配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100次请求
    message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        // 设置视频文件的正确MIME类型和缓存策略
        if (filePath.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
        } else if (filePath.endsWith('.avi')) {
            res.setHeader('Content-Type', 'video/x-msvideo');
        } else if (filePath.endsWith('.mov')) {
            res.setHeader('Content-Type', 'video/quicktime');
        } else if (filePath.endsWith('.wmv')) {
            res.setHeader('Content-Type', 'video/x-ms-wmv');
        } else if (filePath.endsWith('.mkv')) {
            res.setHeader('Content-Type', 'video/x-matroska');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        
        // 支持Range请求
        res.setHeader('Accept-Ranges', 'bytes');
        
        // 设置CORS头 - 允许所有来源访问静态文件
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
        
        // 缓存策略
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // 确保图片能够跨域显示
        if (filePath.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
    }
}));
app.use('/knowledge_base_files', express.static(path.join(process.cwd(), 'knowledge_base_files')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/files', require('./routes/files'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/knowledge-base', require('./routes/knowledgeBase'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/system-config', require('./routes/systemConfig'));

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 404处理
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API路由不存在' });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ 
        message: process.env.NODE_ENV === 'production' ? '内部服务器错误' : error.message 
    });
});

// 启动服务器
async function startServer() {
    try {
        // 测试数据库连接
        await testConnection();
        
        // 加载系统配置
        try {
            const systemConfigService = require('./services/systemConfigService');
            await systemConfigService.applyConfigs();
            console.log('✅ 系统配置加载完成');
        } catch (error) {
            console.warn('⚠️ 系统配置加载失败，使用环境变量默认值:', error.message);
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 服务器启动成功: http://localhost:${PORT}`);
            console.log(`📝 API文档: http://localhost:${PORT}/api/health`);
            console.log(`🗂️  上传目录: ${path.resolve(uploadDir)}`);
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

startServer(); 