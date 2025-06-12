# -*- coding: utf-8 -*-
"""
简化版Python Gemini 服务
避免编码兼容性问题，支持代理配置
"""

import os
import time
import json
import sys
import urllib3
import google.generativeai as genai

# 设置UTF-8编码输出，解决Windows控制台显示问题
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 配置代理支持
def setup_proxy():
    """配置代理设置"""
    proxy_config = {}
    
    # 获取代理配置
    http_proxy = os.getenv('HTTP_PROXY') or os.getenv('http_proxy')
    https_proxy = os.getenv('HTTPS_PROXY') or os.getenv('https_proxy')
    socks_proxy = os.getenv('SOCKS_PROXY') or os.getenv('socks_proxy')
    
    if http_proxy or https_proxy or socks_proxy:
        print(f"🔗 检测到代理配置:")
        if http_proxy:
            print(f"  HTTP代理: {http_proxy}")
            proxy_config['http'] = http_proxy
        if https_proxy:
            print(f"  HTTPS代理: {https_proxy}")
            proxy_config['https'] = https_proxy
        if socks_proxy:
            print(f"  SOCKS代理: {socks_proxy}")
            
        # 设置urllib3代理
        if http_proxy or https_proxy:
            urllib3.util.connection.create_connection = _create_connection_with_proxy
            
    return proxy_config

def _create_connection_with_proxy(address, timeout=None, source_address=None):
    """创建支持代理的连接"""
    # 这里可以根据需要实现更复杂的代理逻辑
    # 当前版本依赖系统级代理设置
    return urllib3.util.connection.create_connection(address, timeout, source_address)

class GeminiService:
    def __init__(self, api_key=None, debug=False):
        """初始化Gemini服务"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.debug = debug
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY 环境变量未设置")
        
        # 设置代理
        self.proxy_config = setup_proxy()
        
        # 配置API密钥
        try:
            genai.configure(api_key=self.api_key)
            if self.debug:
                print("✅ Gemini API配置成功")
        except Exception as e:
            print(f"❌ Gemini API配置失败: {e}")
            raise
    
    def analyze_video(self, video_path, prompt, model="gemini-2.0-flash", temperature=0.7):
        """分析视频内容"""
        try:
            # 检查文件是否存在
            if not os.path.exists(video_path):
                return {
                    'success': False,
                    'error': f'视频文件不存在: {video_path}'
                }
            
            if self.debug:
                print(f"📹 开始分析视频: {video_path}")
                print(f"🤖 使用模型: {model}")
                print(f"🌡️  温度参数: {temperature}")
            
            # 上传视频文件
            uploaded_file = genai.upload_file(video_path)
            
            if self.debug:
                print(f"⬆️  文件上传完成，等待处理...")
            
            # 等待文件处理完成
            max_wait_time = 600  # 10分钟
            wait_time = 0
            file_info = uploaded_file
            
            while file_info.state.name != "ACTIVE" and wait_time < max_wait_time:
                time.sleep(5)
                wait_time += 5
                file_info = genai.get_file(uploaded_file.name)
                
                if self.debug and wait_time % 30 == 0:
                    print(f"⏳ 等待文件处理中... 状态: {file_info.state.name}, 已等待: {wait_time}秒")
            
            if file_info.state.name != "ACTIVE":
                return {
                    'success': False,
                    'error': f'文件处理超时，当前状态: {file_info.state.name}'
                }
            
            if self.debug:
                print(f"✅ 文件处理完成，开始生成内容...")
            
            # 创建模型并生成内容
            model_instance = genai.GenerativeModel(model)
            
            # 生成内容
            response = model_instance.generate_content(
                [uploaded_file, prompt],
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=8192
                )
            )

            if self.debug:
                print(f"🎉 视频分析完成")

            return {
                'success': True,
                'text': response.text,
                'usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}
            }
            
        except Exception as e:
            error_msg = str(e)
            if self.debug:
                print(f"❌ 视频分析失败: {error_msg}")
            
            return {
                'success': False,
                'error': error_msg
            }
    
    def generate_text(self, content, system_instruction=None, model="gemini-2.0-flash", temperature=0.7):
        """生成文本内容"""
        try:
            if self.debug:
                print(f"📝 开始生成文本")
                print(f"🤖 使用模型: {model}")
                print(f"🌡️  温度参数: {temperature}")
            
            # 创建模型
            if system_instruction:
                model_instance = genai.GenerativeModel(
                    model_name=model,
                    system_instruction=system_instruction
                )
                if self.debug:
                    print(f"📋 系统指令: {system_instruction[:100]}...")
            else:
                model_instance = genai.GenerativeModel(model)
            
            # 生成内容
            response = model_instance.generate_content(
                content,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=8192
                )
            )

            if self.debug:
                print(f"🎉 文本生成完成")

            return {
                'success': True,
                'text': response.text,
                'usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}
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
    """命令行入口"""
    if len(sys.argv) < 2:
        return
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return
    
    try:
        # 启用调试模式
        debug_mode = os.getenv('GEMINI_DEBUG', 'false').lower() == 'true'
        service = GeminiService(api_key, debug=debug_mode)
        command = sys.argv[1]
        
        if command == "video":
            if len(sys.argv) < 3:
                return
            video_path = sys.argv[2]
            prompt = sys.argv[3] if len(sys.argv) > 3 else "Analyze this video"
            
            # 解析模型配置参数（JSON格式）
            model_config = {}
            if len(sys.argv) > 4 and sys.argv[4].startswith('{'):
                try:
                    model_config = json.loads(sys.argv[4])
                except json.JSONDecodeError:
                    pass
            
            model = model_config.get('model', 'gemini-1.5-flash')
            temperature = model_config.get('temperature', 0.7)
            result = service.analyze_video(video_path, prompt, model, temperature)
            
        elif command == "text":
            if len(sys.argv) < 3:
                return
            content = sys.argv[2]
            system_instruction = sys.argv[3] if len(sys.argv) > 3 else None
            
            # 解析模型配置参数（JSON格式）
            model_config = {}
            # 查找JSON参数 - 可能在第4个或第5个位置
            for i in range(3, len(sys.argv)):
                if sys.argv[i].startswith('{'):
                    try:
                        model_config = json.loads(sys.argv[i])
                        break
                    except json.JSONDecodeError:
                        continue
            
            model = model_config.get('model', 'gemini-1.5-flash')
            temperature = model_config.get('temperature', 0.7)
            result = service.generate_text(content, system_instruction, model, temperature)
            
        else:
            result = {'success': False, 'error': 'Unknown command'}
        
        # 简单输出，避免编码问题
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {'success': False, 'error': str(e)}
        print(json.dumps(error_result, ensure_ascii=False))

if __name__ == "__main__":
    main() 