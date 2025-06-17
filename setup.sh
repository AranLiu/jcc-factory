#!/bin/bash

# 剧柴柴 - 短剧本工坊 一键部署脚本
echo "🎬 剧柴柴 - 短剧本工坊 一键部署脚本"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 错误处理函数
error_exit() {
    echo -e "${RED}❌ 错误: $1${NC}" >&2
    exit 1
}

success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查操作系统
check_os() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        echo "检测到 Windows 系统，建议使用 npm run setup:project 代替此脚本"
        warning_msg "如需继续，请确保在 Git Bash 或 WSL 中运行"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
}

# 检查Node.js版本
check_nodejs() {
    info_msg "检查 Node.js 环境..."
    if ! command -v node &> /dev/null; then
        error_exit "Node.js 未安装，请先安装 Node.js 16+"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    # 简单版本检查
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 16 ]; then
        error_exit "Node.js 版本过低 ($NODE_VERSION)，需要 16.0.0 或更高版本"
    fi
    
    success_msg "Node.js 版本检查通过 (v$NODE_VERSION)"
}

# 检查npm版本
check_npm() {
    info_msg "检查 npm 环境..."
    if ! command -v npm &> /dev/null; then
        error_exit "npm 未安装"
    fi
    
    NPM_VERSION=$(npm -v)
    success_msg "npm 版本: v$NPM_VERSION"
}

# 检查MySQL
check_mysql() {
    info_msg "检查 MySQL 环境..."
    if ! command -v mysql &> /dev/null; then
        warning_msg "MySQL 命令行工具未找到，请确保已安装 MySQL 5.7+ 或 MariaDB"
        warning_msg "您可以稍后手动导入数据库: mysql -u root -p < server/database/init.sql"
    else
        success_msg "MySQL 命令行工具已安装"
    fi
}

# 检查Python (用于AI服务)
check_python() {
    info_msg "检查 Python 环境 (可选，用于AI服务)..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        success_msg "Python3 已安装 (v$PYTHON_VERSION)"
        
        # 检查requirements.txt并安装Python依赖
        if [ -f "server/python_services/requirements.txt" ]; then
            info_msg "安装Python依赖..."
            cd server/python_services
            if python3 -m pip install -r requirements.txt &> /dev/null; then
                success_msg "Python依赖安装完成"
            else
                warning_msg "Python依赖安装失败，AI功能可能无法正常使用"
            fi
            cd ../..
        fi
    else
        warning_msg "Python3 未安装，AI功能可能无法使用"
    fi
}

# 安装依赖
install_dependencies() {
    info_msg "安装项目依赖..."
    
    # 安装根目录依赖
    echo "📦 安装根目录依赖..."
    npm install || error_exit "根目录依赖安装失败"
    
    # 安装后端依赖
    echo "📦 安装后端依赖..."
    cd server
    npm install || error_exit "后端依赖安装失败"
    cd ..
    
    # 安装前端依赖
    echo "📦 安装前端依赖..."
    cd client
    npm install || error_exit "前端依赖安装失败"
    cd ..
    
    success_msg "所有依赖安装完成"
}

# 创建必要目录
create_directories() {
    info_msg "创建必要目录..."
    
    # 创建上传目录
    mkdir -p server/uploads
    mkdir -p server/knowledge_base_files
    
    # 设置目录权限 (如果在Unix系统上)
    if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "cygwin" && "$OSTYPE" != "win32" ]]; then
        chmod 755 server/uploads
        chmod 755 server/knowledge_base_files
    fi
    
    success_msg "目录创建完成"
}

# 配置环境文件
setup_environment() {
    info_msg "配置环境文件..."
    
    if [ ! -f "server/.env" ]; then
        if [ -f "server/env.example" ]; then
            cp server/env.example server/.env
            success_msg "环境配置文件已创建"
            warning_msg "请编辑 server/.env 文件，配置数据库连接和API密钥"
        else
            error_exit "env.example 文件不存在"
        fi
    else
        success_msg "环境配置文件已存在"
    fi
}

# 显示后续步骤
show_next_steps() {
    echo ""
    echo "🎉 基础安装完成！"
    echo ""
    echo "接下来的步骤："
    echo "1. 配置环境变量："
    echo "   编辑 server/.env 文件，设置数据库连接和Gemini API密钥"
    echo ""
    echo "2. 初始化数据库："
    echo "   npm run setup:db"
    echo "   或手动执行: mysql -u root -p < server/database/init.sql"
    echo ""
    echo "3. 创建管理员用户："
    echo "   npm run setup:admin"
    echo ""
    echo "4. 启动开发服务："
    echo "   npm run dev"
    echo ""
    echo "5. 访问应用："
    echo "   前端: http://localhost:5173"
    echo "   后端API: http://localhost:3001"
    echo ""
    echo "💡 提示: 您也可以使用 npm run setup:project 来执行类似的初始化"
    echo ""
    echo "📚 更多命令："
    echo "   npm run create:user  - 创建新用户"
    echo "   npm run audit:all    - 安全检查"
    echo "   npm run clean        - 清理依赖"
    echo ""
}

# 主函数
main() {
    # 检查操作系统
    check_os
    
    # 环境检查
    check_nodejs
    check_npm
    check_mysql
    check_python
    
    success_msg "环境检查通过"
    echo ""
    
    # 安装和配置
    install_dependencies
    create_directories
    setup_environment
    
    # 显示后续步骤
    show_next_steps
}

# 运行主函数
main "$@" 