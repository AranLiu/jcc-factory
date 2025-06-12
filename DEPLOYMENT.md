# 部署指南

## 生产环境部署

### 1. 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **内存**: 最少 2GB，推荐 4GB+
- **存储**: 最少 20GB，推荐 50GB+
- **Node.js**: 16.x 或更高版本
- **MySQL**: 5.7+ 或 8.0+

### 2. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 安装PM2（进程管理器）
sudo npm install -g pm2

# 安装Nginx（可选，用于反向代理）
sudo apt install nginx -y
```

### 3. 数据库配置

```bash
# 登录MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE jcc_factory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jcc_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON jcc_factory.* TO 'jcc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. 应用部署

```bash
# 克隆代码
git clone https://github.com/your-username/jcc-factory.git
cd jcc-factory

# 安装依赖
npm run install:all

# 配置环境变量
cp server/env.example server/.env
# 编辑 server/.env 文件，配置数据库连接等信息

# 初始化数据库
mysql -u jcc_user -p jcc_factory < server/database/init.sql

# 创建管理员用户
npm run setup:admin

# 构建前端
cd client && npm run build && cd ..

# 启动后端服务
cd server
pm2 start index.js --name "jcc-factory-server"
pm2 startup
pm2 save
```

### 5. Nginx配置（可选）

创建 `/etc/nginx/sites-available/jcc-factory`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/jcc-factory/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 文件上传
    location /uploads/ {
        proxy_pass http://localhost:3001;
        client_max_body_size 500M;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/jcc-factory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL证书（推荐）

使用Let's Encrypt免费SSL证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. 防火墙配置

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 8. 监控和维护

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs jcc-factory-server

# 重启应用
pm2 restart jcc-factory-server

# 更新应用
git pull
npm run install:all
cd client && npm run build && cd ..
pm2 restart jcc-factory-server
```

## Docker部署（可选）

### 1. 创建Dockerfile

```dockerfile
# 后端Dockerfile (server/Dockerfile)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

```dockerfile
# 前端Dockerfile (client/Dockerfile)
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: jcc_factory
      MYSQL_USER: jcc_user
      MYSQL_PASSWORD: userpassword
    volumes:
      - mysql_data:/var/lib/mysql
      - ./server/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"

  server:
    build: ./server
    environment:
      DB_HOST: mysql
      DB_USER: jcc_user
      DB_PASSWORD: userpassword
      DB_NAME: jcc_factory
    depends_on:
      - mysql
    ports:
      - "3001:3001"
    volumes:
      - ./uploads:/app/uploads

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  mysql_data:
```

启动：
```bash
docker-compose up -d
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务状态：`sudo systemctl status mysql`
   - 检查防火墙设置
   - 验证数据库用户权限

2. **文件上传失败**
   - 检查uploads目录权限：`chmod 755 uploads`
   - 检查磁盘空间：`df -h`

3. **Gemini API调用失败**
   - 验证API密钥是否正确
   - 检查网络连接
   - 如需要，配置代理服务器

4. **前端无法访问后端**
   - 检查后端服务状态：`pm2 status`
   - 检查端口是否被占用：`netstat -tlnp | grep 3001`
   - 检查防火墙设置

### 日志查看

```bash
# 应用日志
pm2 logs jcc-factory-server

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MySQL日志
sudo tail -f /var/log/mysql/error.log
``` 