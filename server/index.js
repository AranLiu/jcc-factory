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
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'http://your-domain.com' : 'http://localhost:5173',
    credentials: true
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
app.use('/api/gemini-proxy', require('./routes/geminiProxy'));

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
        
        // 启动Gemini代理服务
        try {
            const geminiProxyService = require('./services/geminiProxyService');
            const proxyStarted = await geminiProxyService.startProxy();
            if (proxyStarted) {
                console.log('✅ Gemini代理服务启动成功 (端口: 8080)');
            } else {
                console.warn('⚠️ Gemini代理服务启动失败或跳过');
            }
        } catch (error) {
            console.warn('⚠️ Gemini代理服务启动异常:', error.message);
            // 不要让代理服务的错误阻止主服务器启动
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