# Canvas Word编辑器集成指南

## 项目概述

本项目成功集成了基于Canvas技术的在线Word编辑器，使用的是开源项目 `@mindfiredigital/react-canvas-editor`。

## 技术特性

### 🚀 主要功能
- **完整的Word功能**：支持文本格式化、表格、图片、超链接等
- **Canvas渲染**：基于Canvas的高性能渲染引擎
- **多格式支持**：支持TXT、HTML、DOCX格式的导入导出
- **实时编辑**：流畅的编辑体验，类似Google Docs
- **服务端API**：完整的后端文档管理系统

### 📁 项目结构

```
JCCFactory/
├── client/                          # 前端React应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── WordEditor.jsx       # 主要的Word编辑器组件
│   │   │   └── TestWordEditor.jsx   # 测试组件
│   │   ├── pages/
│   │   │   └── WordEditorPage.jsx   # Word编辑器页面
│   │   ├── services/
│   │   │   └── documentService.js   # 文档API服务
│   │   └── App.jsx                  # 路由配置
│   └── package.json                 # 包含canvas-editor依赖
├── server/                          # 后端Node.js应用
│   ├── routes/
│   │   └── documents.js             # 文档API路由
│   ├── uploads/
│   │   └── documents/               # 文档存储目录
│   └── index.js                     # 服务端主文件
└── package.json                     # 主项目配置
```

## 安装和启动

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 启动开发服务器
```bash
npm run dev
```

这将同时启动：
- 前端开发服务器：http://localhost:5173
- 后端API服务器：http://localhost:3001

### 3. 访问Word编辑器
1. 登录系统后，在首页点击 "Word编辑器" 按钮
2. 或直接访问：http://localhost:5173/word-editor

## 核心组件说明

### WordEditor.jsx
主要的编辑器组件，包含：
- 完整的工具栏配置
- 文档保存/导出功能
- 文件导入功能
- 与后端API的集成

### DocumentService.js
处理所有文档相关的API调用：
- 保存文档到服务器
- 获取文档列表
- 文档格式转换
- 文件上传下载

### documents.js (后端路由)
提供完整的文档管理API：
- POST /api/documents/save - 保存文档
- GET /api/documents/list - 获取文档列表
- POST /api/documents/upload - 上传文档
- GET /api/documents/download/:filename - 下载文档
- POST /api/documents/convert/html-to-docx - HTML转DOCX

## 主要功能演示

### 1. 基础编辑功能
- ✅ 文本格式化（加粗、斜体、下划线）
- ✅ 文本对齐（居左、居中、居右、两端对齐）
- ✅ 字体设置（字体类型、大小、颜色）
- ✅ 列表（有序、无序）
- ✅ 撤销/重做

### 2. 高级功能
- ✅ 插入图片
- ✅ 插入表格
- ✅ 超链接
- ✅ 标题样式
- ✅ 文本高亮

### 3. 文档管理
- ✅ 保存到服务器
- ✅ 导出为多种格式（TXT、HTML、DOCX）
- ✅ 从本地导入文档
- ✅ 文档搜索功能

## API接口文档

### 保存文档
```javascript
POST /api/documents/save
{
  "title": "文档标题",
  "content": "文档内容",
  "format": "json"
}
```

### 上传文档
```javascript
POST /api/documents/upload
Content-Type: multipart/form-data
FormData: { document: File }
```

### 获取文档列表
```javascript
GET /api/documents/list
```

### 下载文档
```javascript
GET /api/documents/download/:filename
```

## 为什么选择Canvas-editor？

### 相比HTML编辑器的优势

1. **性能优越**
   - Canvas直接操作像素，渲染速度更快
   - 不受DOM复杂度影响

2. **功能完整**
   - 支持复杂的文档布局
   - 精确的字体和样式控制

3. **跨平台一致性**
   - Canvas在所有浏览器中表现一致
   - 避免了HTML/CSS的兼容性问题

4. **协同编辑友好**
   - 基于坐标的数据同步
   - 易于实现实时协作

5. **扩展性强**
   - 易于添加自定义功能
   - 支持插件架构

## 后续开发建议

### 1. 协同编辑
- 集成WebSocket实现实时协作
- 添加版本控制和冲突解决

### 2. 云存储集成
- 支持多种云存储服务
- 自动同步和备份

### 3. 移动端适配
- 响应式设计优化
- 触摸操作支持

### 4. 高级功能
- 评论和审阅功能
- 文档模板系统
- 批量操作工具

## 疑难解答

### 常见问题

1. **编辑器无法加载**
   - 确保已安装 `@mindfiredigital/react-canvas-editor`
   - 检查控制台是否有错误信息

2. **文档保存失败**
   - 检查后端服务是否正常运行
   - 确认 `/uploads/documents` 目录存在且有写权限

3. **文件上传失败**
   - 检查文件大小是否超过限制（默认10MB）
   - 确认文件格式是否支持

## 技术支持

如需技术支持或有任何问题，请：
1. 查看控制台错误信息
2. 检查网络连接
3. 参考官方文档：https://mindfiredigital.github.io/react-canvas-editor/

---

**注意**: 本集成方案基于开源项目，建议在生产环境使用前进行充分测试。 