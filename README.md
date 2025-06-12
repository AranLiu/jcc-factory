# 剧柴柴 - 短剧本工坊

一个基于AI的视频/小说解析平台，支持批量上传文件并使用Google Gemini模型进行智能分析。

## 功能特性

- 🎬 **短剧Pro**: 支持视频文件上传和AI分析
- 📚 **小说Pro**: 支持文本文档上传和AI分析  
- 🤖 **AI模型**: 集成Google Gemini进行内容解析
- 📁 **项目管理**: 完整的项目创建、管理、删除功能
- 🔄 **实时处理**: 异步AI分析任务，实时状态更新
- 🎥 **在线播放**: 支持视频文件在线预览播放
- 👥 **用户管理**: 简单的认证系统，内部使用
- ⚙️ **系统配置**: 图形化配置界面，支持AI模型和代理设置

## 技术栈

### 后端
- **Node.js** + Express.js
- **MySQL** 数据库
- **Google Gemini AI** 模型
- **JWT** 身份认证
- **Multer** 文件上传

### 前端  
- **React 18** + Vite
- **Ant Design** UI组件库
- **React Router** 路由管理
- **Axios** HTTP客户端

## 环境要求

- Node.js 16+
- MySQL 5.7+
- Google Gemini API密钥

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-username/jcc-factory.git
cd jcc-factory
```

### 2. 安装依赖
```bash
npm run install:all
```

### 3. 数据库配置

#### 创建数据库
```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source server/database/init.sql
```

#### 配置环境变量
```bash
# 复制环境变量配置文件
cp server/env.example server/.env

# 编辑配置文件
nano server/.env
```

在 `server/.env` 文件中配置以下信息：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=jcc_factory

# JWT密钥（请生成一个强密钥）
JWT_SECRET=your_very_strong_jwt_secret_key_here

# Google Gemini API密钥
GEMINI_API_KEY=your_gemini_api_key_here

# 服务器配置
PORT=3001
NODE_ENV=development

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=500MB
```

### 4. 创建管理员用户

```bash
npm run setup:admin
```

### 5. 启动服务

```bash
# 开发模式启动（同时启动前后端）
npm run dev

# 或者分别启动
npm run dev:server  # 启动后端 (http://localhost:3001)
npm run dev:client  # 启动前端 (http://localhost:5173)
```

### 6. 访问应用

打开浏览器访问 `http://localhost:5173`

默认登录信息：
- 用户名: `admin`
- 密码: `admin123`

### 7. 系统配置 ⚙️

登录后，管理员用户可以通过以下方式进行系统配置：

1. **进入配置页面**
   - 点击右上角头像菜单
   - 选择"系统配置"（仅管理员可见）

2. **AI模型配置**
   - **API密钥**: 设置Google Gemini API密钥
   - **默认模型**: 选择默认使用的AI模型
   - **可用模型**: 管理可用模型列表，支持添加/删除
   - **连接测试**: 一键测试API连接状态

3. **代理配置**（可选）
   - **启用开关**: 一键开启/关闭代理
   - **HTTP代理**: 设置HTTP代理服务器地址
   - **HTTPS代理**: 设置HTTPS代理服务器地址
   - **排除地址**: 设置不使用代理的地址列表
   - **连接测试**: 验证代理配置是否正常

4. **配置特性**
   - ✅ **实时生效**: 配置修改后立即生效，无需重启
   - ✅ **状态监控**: 实时显示各组件连接状态
   - ✅ **一键测试**: 快速验证配置正确性
   - ✅ **热更新**: 支持不停机配置更新

## 项目结构

```
jcc-factory/
├── client/                 # 前端代码 (React + Vite)
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   └── utils/         # 工具函数
│   └── package.json
├── server/                 # 后端代码 (Node.js + Express)
│   ├── routes/            # API路由
│   ├── services/          # 业务逻辑
│   ├── config/            # 配置文件
│   ├── database/          # 数据库脚本
│   └── package.json
├── netlify/               # Netlify函数 (Gemini代理)
│   └── functions/
├── scripts/               # 工具脚本
└── package.json          # 项目管理
```

## 部署

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
# 构建前端
npm run build

# 启动后端
cd server && npm start
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！ 
