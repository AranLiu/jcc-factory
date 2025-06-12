@echo off
echo 启动剧柴柴应用程序...
echo.

REM 检查MySQL服务
echo 检查MySQL服务状态...
sc query "MySQL995" | find "RUNNING" >nul
if errorlevel 1 (
    echo 启动MySQL服务...
    net start "MySQL995"
) else (
    echo MySQL服务已运行
)

echo.
echo 设置环境变量并启动应用程序...
echo.

REM 设置环境变量并启动
set DB_PASSWORD=12345678
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_NAME=jcc_factory
set JWT_SECRET=jcc_factory_jwt_secret_key_2024_very_secure
set PORT=3001
set NODE_ENV=development
set UPLOAD_PATH=./uploads
set MAX_FILE_SIZE=500MB

echo 启动中，请等待...
npm run dev

pause 