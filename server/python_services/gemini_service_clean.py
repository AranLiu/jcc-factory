#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import time
import google.generativeai as genai

# 设置UTF-8编码输出，解决Windows控制台显示问题
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class SimpleGeminiService:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # 配置Gemini API
        genai.configure(api_key=self.api_key)

    def process_text(self, text, model="gemini-1.5-flash", temperature=0.7):
        """处理文本请求"""
        try:
            # 模型映射
            model_mapping = {
                'gpt-3.5-turbo': 'gemini-1.5-flash',
                'gpt-4': 'gemini-1.5-pro',
                'gpt-4-turbo': 'gemini-1.5-pro'
            }
            
            gemini_model = model_mapping.get(model, model)
            
            # 创建模型实例
            model_instance = genai.GenerativeModel(gemini_model)
            
            # 生成内容
            response = model_instance.generate_content(
                text,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=4000,
                )
            )
            
            return {
                'success': True,
                'text': response.text,
                'model': gemini_model,
                'finish_reason': 'stop'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'text': None
            }

    def test_connection(self):
        """测试连接"""
        try:
            start_time = time.time()
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content("请回复：连接测试成功")
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            return {
                'success': True,
                'message': '直连服务正常',
                'response_text': response.text,
                'response_time': response_time
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': '直连服务失败'
            }

def main():
    """命令行入口函数"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python gemini_service_clean.py <type> <content> [options]'
        }))
        return
    
    # 解析参数
    action_type = sys.argv[1]
    content = sys.argv[2]
    
    # 解析可选参数
    model = "gemini-1.5-flash"
    temperature = 0.7
    
    for i in range(3, len(sys.argv)):
        arg = sys.argv[i]
        if arg.startswith('model='):
            model = arg.split('=', 1)[1]
        elif arg.startswith('temperature='):
            temperature = float(arg.split('=', 1)[1])
    
    try:
        # 创建服务实例
        service = SimpleGeminiService()
        
        # 执行相应操作
        if action_type == 'text':
            result = service.process_text(content, model, temperature)
        elif action_type == 'test':
            result = service.test_connection()
        else:
            result = {
                'success': False,
                'error': f'Unknown action type: {action_type}'
            }
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main() 