# Netlify代理服务部署指南

## 🚀 问题诊断

您的Netlify代理服务返回404错误，这说明Netlify函数没有正确部署。

## 📋 当前状态

✅ **数据库配置正确** - Netlify URL已设置为: `https://chimerical-stardust-d347a4.netlify.app`
✅ **函数代码存在** - `netlify/functions/v1.mjs` 文件完整
✅ **配置文件存在** - `netlify.toml` 配置正确
❌ **函数未部署** - 访问函数端点返回404错误

## 🔧 解决方案

### 方案一：通过Netlify网站手动部署（推荐）

1. **登录Netlify**
   - 访问 [https://app.netlify.com](https://app.netlify.com)
   - 使用您的账户登录

2. **找到您的站点**
   - 在仪表板中找到 `chimerical-stardust-d347a4` 站点
   - 点击进入站点管理页面

3. **检查部署状态**
   - 查看 "Deploys" 标签页
   - 确认最新部署是否成功
   - 如果有失败的部署，查看错误日志

4. **重新部署**
   - 点击 "Trigger deploy" → "Deploy site"
   - 或者上传您的项目文件

5. **设置环境变量**
   - 进入 "Site settings" → "Environment variables"
   - 添加 `GEMINI_API_KEY` 环境变量
   - 值为您的Google Gemini API密钥

### 方案二：使用Git自动部署

1. **连接Git仓库**
   - 将您的项目推送到GitHub/GitLab
   - 在Netlify中连接该仓库
   - 设置自动部署

2. **配置构建设置**
   ```
   Build command: (留空)
   Publish directory: .
   Functions directory: netlify/functions
   ```

### 方案三：使用Netlify CLI（如果安装成功）

```bash
# 安装Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 链接到现有站点
netlify link

# 部署
netlify deploy --prod
```

## 📝 必需文件检查清单

确保以下文件存在且配置正确：

### ✅ netlify.toml
```toml
[build]
  functions = "netlify/functions"
  publish = "."

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/v1/*"
  to = "/.netlify/functions/v1/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/v1/:splat"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### ✅ netlify/functions/v1.mjs
- 函数代码完整
- 导入语句正确
- 导出handler函数

### ✅ netlify/functions/package.json
```json
{
  "name": "netlify-openai-gemini-proxy",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

## 🧪 部署后测试

部署完成后，运行以下命令测试：

```bash
node check-database-proxy-fixed.js
```

或者手动测试：

```bash
# 测试模型端点
curl https://chimerical-stardust-d347a4.netlify.app/.netlify/functions/v1/models

# 测试聊天端点（应该返回401错误，这是正常的）
curl -X POST https://chimerical-stardust-d347a4.netlify.app/.netlify/functions/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'
```

## 🔍 故障排除

### 如果仍然返回404：

1. **检查函数路径**
   - 确认函数文件在 `netlify/functions/v1.mjs`
   - 检查文件名和扩展名

2. **检查构建日志**
   - 在Netlify仪表板查看构建日志
   - 查找错误信息

3. **检查函数日志**
   - 在Netlify仪表板的 "Functions" 标签页
   - 查看函数执行日志

4. **验证配置**
   - 确认 `netlify.toml` 在项目根目录
   - 检查重定向规则

### 如果函数执行错误：

1. **检查依赖**
   - 确认 `@google/generative-ai` 包已安装
   - 检查版本兼容性

2. **检查环境变量**
   - 确认 `GEMINI_API_KEY` 已在Netlify设置
   - 检查API密钥有效性

3. **检查代码语法**
   - 确认ES模块语法正确
   - 检查导入/导出语句

## 📞 需要帮助？

如果按照以上步骤仍然无法解决问题，请提供：

1. Netlify部署日志
2. 函数执行日志
3. 具体的错误信息

我将帮您进一步诊断问题。 