# JCC Factory - 视频内容创作工厂

一个基于AI的视频内容分析与整合平台，支持视频上传、AI分析、剧本整合等功能。

## 功能特性

### 🎥 视频管理
- **视频上传**: 支持多种视频格式（MP4, AVI, MOV, WMV, MKV）
- **在线播放**: 支持视频在线播放，带有认证和流媒体功能
- **视频预览**: 自动生成视频缩略图
- **视频信息**: 显示视频时长、文件大小等详细信息

### 🎬 视频播放增强功能
- **流媒体播放**: 支持HTTP Range请求，实现大文件的流式播放
- **认证访问**: 基于JWT token的安全访问控制
- **智能降级**: 自动在流媒体接口和静态文件之间切换
- **错误处理**: 完善的错误提示和重试机制
- **多格式支持**: 支持浏览器兼容的各种视频格式

### 🤖 AI内容分析
- **视频分析**: 使用Google Gemini模型分析视频内容
- **自定义Prompt**: 支持自定义分析提示词
- **批量处理**: 支持多个视频文件的批量分析
- **结果编辑**: 支持手动编辑和完善AI分析结果

### 📝 剧本整合
- **智能整合**: 基于AI分析结果生成完整剧本
- **模板支持**: 支持自定义整合模板
- **导出功能**: 支持剧本导出和下载

### 👥 用户管理
- **多用户支持**: 支持多用户注册和登录
- **权限控制**: 基于角色的访问控制
- **项目隔离**: 用户数据完全隔离

## 技术架构

### 前端技术栈
- **React 18**: 现代React框架
- **Ant Design**: 企业级UI组件库
- **Vite**: 高性能构建工具
- **Axios**: HTTP客户端

### 后端技术栈
- **Node.js**: 服务端运行环境
- **Express.js**: Web应用框架
- **MySQL**: 关系型数据库
- **JWT**: 身份认证
- **Multer**: 文件上传处理
- **FFmpeg**: 视频处理

### AI服务
- **Google Gemini**: AI内容分析
- **Python服务**: AI接口封装

## 安装与部署

### 环境要求
- Node.js 16+
- MySQL 8.0+
- Python 3.8+
- FFmpeg

### 快速启动

1. **克隆项目**
```bash
git clone <repository-url>
cd jcc-factory
```

2. **安装依赖**
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install

# 安装Python依赖
cd ../server/python_services
pip install -r requirements.txt
```

3. **环境配置**
```bash
# 复制环境变量模板
cp server/env.example server/.env

# 编辑环境变量
nano server/.env
```

4. **数据库初始化**
```bash
# 初始化数据库
cd server
node scripts/migrate-database.js

# 创建管理员用户
node scripts/setup-admin.js
```

5. **启动服务**
```bash
# 启动后端服务
cd server
npm start

# 启动前端服务
cd ../client
npm run dev
```

## 视频播放功能详解

### 播放机制
1. **优先级策略**: 优先使用认证流媒体接口，失败时降级到静态文件
2. **认证方式**: 通过URL参数传递JWT token，解决video标签无法携带认证头的问题
3. **流媒体支持**: 支持HTTP Range请求，实现视频的seeking和渐进式加载
4. **缓存优化**: 适当的缓存策略提升播放性能

### 接口说明
- `GET /api/files/:fileId/stream`: 认证流媒体接口
- `GET /api/files/:fileId/download`: 文件下载接口
- `GET /uploads/*`: 静态文件服务

### 错误处理
- 网络错误自动重试
- 格式不支持时提供下载选项
- 权限错误时显示详细提示
- 完善的错误日志记录

## 配置说明

### 环境变量
```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=jcc_factory

# JWT配置
JWT_SECRET=your-secret-key

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=500MB

# AI服务配置
GEMINI_API_KEY=your-gemini-api-key
GEMINI_DEFAULT_MODEL=gemini-1.5-flash

# 服务器配置
PORT=3001
NODE_ENV=development
```

### 支持的视频格式
- MP4 (推荐)
- AVI
- MOV
- WMV
- MKV

### 性能优化建议
1. **视频格式**: 推荐使用MP4格式，兼容性最好
2. **文件大小**: 建议单个文件不超过500MB
3. **网络配置**: 配置适当的CDN加速
4. **缓存策略**: 启用浏览器缓存和服务端缓存

## 故障排除

### 视频无法播放
1. 检查文件格式是否支持
2. 验证网络连接
3. 查看浏览器控制台错误信息
4. 确认用户权限

### 上传失败
1. 检查文件大小限制
2. 验证文件格式
3. 确认磁盘空间
4. 检查服务器日志

## 更新日志

### v1.1.0 (2024-01-XX)
- ✨ 新增视频在线播放功能
- 🔒 增强访问权限控制
- 🎬 支持HTTP Range请求
- 📱 改进移动端播放体验
- 🐛 修复多个已知问题

### v1.0.0 (2024-01-XX)
- 🎉 初始版本发布
- 📹 基础视频上传功能
- 🤖 AI内容分析
- 📝 剧本整合功能

## 贡献指南

欢迎提交Pull Request和Issue。请确保：

1. 代码符合项目规范
2. 包含适当的测试
3. 更新相关文档
4. 提供详细的变更说明

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件至: [your-email@example.com]
