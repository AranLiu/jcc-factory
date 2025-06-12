# Netlify 重新连接和部署指南

## 当前问题
您的 Netlify 站点 `chimerical-stardust-d347a4` 已经部署，但函数返回 404 错误。这是因为：
1. 站点没有连接到 Git 仓库
2. 函数没有正确部署
3. 缺少环境变量

## 解决方案

### 步骤 1：连接 GitHub 仓库

1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. 找到您的站点 `chimerical-stardust-d347a4`
3. 点击站点名称进入设置
4. 在左侧菜单中点击 "Site settings"
5. 点击 "Build & deploy" 
6. 在 "Repository" 部分点击 "Link repository"
7. 选择 "GitHub" 并授权
8. 选择您刚创建的 `jcc-factory` 仓库
9. 设置构建配置：
   - Branch to deploy: `main`
   - Build command: 留空
   - Publish directory: `.`

### 步骤 2：设置环境变量

1. 在站点设置中，点击 "Environment variables"
2. 点击 "Add variable"
3. 添加以下变量：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Google Gemini API 密钥
   - **Scopes**: 选择 "All scopes"

### 步骤 3：触发重新部署

1. 在站点概览页面，点击 "Trigger deploy"
2. 选择 "Deploy site"
3. 等待部署完成（通常需要 1-3 分钟）

### 步骤 4：验证部署

部署完成后，测试以下端点：

```bash
# 测试模型列表（不需要 API 密钥）
curl https://chimerical-stardust-d347a4.netlify.app/.netlify/functions/v1/models

# 测试聊天完成（需要 API 密钥）
curl -X POST https://chimerical-stardust-d347a4.netlify.app/.netlify/functions/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GEMINI_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

## 预期结果

成功部署后：
- 模型端点应返回模型列表（状态码 200）
- 聊天端点应返回 AI 响应（状态码 200）
- 不再出现 404 错误

## 故障排除

如果仍然出现问题：

1. **检查构建日志**：
   - 在 Netlify 站点页面点击最新的部署
   - 查看 "Deploy log" 中的错误信息

2. **检查函数日志**：
   - 在站点设置中点击 "Functions"
   - 查看函数是否正确部署

3. **验证文件结构**：
   - 确保 GitHub 仓库中有 `netlify/functions/v1.mjs`
   - 确保 `netlify.toml` 在根目录

## 联系支持

如果问题持续存在，请提供：
- Netlify 构建日志
- 函数错误日志
- 测试请求的完整响应 