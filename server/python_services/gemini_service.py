# -*- coding: utf-8 -*-
"""
Python Gemini 服务
适配 google-genai 新库
"""

import os
import time
import json
import sys
import io
from google import genai

# 设置编码环境变量
os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform.startswith('win'):
    os.environ['PYTHONLEGACYWINDOWSSTDIO'] = '0'

def ensure_utf8_output():
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        elif sys.platform.startswith('win'):
            import codecs
            if hasattr(sys.stdout, 'detach'):
                sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
                sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    except Exception:
        pass

ensure_utf8_output()

class GeminiService:
    def __init__(self, api_key=None, debug=False):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.debug = debug
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY 环境变量未设置")
        self.client = genai.Client(api_key=self.api_key)
        if self.debug:
            print(f"✅ Python Gemini 服务初始化成功")

    def analyze_video(self, video_path, prompt="Summarize this video. Then create a quiz with an answer key based on the information in this video."):
        try:
            import sys
            if self.debug:
                print(f"📁 开始上传视频文件: {video_path}", file=sys.stderr)
            if not os.path.exists(video_path):
                return {
                    'success': False,
                    'error': f'视频文件不存在: {video_path}'
                }
            # 1. 上传视频文件，获得文件对象
            myfile = self.client.files.upload(file=video_path)
            if self.debug:
                print(f"✅ 视频文件上传成功: {getattr(myfile, 'name', None)}", file=sys.stderr)
            # 2. 轮询等待文件状态变为 ACTIVE，最多60秒
            wait_time = 0
            while getattr(myfile, 'state', None) != 'ACTIVE' and wait_time < 60:
                if self.debug:
                    print(f"⏳ 等待文件状态变为 ACTIVE，当前状态: {getattr(myfile, 'state', None)}", file=sys.stderr)
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
                temperature=0.7,
                max_output_tokens=8192
            )
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, myfile],
                config=config
            )
            usage_info = {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            }
            return {
                'success': True,
                'text': response.text,
                'file_id': getattr(myfile, 'name', None),
                'usage': usage_info
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def generate_text(self, content, system_instruction=None, model="gemini-2.0-flash"):
        try:
            config = genai.types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=8192
            )
            response = self.client.models.generate_content(
                model=model,
                contents=content,
                config=config
            )
            usage_info = {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            }
            return {
                'success': True,
                'text': response.text,
                'usage': usage_info
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def analyze_novel(self, text_content, prompt, max_length=30000):
        try:
            if len(text_content) <= max_length:
                full_prompt = f"{prompt}\n\n内容：{text_content}"
                return self.generate_text(full_prompt)
            else:
                chunks = self._split_text(text_content, max_length)
                results = []
                for i, chunk in enumerate(chunks):
                    chunk_prompt = f"{prompt}\n\n这是文本的第{i+1}部分（共{len(chunks)}部分）：\n\n{chunk}"
                    result = self.generate_text(chunk_prompt)
                    if result['success']:
                        results.append(result)
                    else:
                        return result
                    if i < len(chunks) - 1:
                        time.sleep(1)
                combined_text = '\n\n'.join([f"第{i+1}部分分析：\n{r['text']}" for i, r in enumerate(results)])
                return {
                    'success': True,
                    'text': combined_text,
                    'usage': {
                        'prompt_tokens': sum(r['usage']['prompt_tokens'] for r in results),
                        'completion_tokens': sum(r['usage']['completion_tokens'] for r in results),
                        'total_tokens': sum(r['usage']['total_tokens'] for r in results)
                    }
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _split_text(self, text, max_length):
        chunks = []
        current_chunk = ''
        sentences = text.split('。')
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > max_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence + '。'
                else:
                    chunks.append(sentence[:max_length])
                    current_chunk = sentence[max_length:] + '。'
            else:
                current_chunk += sentence + '。'
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        return chunks

def main():
    if len(sys.argv) < 2:
        print("❌ 用法: python gemini_service.py <command> [args...]", file=sys.stderr)
        print("📋 可用命令:", file=sys.stderr)
        print("   video <video_path> [prompt]", file=sys.stderr)
        print("   text <content> [system_instruction]", file=sys.stderr)
        print("   novel <text_content> <prompt>", file=sys.stderr)
        return
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ 请设置 GEMINI_API_KEY 环境变量", file=sys.stderr)
        return
    try:
        debug_mode = "--debug" in sys.argv
        service = GeminiService(api_key, debug=debug_mode)
        command = sys.argv[1]
        if command == "video":
            if len(sys.argv) < 3:
                print("❌ 用法: python gemini_service.py video <video_path> [prompt]")
                return
            video_path = sys.argv[2]
            prompt = sys.argv[3] if len(sys.argv) > 3 else "Summarize this video. Then create a quiz with an answer key based on the information in this video."
            result = service.analyze_video(video_path, prompt)
            print(json.dumps(result, ensure_ascii=False))
        elif command == "text":
            if len(sys.argv) < 3:
                print("❌ 用法: python gemini_service.py text <content> [system_instruction]")
                return
            content = sys.argv[2]
            system_instruction = sys.argv[3] if len(sys.argv) > 3 else None
            result = service.generate_text(content, system_instruction)
            output = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
            print(output, flush=True)
        elif command == "novel":
            if len(sys.argv) < 4:
                print("❌ 用法: python gemini_service.py novel <text_content> <prompt>")
                return
            text_content = sys.argv[2]
            prompt = sys.argv[3]
            result = service.analyze_novel(text_content, prompt)
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(f"❌ 未知命令: {command}")
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))

if __name__ == "__main__":
    main() 