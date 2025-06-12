#!/usr/bin/env python3
"""
快速检查视频处理状态
"""

import os
import sys
import json
from google import genai

def check_video_status():
    api_key = "AIzaSyDTKh0EWKquIv2T02S1xi_DyriXadZ-zc0"
    
    try:
        client = genai.Client(api_key=api_key)
        print("✅ 客户端连接成功")
        
        # 简单文本测试
        print("🔧 测试简单文本生成...")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Hello, please respond in Chinese with a simple greeting."
        )
        print(f"📝 文本生成成功: {response.text[:100]}...")
        
        # 检查视频文件是否存在
        video_path = "E:/Desktop/JCCFactory/server/uploads/1/1749303959350-149846148.mp4"
        if os.path.exists(video_path):
            print(f"✅ 视频文件存在: {video_path}")
            size = os.path.getsize(video_path)
            print(f"📊 文件大小: {size / (1024*1024):.2f} MB")
        else:
            print(f"❌ 视频文件不存在: {video_path}")
            return
        
        # 尝试上传视频文件（但不等待处理）
        print("📤 开始上传视频文件...")
        uploaded_file = client.files.upload(file=video_path)
        print(f"✅ 文件上传成功")
        print(f"🆔 文件ID: {uploaded_file.name}")
        print(f"📊 文件状态: {uploaded_file.state.name}")
        print(f"🎯 文件URI: {uploaded_file.uri}")
        
        if uploaded_file.state.name == "ACTIVE":
            print("🎉 文件已经可用，可以进行分析")
        else:
            print(f"⏳ 文件正在处理中，状态: {uploaded_file.state.name}")
            print("💡 建议: 等待几分钟后重试")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False
    
    return True

if __name__ == "__main__":
    check_video_status() 