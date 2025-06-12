# GitHub 仓库设置指南

## 步骤 1：创建 GitHub 仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - Repository name: `jcc-factory`
   - Description: `剧绕乐 - 短剧本工坊 AI视频/小说解析平台`
   - 选择 Public 或 Private（推荐 Private）
   - **不要**勾选 "Add a README file"
   - **不要**勾选 "Add .gitignore"
   - **不要**勾选 "Choose a license"
4. 点击 "Create repository"

## 步骤 2：连接本地仓库到 GitHub

创建仓库后，GitHub 会显示连接指令。请在命令行中执行：

```bash
git remote add origin https://github.com/YOUR_USERNAME/jcc-factory.git
git branch -M main
git push -u origin main
```

**注意：** 将 `YOUR_USERNAME` 替换为您的 GitHub 用户名

## 步骤 3：验证推送成功

推送完成后，刷新 GitHub 页面，应该能看到所有文件，包括：
- `netlify/` 目录
- `netlify.toml` 文件
- 所有项目文件

## 下一步

完成 GitHub 设置后，我们将：
1. 在 Netlify 中连接 GitHub 仓库
2. 设置环境变量
3. 重新部署函数 