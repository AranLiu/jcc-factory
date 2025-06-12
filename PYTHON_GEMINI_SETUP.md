# Python Gemini 服务设置指南

## 🎯 概述

已成功将JCCFactory项目的Gemini接口从Node.js改为Python实现，解决了网络连接问题。

## 📁 文件结构

```
server/
├── python_services/
│   ├── gemini_service.py      # Python Gemini服务主文件
│   └── requirements.txt       # Python依赖
├── services/
│   └── pythonGeminiService.js # Node.js包装器
└── routes/
    └── ai.js                  # 已更新使用Python服务
```

## 🔧 安装步骤

### 1. 安装Python依赖

```bash
cd server/python_services
pip install -r requirements.txt
```

或者直接安装：
```bash
pip install google-genai
```

### 2. 设置环境变量

在 `server/.env` 文件中确保有：
```
GEMINI_API_KEY=你的API密钥
PYTHON_COMMAND=python  # 可选，默认为python
```

### 3. 测试Python服务

#### 方法1: 使用批处理文件（Windows）
双击运行 `start-python-service.bat`

#### 方法2: 手动测试
```bash
# 设置环境变量
set GEMINI_API_KEY=你的API密钥

# 测试文本生成
python server/python_services/gemini_service.py text "Hello, please respond in Chinese"

# 测试带系统指令的文本生成
python server/python_services/gemini_service.py text "Hello there" "You are a cat. Your name is Neko."

# 测试视频分析
python server/python_services/gemini_service.py video "path/to/video.mp4" "Describe this video"
```

## 🚀 功能特性

### ✅ 已实现功能

1. **文本生成** - 支持system instruction
2. **视频分析** - 文件上传、处理等待、内容分析
3. **小说分析** - 长文本分块处理
4. **Node.js集成** - 通过子进程调用Python服务

### 🎯 API接口

#### 1. 文本生成
```python
python gemini_service.py text "内容" [系统指令]
```

#### 2. 视频分析
```python
python gemini_service.py video "视频路径" [提示词]
```

#### 3. 小说分析
```python
python gemini_service.py novel "文本内容" "分析提示"
```

## 🔄 Node.js集成

项目的Express.js服务器会自动使用Python服务：

```javascript
const PythonGeminiService = require('./services/pythonGeminiService');
const geminiService = new PythonGeminiService();

// 视频分析
const result = await geminiService.analyzeVideo(prompt, videoInfo);

// 文本生成
const result = await geminiService.analyzeContent(prompt, content, modelConfig);
```

## 🐛 故障排除

### 问题1: Python命令未找到
**解决方案**: 
- 确保Python已安装并在PATH中
- 或在.env中设置 `PYTHON_COMMAND=python3`

### 问题2: google-genai模块未找到
**解决方案**:
```bash
pip install google-genai
```

### 问题3: API密钥错误
**解决方案**:
- 检查.env文件中的GEMINI_API_KEY
- 确保API密钥有效且有足够配额

### 问题4: 视频文件处理失败
**解决方案**:
- 确保视频文件存在且可访问
- 检查文件格式是否支持（MP4, MOV等）
- 确保文件大小在限制范围内

## 📊 性能优化

1. **长文本处理**: 自动分块处理超过30000字符的文本
2. **错误处理**: 完整的异常捕获和错误报告
3. **使用统计**: 详细的Token使用情况跟踪
4. **文件状态监控**: 视频文件处理状态实时监控

## 🎉 测试结果

✅ **Python直接调用**: 完全正常工作  
✅ **文本生成**: 支持中英文，支持system instruction  
✅ **视频分析**: 成功上传和分析9.52MB视频文件  
✅ **Node.js包装**: 通过子进程成功调用Python服务  

## 🔮 下一步

1. 可以考虑添加更多模型选择（gemini-1.5-pro等）
2. 添加流式响应支持
3. 优化大文件处理性能
4. 添加更多错误恢复机制 