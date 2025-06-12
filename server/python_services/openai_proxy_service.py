# -*- coding: utf-8 -*-
import os
import sys
import json
import time
import openai
from openai import OpenAI

# 设置UTF-8编码输出，解决Windows控制台显示问题
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class OpenAIProxyService:
    """
    使用本地Gemini代理的OpenAI客户端服务
    通过本地代理服务器访问Gemini API，避免直接网络连接问题
    """
    
    def __init__(self, proxy_url="http://localhost:8080", debug=False):
        """
        初始化OpenAI客户端，使用本地Gemini代理
        
        Args:
            proxy_url: 本地代理服务器地址
            debug: 是否启用调试模式
        """
        self.proxy_url = proxy_url
        self.debug = debug
        self.api_key = os.getenv('GEMINI_API_KEY')
        
        if not self.api_key:
            raise ValueError("未找到GEMINI_API_KEY环境变量")
        
        # 初始化OpenAI客户端，指向本地代理
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=f"{self.proxy_url}/v1"
        )
        
                                if self.debug:
                print(f"✅ OpenAI代理客户端初始化成功", file=sys.stderr)
                print(f"📍 代理地址: {self.proxy_url}", file=sys.stderr)
                print(f"🔑 API密钥: {self.api_key[:10]}...{self.api_key[-4:]}", file=sys.stderr)

    def process_text(self, text, model="gpt-3.5-turbo", temperature=0.7, system_instruction=None):
        """
        处理文本请求
        
        Args:
            text: 输入文本
            model: 模型名称（使用OpenAI模型名，会自动映射到Gemini）
            temperature: 温度参数
            system_instruction: 系统指令
            
        Returns:
            dict: 处理结果
        """
        try:
            if self.debug:
                print(f"🔤 处理文本: {text[:50]}...")
                print(f"🤖 使用模型: {model}")
            
            # 构建消息
            messages = []
            
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            
            messages.append({"role": "user", "content": text})
            
            # 发送请求
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=4000
            )
            
            result_text = response.choices[0].message.content
            
            if self.debug:
                print(f"✅ 文本处理成功，响应长度: {len(result_text)}")
            
            return {
                'success': True,
                'text': result_text,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'model': response.model,
                'finish_reason': response.choices[0].finish_reason
            }
            
        except Exception as e:
            if self.debug:
                print(f"❌ 文本处理失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'text': None
            }

    def process_video(self, video_path, prompt, model="gpt-4", temperature=0.7, system_instruction=None):
        """
        处理视频文件（注意：当前通过代理可能不支持视频，需要特殊处理）
        
        Args:
            video_path: 视频文件路径
            prompt: 分析提示
            model: 模型名称
            temperature: 温度参数
            system_instruction: 系统指令
            
        Returns:
            dict: 处理结果
        """
        try:
            if self.debug:
                print(f"🎥 处理视频: {video_path}")
                print(f"📝 提示词: {prompt[:50]}...")
            
            # 注意：OpenAI代理可能不直接支持视频上传
            # 这里先返回一个模拟的错误，建议回退到原始Gemini API
            return {
                'success': False,
                'error': 'Video processing not supported through proxy, use direct Gemini API',
                'text': None,
                'fallback_to_direct': True
            }
            
        except Exception as e:
            if self.debug:
                print(f"❌ 视频处理失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'text': None
            }

    def get_embeddings(self, texts, model="text-embedding-ada-002"):
        """
        获取文本嵌入
        
        Args:
            texts: 文本列表或单个文本
            model: 嵌入模型名称
            
        Returns:
            dict: 嵌入结果
        """
        try:
            if self.debug:
                print(f"📊 获取嵌入，文本数量: {len(texts) if isinstance(texts, list) else 1}")
            
            response = self.client.embeddings.create(
                model=model,
                input=texts
            )
            
            embeddings = [item.embedding for item in response.data]
            
            if self.debug:
                print(f"✅ 嵌入获取成功，维度: {len(embeddings[0]) if embeddings else 0}")
            
            return {
                'success': True,
                'embeddings': embeddings,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'model': response.model
            }
            
        except Exception as e:
            if self.debug:
                print(f"❌ 嵌入获取失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'embeddings': None
            }

    def test_connection(self):
        """
        测试代理连接
        
        Returns:
            dict: 测试结果
        """
        try:
            if self.debug:
                print("🔧 测试代理连接...")
            
            start_time = time.time()
            
            # 发送简单的测试请求
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "请回复：连接测试成功"}],
                max_tokens=50
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            
            result_text = response.choices[0].message.content
            
            if self.debug:
                print(f"✅ 代理连接测试成功")
                print(f"⏱️  响应时间: {response_time:.2f}ms")
                print(f"📝 响应内容: {result_text}")
            
            return {
                'success': True,
                'message': '代理连接正常',
                'response_text': result_text,
                'response_time': response_time,
                'proxy_url': self.proxy_url
            }
            
        except Exception as e:
            if self.debug:
                print(f"❌ 代理连接测试失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': '代理连接失败',
                'proxy_url': self.proxy_url
            }

def main():
    """
    命令行入口函数
    """
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python openai_proxy_service.py <type> <content> [options]'
        }))
        return
    
    # 解析参数
    action_type = sys.argv[1]
    content = sys.argv[2]
    
    # 解析可选参数
    model = "gpt-3.5-turbo"
    temperature = 0.7
    system_instruction = None
    debug = os.getenv('DEBUG') == 'true'
    proxy_url = os.getenv('GEMINI_PROXY_URL', 'http://localhost:8080')
    
    for i in range(3, len(sys.argv)):
        arg = sys.argv[i]
        if arg.startswith('model='):
            model = arg.split('=', 1)[1]
        elif arg.startswith('temperature='):
            temperature = float(arg.split('=', 1)[1])
        elif arg.startswith('system='):
            system_instruction = arg.split('=', 1)[1]
        elif arg.startswith('proxy='):
            proxy_url = arg.split('=', 1)[1]
    
    try:
        # 创建服务实例
        service = OpenAIProxyService(proxy_url=proxy_url, debug=debug)
        
        # 根据操作类型处理
        if action_type == 'text':
            result = service.process_text(
                text=content,
                model=model,
                temperature=temperature,
                system_instruction=system_instruction
            )
        elif action_type == 'video':
            result = service.process_video(
                video_path=content,
                prompt=system_instruction or "分析这个视频内容",
                model=model,
                temperature=temperature
            )
        elif action_type == 'embedding':
            result = service.get_embeddings(
                texts=content,
                model=model
            )
        elif action_type == 'test':
            result = service.test_connection()
        else:
            result = {
                'success': False,
                'error': f'Unknown action type: {action_type}'
            }
        
        # 输出结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'type': 'initialization_error'
        }, ensure_ascii=False))

if __name__ == "__main__":
    main() 