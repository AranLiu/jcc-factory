@echo off
chcp 65001 > nul

echo 🎬 启动剧柴柴应用程序...
echo ============================

REM 创建必要目录
if not exist "server\uploads" mkdir "server\uploads" > nul 2>&1
if not exist "server\knowledge_base_files" mkdir "server\knowledge_base_files" > nul 2>&1

echo 🚀 启动开发服务...
echo ℹ️  前端地址: http://localhost:5173
echo ℹ️  后端API: http://localhost:3001
echo ℹ️  按 Ctrl+C 停止服务
echo.

npm run dev

echo.
echo 📝 服务已停止
pause 