# 剧绕乐 - 短剧本工坊

一个基于AI的视频/小说解析平台，支持批量上传文件并使用Google Gemini模型进行智能分析。

## 功能特性

- 🎬 **短剧Pro**: 支持视频文件上传和AI分析
- 📚 **小说Pro**: 支持文本文档上传和AI分析  
- 🤖 **AI模型**: 集成Google Gemini进行内容解析
- 📁 **项目管理**: 完整的项目创建、管理、删除功能
- 🔄 **实时处理**: 异步AI分析任务，实时状态更新
- 🎥 **在线播放**: 支持视频文件在线预览播放
- 👥 **用户管理**: 简单的认证系统，内部使用

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
git clone <repository-url>
cd jcc-factory
```

### 2. 安装依赖
```bash
# 安装所有依赖
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

# 代理配置 (可选 - 用于解决区域访问限制)
# 注意：推荐使用系统配置页面进行图形化配置，这里的环境变量作为备用
HTTP_PROXY=
HTTPS_PROXY=
# 示例配置（请根据您的代理服务器设置）:
# HTTP_PROXY=http://your-proxy-server:8080
# HTTPS_PROXY=http://your-proxy-server:8080
# 支持用户名密码: http://username:password@proxy-server:8080

# 不使用代理的地址列表 (逗号分隔)
NO_PROXY=localhost,127.0.0.1

# 强制使用代理 (true/false)
FORCE_PROXY=false

# 调试模式 (显示详细代理信息)
GEMINI_DEBUG=false

# 服务器配置
PORT=3001
NODE_ENV=development

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=500MB
```

### 4. 创建管理员用户

由于这是内部系统，需要手动创建用户：

```bash
# 进入后端目录
cd server

# 创建用户脚本
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_mysql_password',
    database: 'jcc_factory'
  });
  
  const password = 'admin123'; // 请修改为更安全的密码
  const hash = await bcrypt.hash(password, 10);
  
  await connection.execute(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    ['admin', 'admin@jccfactory.com', hash]
  );
  
  console.log('管理员用户创建成功');
  console.log('用户名: admin');
  console.log('密码:', password);
  
  await connection.end();
}

createUser().catch(console.error);
"
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

3. **代理配置**
   - **启用开关**: 一键开启/关闭代理
   - **HTTP代理**: 设置HTTP代理服务器地址
   - **HTTPS代理**: 设置HTTPS代理服务器地址
   - **排除地址**: 设置不使用代理的地址列表
   - **连接测试**: 验证代理配置是否正常

4. **配置特性**
   - ✅ **实时生效**: 配置修改后立即生效，无需重启
   - ✅ **状态监控**: 实时显示各组件连接状态
   - ✅ **一键测试**: 快速验证配置正确性
   - ✅ **审计追踪**: 记录配置修改历史和操作人员
   - ✅ **热更新**: 支持不停机配置更新

5. **错误提示优化**
   - 当API密钥无效或代理连接失败时，系统会显示黄色警告提示
   - 提示信息："模型调用失败，请联系管理员检查系统配置"
   - 帮助用户快速定位问题并联系管理员

## API文档

### 认证相关
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/verify` - 验证Token
- `POST /api/auth/create-user` - 创建用户（管理员）

### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 文件管理
- `POST /api/files/upload` - 上传文件
- `GET /api/files/project/:projectId` - 获取项目文件
- `GET /api/files/:fileId/download` - 下载文件
- `DELETE /api/files/:fileId` - 删除文件

### AI分析
- `GET /api/ai/test` - 测试AI连接
- `POST /api/ai/analyze` - 创建分析任务
- `GET /api/ai/task/:taskId` - 获取任务状态
- `GET /api/ai/tasks/project/:projectId` - 获取项目任务

### 系统配置 (管理员权限)
- `GET /api/system-config` - 获取所有系统配置
- `GET /api/system-config/status` - 获取连接状态
- `PUT /api/system-config/gemini-key` - 更新Gemini API密钥
- `PUT /api/system-config/models` - 更新模型配置
- `PUT /api/system-config/proxy` - 更新代理配置
- `POST /api/system-config/test-gemini` - 测试Gemini连接
- `POST /api/system-config/test-proxy` - 测试代理连接
- `POST /api/system-config/apply` - 应用配置到运行环境
- `POST /api/system-config/clear-cache` - 清除配置缓存

## 部署指南

### 生产环境部署

1. **构建前端**
```bash
cd client
npm run build
```

2. **配置Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # 文件上传
    location /uploads/ {
        proxy_pass http://localhost:3001;
        client_max_body_size 500M;
    }
}
```

3. **使用PM2启动后端**
```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
cd server
pm2 start index.js --name "jcc-factory-server"

# 设置开机自启
pm2 startup
pm2 save
```

### 阿里云部署

1. **购买ECS服务器**
   - 选择合适的配置（建议2核4G以上）
   - 安装Ubuntu 20.04+

2. **安装环境**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 安装Nginx
sudo apt install nginx -y
```

3. **配置MySQL**
```bash
sudo mysql -u root -p
CREATE DATABASE jcc_factory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jcc_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON jcc_factory.* TO 'jcc_user'@'localhost';
FLUSH PRIVILEGES;
```

4. **部署应用**
```bash
# 克隆代码
git clone <your-repo> /var/www/jcc-factory
cd /var/www/jcc-factory

# 安装依赖
npm run install:all

# 配置环境变量
cp server/env.example server/.env
# 编辑配置文件...

# 导入数据库
mysql -u jcc_user -p jcc_factory < server/database/init.sql

# 构建前端
cd client && npm run build

# 启动后端
cd ../server
pm2 start index.js --name jcc-factory
```

### 代理配置指南

如果您的服务器位于无法直接访问Google Gemini API的地区（如中国大陆），需要通过代理服务器进行访问。

#### 1. 获取代理服务器

您可以选择以下代理方案：
- **自建代理服务器**：在可访问Google服务的地区搭建代理
- **商用代理服务**：使用第三方代理服务提供商
- **VPN服务**：配置支持HTTP代理的VPN

#### 2. 配置代理环境变量

在 `server/.env` 文件中添加代理配置：

```env
# HTTP代理配置
HTTP_PROXY=http://your-proxy-server:8080
HTTPS_PROXY=http://your-proxy-server:8080

# 如果代理需要认证
HTTP_PROXY=http://username:password@your-proxy-server:8080
HTTPS_PROXY=http://username:password@your-proxy-server:8080

# SOCKS5代理（可选）
SOCKS_PROXY=socks5://your-proxy-server:1080

# 不使用代理的地址列表
NO_PROXY=localhost,127.0.0.1,.local

# 强制使用代理
FORCE_PROXY=true

# 启用调试模式查看代理连接信息
GEMINI_DEBUG=true
```

#### 3. 测试代理连接

使用内置的代理测试工具验证配置：

```bash
cd server
node test-proxy-connection.js
```

测试工具会检查：
- 直连模式是否可用
- 代理模式是否配置正确
- API调用是否成功
- 文本生成功能是否正常

#### 4. 常见代理配置问题

**问题1: 代理连接超时**
```bash
# 解决方案：检查代理服务器地址和端口
# 确认防火墙设置允许连接
```

**问题2: 认证失败**
```bash
# 解决方案：检查用户名密码是否正确
# 特殊字符需要URL编码
```

**问题3: SSL证书问题**
```bash
# 临时解决：设置环境变量
export NODE_TLS_REJECT_UNAUTHORIZED=0
# 生产环境不推荐此设置
```

#### 5. 生产环境代理部署

**方案一：使用系统级代理**
```bash
# 在系统级别设置代理
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080

# 启动应用
pm2 start ecosystem.config.js
```

**方案二：使用Docker容器**
```dockerfile
FROM node:18-alpine
# 设置代理环境变量
ENV HTTP_PROXY=http://proxy:8080
ENV HTTPS_PROXY=http://proxy:8080

# 复制应用代码
COPY . /app
WORKDIR /app

# 安装依赖和启动
RUN npm install --production
CMD ["node", "index.js"]
```

**方案三：使用Nginx反向代理**
```nginx
# 在Nginx中配置上游代理
upstream gemini_proxy {
    server proxy-server:8080;
}

location /api/ai/ {
    proxy_pass http://gemini_proxy;
    proxy_set_header Host generativelanguage.googleapis.com;
}
```

### 文件存储迁移到OSS

后续可以将文件存储迁移到阿里云OSS：

1. **安装OSS SDK**
```bash
npm install ali-oss
```

2. **修改文件上传逻辑**
```javascript
const OSS = require('ali-oss');

const client = new OSS({
  region: 'your-region',
  accessKeyId: 'your-access-key',
  accessKeySecret: 'your-secret',
  bucket: 'your-bucket'
});
```

## 使用说明

### 1. 登录系统
使用管理员账号登录系统

### 2. 选择功能
- **短剧Pro**: 用于分析视频内容
- **小说Pro**: 用于分析文本内容

### 3. 创建项目
在工作台点击"New Project"创建新项目

### 4. 上传文件
进入项目详情页，上传相关文件：
- 视频项目：支持MP4、MOV、AVI等格式
- 小说项目：支持TXT、DOC、DOCX、PDF等格式

### 5. AI分析
配置分析参数：
- 选择要分析的文件（可选）
- 调整Temperature参数
- 输入自定义Prompt
- 点击"开始解析配置"

### 6. 查看结果
系统会异步处理AI分析任务，完成后在页面底部显示结果

## 常见问题

### Q: Gemini API调用失败
A: 请检查：
1. API密钥是否正确
2. 网络连接是否正常
3. API配额是否用完
4. 如果在中国大陆等受限地区，请配置代理服务器

### Q: 文件上传失败
A: 请检查：
1. 文件大小是否超过500MB限制
2. 文件格式是否支持
3. 磁盘空间是否充足

### Q: 视频无法播放
A: 请检查：
1. 浏览器是否支持视频格式
2. 文件是否完整上传
3. 网络连接是否稳定

## 开发指南

### 项目结构
```
jcc-factory/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # React上下文
│   │   ├── services/      # API服务
│   │   └── components/    # 通用组件
│   └── public/
├── server/                # 后端代码
│   ├── routes/           # API路由
│   ├── middleware/       # 中间件
│   ├── services/         # 业务服务
│   ├── config/           # 配置文件
│   └── database/         # 数据库脚本
└── uploads/              # 文件存储目录
```

### 添加新功能
1. 后端：在`server/routes/`添加新的API路由
2. 前端：在`client/src/pages/`添加新页面
3. 数据库：在`server/database/`添加迁移脚本

## 许可证

本项目仅供内部使用，请勿用于商业用途。

## 联系方式

如有问题，请联系系统管理员。 