#!/bin/bash

# 剧绕乐 - 短剧本工坊 一键部署脚本
echo "🎬 剧绕乐 - 短剧本工坊 一键部署脚本"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL 未安装，请先安装 MySQL 5.7+"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装依赖
echo "📦 安装依赖包..."
npm install

echo "📦 安装后端依赖..."
cd server && npm install && cd ..

echo "📦 安装前端依赖..."
cd client && npm install && cd ..

# 创建环境配置文件
if [ ! -f "server/.env" ]; then
    echo "⚙️  创建环境配置文件..."
    cp server/env.example server/.env
    echo "请编辑 server/.env 文件，配置数据库和API密钥"
else
    echo "✅ 环境配置文件已存在"
fi

# 创建上传目录
mkdir -p server/uploads
echo "✅ 创建文件上传目录"

echo ""
echo "🎉 安装完成！"
echo ""
echo "接下来的步骤："
echo "1. 编辑 server/.env 文件，配置数据库连接和Gemini API密钥"
echo "2. 创建数据库：mysql -u root -p < server/database/init.sql"
echo "3. 创建管理员用户：cd scripts && node create-user.js"
echo "4. 启动服务：npm run dev"
echo ""
echo "访问地址: http://localhost:5173" 