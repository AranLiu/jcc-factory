# -*- coding: utf-8 -*-
"""
Python Gemini 服务
提供视频分析和文本生成功能
"""

import os
import time
import json
import sys
import io
from google import genai
from google.genai import types

# 设置编码环境变量
os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform.startswith('win'):
    os.environ['PYTHONLEGACYWINDOWSSTDIO'] = '0'

# 简化的编码处理 - 避免兼容性问题
def ensure_utf8_output():
    """确保UTF-8输出"""
    try:
        # 尝试重新配置编码
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        elif sys.platform.startswith('win'):
            # Windows备用方案
            import codecs
            if hasattr(sys.stdout, 'detach'):
                sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
                sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    except Exception:
        # 如果所有编码配置都失败，就使用默认配置
        pass

# 调用编码设置
ensure_utf8_output()

class GeminiService:
    def __init__(self, api_key=None, debug=False):
        """初始化Gemini服务"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.debug = debug
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY 环境变量未设置")
        
        self.client = genai.Client(api_key=self.api_key)
        if self.debug:
            print(f"✅ Python Gemini 服务初始化成功")
    
    def analyze_video(self, video_path, prompt="Summarize this video. Then create a quiz with an answer key based on the information in this video."):
        """
        分析视频内容
        
        Args:
            video_path (str): 视频文件路径
            prompt (str): 分析提示词
            
        Returns:
            dict: 分析结果
        """
        try:
            import sys
            
            # 上传视频文件
            if self.debug:
                print(f"📁 开始上传视频文件: {video_path}", file=sys.stderr)
            
            uploaded_file = self.client.files.upload(file=video_path)
            
            if self.debug:
                print(f"✅ 文件上传成功，文件ID: {uploaded_file.name}", file=sys.stderr)
                print(f"📊 文件状态: {uploaded_file.state.name}", file=sys.stderr)
            
            # 等待文件处理完成，最多等待10分钟
            max_wait_time = 600  # 10分钟
            wait_time = 0
            file_info = uploaded_file
            
            while file_info.state.name != "ACTIVE" and wait_time < max_wait_time:
                if self.debug:
                    print(f"⏳ 当前状态: {file_info.state.name} - 已等待{wait_time}秒", file=sys.stderr)
                
                time.sleep(5)
                wait_time += 5
                file_info = self.client.files.get(name=uploaded_file.name)
            
            if file_info.state.name != "ACTIVE":
                return {
                    'success': False,
                    'error': f'文件处理超时，当前状态: {file_info.state.name}'
                }
            
            if self.debug:
                print("✅ 文件处理完成，开始生成内容...", file=sys.stderr)
            
            # 生成内容
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[uploaded_file, prompt]
            )

            
            # 处理usage metadata
            usage_info = {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            }
            
            try:
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    usage_info = {
                        'prompt_tokens': getattr(response.usage_metadata, 'prompt_token_count', 0),
                        'completion_tokens': getattr(response.usage_metadata, 'candidates_token_count', 0),
                        'total_tokens': getattr(response.usage_metadata, 'total_token_count', 0)
                    }
            except Exception as e:
                if self.debug:
                    print(f"⚠️ 获取使用统计失败: {e}")
            
            return {
                'success': True,
                'text': response.text,
                'file_id': uploaded_file.name,
                'usage': usage_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_text(self, content, system_instruction=None, model="gemini-2.0-flash"):
        """
        生成文本内容
        
        Args:
            content (str): 输入内容
            system_instruction (str): 系统指令
            model (str): 使用的模型
            
        Returns:
            dict: 生成结果
        """
        try:
            
            # 构建配置
            config = {}
            if system_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                )
            
            # 生成内容
            response = self.client.models.generate_content(
                model=model,
                config=config if system_instruction else None,
                contents=content
            )

            
            # 处理usage metadata
            usage_info = {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            }
            
            try:
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    usage_info = {
                        'prompt_tokens': getattr(response.usage_metadata, 'prompt_token_count', 0),
                        'completion_tokens': getattr(response.usage_metadata, 'candidates_token_count', 0),
                        'total_tokens': getattr(response.usage_metadata, 'total_token_count', 0)
                    }
            except Exception as e:
                if self.debug:
                    print(f"⚠️ 获取使用统计失败: {e}")
            
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
        """
        分析小说内容
        
        Args:
            text_content (str): 小说文本内容
            prompt (str): 分析提示词
            max_length (int): 最大处理长度
            
        Returns:
            dict: 分析结果
        """
        try:
            
            if len(text_content) <= max_length:
                # 直接分析
                full_prompt = f"{prompt}\n\n内容：{text_content}"
                return self.generate_text(full_prompt)
            else:
                # 分块处理
                chunks = self._split_text(text_content, max_length)
                results = []
                
                for i, chunk in enumerate(chunks):
                    chunk_prompt = f"{prompt}\n\n这是文本的第{i+1}部分（共{len(chunks)}部分）：\n\n{chunk}"
                    result = self.generate_text(chunk_prompt)
                    
                    if result['success']:
                        results.append(result)
                    else:
                        return result  # 如果有错误，直接返回
                    
                    # 避免API调用过快
                    if i < len(chunks) - 1:
                        time.sleep(1)
                
                # 合并结果
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
        """分割长文本"""
        chunks = []
        current_chunk = ''
        sentences = text.split('。')
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > max_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence + '。'
                else:
                    # 如果单个句子就超长，强制分割
                    chunks.append(sentence[:max_length])
                    current_chunk = sentence[max_length:] + '。'
            else:
                current_chunk += sentence + '。'
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks

def main():
    """命令行入口"""
    
    if len(sys.argv) < 2:
        print("❌ 用法: python gemini_service.py <command> [args...]", file=sys.stderr)
        print("📋 可用命令:", file=sys.stderr)
        print("   video <video_path> [prompt]", file=sys.stderr)
        print("   text <content> [system_instruction]", file=sys.stderr)
        print("   novel <text_content> <prompt>", file=sys.stderr)
        return
    
    # 从环境变量或参数获取API密钥
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ 请设置 GEMINI_API_KEY 环境变量", file=sys.stderr)
        return
    
    try:
        # 默认非调试模式，除非明确指定
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