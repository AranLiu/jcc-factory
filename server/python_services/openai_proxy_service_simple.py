#!/usr/bin/env python3
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

class SimpleOpenAIProxy:
    def __init__(self, proxy_url="http://localhost:8080"):
        self.proxy_url = proxy_url
        self.api_key = os.getenv('GEMINI_API_KEY', 'dummy-key')
        
        # 初始化OpenAI客户端，指向本地代理
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=f"{self.proxy_url}/v1"
        )

    def process_text(self, text, model="gpt-3.5-turbo", temperature=0.7):
        """处理文本请求"""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": text}],
                temperature=temperature,
                max_tokens=4000
            )
            
            result_text = response.choices[0].message.content
            
            return {
                'success': True,
                'text': result_text,
                'model': response.model,
                'finish_reason': response.choices[0].finish_reason
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'text': None
            }

    def test_connection(self):
        """测试代理连接"""
        try:
            start_time = time.time()
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "请回复：连接测试成功"}],
                max_tokens=50
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            result_text = response.choices[0].message.content
            
            return {
                'success': True,
                'message': '代理连接正常',
                'response_text': result_text,
                'response_time': response_time,
                'proxy_url': self.proxy_url
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': '代理连接失败',
                'proxy_url': self.proxy_url
            }

def main():
    """命令行入口函数"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python openai_proxy_service_simple.py <type> <content> [options]'
        }))
        return
    
    # 解析参数
    action_type = sys.argv[1]
    content = sys.argv[2]
    
    # 解析可选参数
    model = "gpt-3.5-turbo"
    temperature = 0.7
    
    for i in range(3, len(sys.argv)):
        arg = sys.argv[i]
        if arg.startswith('model='):
            model = arg.split('=', 1)[1]
        elif arg.startswith('temperature='):
            temperature = float(arg.split('=', 1)[1])
    
    # 创建代理服务实例
    proxy = SimpleOpenAIProxy()
    
    # 执行相应操作
    if action_type == 'text':
        result = proxy.process_text(content, model, temperature)
    elif action_type == 'test':
        result = proxy.test_connection()
    else:
        result = {
            'success': False,
            'error': f'Unknown action type: {action_type}'
        }
    
    # 输出JSON结果
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main() 