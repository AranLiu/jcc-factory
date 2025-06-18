# -*- coding: utf-8 -*-
"""
简化版Python Gemini 服务
适配 google-genai 新库
"""

import os
import time
import json
import sys
import urllib3
from google import genai

# 设置UTF-8编码输出，解决Windows控制台显示问题
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class GeminiService:
    def __init__(self, api_key=None, debug=False):
        """初始化Gemini服务"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.debug = debug
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY 环境变量未设置")
        self.client = genai.Client(api_key=self.api_key)
        if self.debug:
            print("✅ Gemini Client 初始化成功")

    def analyze_video(self, video_path, prompt, model="gemini-1.5-flash", temperature=0.7):
        """分析视频内容，先上传视频文件再调用 Gemini API"""
        try:
            if not os.path.exists(video_path):
                return {
                    'success': False,
                    'error': f'视频文件不存在: {video_path}'
                }
            if self.debug:
                print(f"📹 开始上传视频: {video_path}")
            # 1. 上传视频文件，获得文件对象
            myfile = self.client.files.upload(file=video_path)
            if self.debug:
                print(f"✅ 视频文件上传成功: {getattr(myfile, 'name', None)}")
            # 2. 轮询等待文件状态变为 ACTIVE，最多60秒
            wait_time = 0
            while getattr(myfile, 'state', None) != 'ACTIVE' and wait_time < 60:
                if self.debug:
                    print(f"⏳ 等待文件状态变为 ACTIVE，当前状态: {getattr(myfile, 'state', None)}")
                time.sleep(1)
                wait_time += 1
                myfile = self.client.files.get(name=myfile.name)
            if getattr(myfile, 'state', None) != 'ACTIVE':
                return {
                    'success': False,
                    'error': f'文件未能在 60 秒内变为 ACTIVE，当前状态: {getattr(myfile, 'state', None)}'
                }
            # 3. 生成内容，引用文件对象
            config = genai.types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=8192
            )
            response = self.client.models.generate_content(
                model=model,
                contents=[prompt, myfile],
                config=config
            )
            if self.debug:
                print(f"🎉 视频分析完成")
            return {
                'success': True,
                'text': response.text,
                'file_id': getattr(myfile, 'name', None),
                'usage': {}
            }
        except Exception as e:
            error_msg = str(e)
            if self.debug:
                print(f"❌ 视频分析失败: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

    def generate_text(self, content, system_instruction=None, model="gemini-1.5-flash", temperature=0.7):
        """生成文本内容"""
        try:
            if self.debug:
                print(f"📝 开始生成文本")
                print(f"🤖 使用模型: {model}")
                print(f"🌡️  温度参数: {temperature}")
            config = genai.types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=8192
            )
            response = self.client.models.generate_content(
                model=model,
                contents=content,
                config=config
            )
            if self.debug:
                print(f"🎉 文本生成完成")
            return {
                'success': True,
                'text': response.text,
                'usage': {}
            }
        except Exception as e:
            error_msg = str(e)
            if self.debug:
                print(f"❌ 文本生成失败: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

def main():
    import json
    result = None
    try:
        print("[DEBUG] 脚本已启动，参数:", sys.argv)
        print("[DEBUG] 当前GEMINI_API_KEY:", os.getenv('GEMINI_API_KEY'))
        if len(sys.argv) < 2:
            result = {'success': False, 'error': '缺少命令参数'}
            print(json.dumps(result, ensure_ascii=False))
            return
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            result = {'success': False, 'error': 'GEMINI_API_KEY 环境变量未设置'}
            print(json.dumps(result, ensure_ascii=False))
            return
        debug_mode = os.getenv('GEMINI_DEBUG', 'false').lower() == 'true'
        print(f"[DEBUG] 初始化GeminiService, debug={debug_mode}")
        service = GeminiService(api_key, debug=debug_mode)
        command = sys.argv[1]
        print(f"[DEBUG] 执行命令: {command}")
        if command == "video":
            if len(sys.argv) < 3:
                result = {'success': False, 'error': '缺少视频路径参数'}
                print(json.dumps(result, ensure_ascii=False))
                return
            video_path = sys.argv[2]
            prompt = sys.argv[3] if len(sys.argv) > 3 else "Analyze this video"
            model_config = {}
            if len(sys.argv) > 4 and sys.argv[4].startswith('{'):
                try:
                    model_config = json.loads(sys.argv[4])
                except json.JSONDecodeError as e:
                    print(f"[ERROR] JSON解析失败: {e}")
            model = model_config.get('model', 'gemini-1.5-flash')
            temperature = model_config.get('temperature', 0.7)
            print(f"[DEBUG] 调用 analyze_video, model={model}, temperature={temperature}")
            result = service.analyze_video(video_path, prompt, model, temperature)
            print(json.dumps(result, ensure_ascii=False))
        elif command == "text":
            if len(sys.argv) < 3:
                result = {'success': False, 'error': '缺少文本内容参数'}
                print(json.dumps(result, ensure_ascii=False))
                return
            content = sys.argv[2]
            system_instruction = sys.argv[3] if len(sys.argv) > 3 else None
            model_config = {}
            if len(sys.argv) > 4 and sys.argv[4].startswith('{'):
                try:
                    model_config = json.loads(sys.argv[4])
                except json.JSONDecodeError as e:
                    print(f"[ERROR] JSON解析失败: {e}")
            model = model_config.get('model', 'gemini-1.5-flash')
            temperature = model_config.get('temperature', 0.7)
            print(f"[DEBUG] 调用 generate_text, model={model}, temperature={temperature}")
            result = service.generate_text(content, system_instruction, model, temperature)
            print(json.dumps(result, ensure_ascii=False))
        else:
            result = {'success': False, 'error': f'未知命令: {command}'}
            print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback
        traceback.print_exc()
        result = {'success': False, 'error': str(e)}
        print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main() 