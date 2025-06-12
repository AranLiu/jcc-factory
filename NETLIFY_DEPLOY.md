# Netlify 部署指南

## 快速重新部署

如果您已经有Netlify账户和项目，只需要重新部署：

1. **提交代码更改**：
```bash
git add .
git commit -m "Fix Netlify function path handling"
git push origin main
```

2. **触发重新部署**：
   - 访问 [Netlify Dashboard](https://app.netlify.com/)
   - 找到您的项目 `chimerical-stardust-d347a4`
   - 点击 "Trigger deploy" -> "Deploy site"

## 完整部署流程

### 1. 准备工作

确保您有以下文件：
- `netlify/functions/v1.mjs` - Netlify函数
- `package.json` - 包含依赖项

### 2. 创建 Netlify 账户

1. 访问 [Netlify](https://www.netlify.com/)
2. 使用 GitHub 账户登录
3. 授权 Netlify 访问您的仓库

### 3. 部署项目

#### 方法一：通过 Git 连接（推荐）

1. 在 Netlify Dashboard 中点击 "New site from Git"
2. 选择 GitHub 并授权
3. 选择您的 JCCFactory 仓库
4. 配置构建设置：
   - **Build command**: `npm install`
   - **Publish directory**: `netlify/functions`
   - **Functions directory**: `netlify/functions`

#### 方法二：手动部署

1. 压缩 `netlify` 文件夹
2. 在 Netlify Dashboard 中拖拽上传

### 4. 配置环境变量

在 Netlify Dashboard 中：
1. 进入 Site settings > Environment variables
2. 添加以下变量：
   - `GEMINI_API_KEY`: 您的 Gemini API 密钥

### 5. 测试部署

部署完成后，您会得到一个 URL，例如：
`https://chimerical-stardust-d347a4.netlify.app`

测试端点：
- `GET /v1/models` - 获取模型列表
- `POST /v1/chat/completions` - 聊天完成

## 故障排除

### 常见问题

1. **400 Bad Request 错误**
   - 检查请求路径是否正确
   - 确保请求头包含正确的 Content-Type

2. **ERR_CONTENT_DECODING_FAILED**
   - 通常是响应格式问题
   - 检查函数返回的 JSON 格式

3. **函数超时**
   - Netlify 免费版函数执行时间限制为 10 秒
   - 考虑优化代码或升级计划

### 调试步骤

1. **查看函数日志**：
   - 在 Netlify Dashboard 中进入 Functions
   - 点击函数名查看日志

2. **本地测试**：
```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 本地运行函数
netlify dev
```

3. **测试 API**：
```bash
# 测试模型列表
curl -X GET "https://your-site.netlify.app/v1/models" \
  -H "Authorization: Bearer test-key"

# 测试聊天完成
curl -X POST "https://your-site.netlify.app/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 更新记录

- **2025-01-12**: 修复路径处理问题，改进错误处理
- **2025-01-12**: 添加详细的日志记录
- **2025-01-12**: 支持 /v1/models 和 /models 两种路径格式

## 🔗 相关链接

- [Netlify Functions文档](https://docs.netlify.com/functions/overview/)
- [Google Gemini API文档](https://ai.google.dev/docs) 