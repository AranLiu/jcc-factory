import { GoogleGenerativeAI } from '@google/generative-ai';

// 从本地服务器获取API密钥的函数
async function getApiKeyFromLocalServer() {
  try {
    // 尝试从本地服务器获取API密钥
    const response = await fetch('http://localhost:3001/api/system-config/config/gemini_api_key', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.success ? data.data?.value : null;
    }
  } catch (error) {
    console.log('无法从本地服务器获取API密钥:', error.message);
  }
  return null;
}

const handler = async (event, context) => {
  // 处理 CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 处理路径，支持多种路径格式
    let path = event.path || event.rawUrl || '';
    
    // 移除Netlify函数前缀
    path = path.replace('/.netlify/functions/v1', '');
    
    // 确保路径以/开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    console.log('Netlify Function Request:', {
      originalPath: event.path,
      processedPath: path,
      method: event.httpMethod,
      headers: Object.keys(event.headers || {}),
      body: event.body ? 'present' : 'empty'
    });
    
    // 处理模型列表请求（不需要API密钥，用于测试连接）
    if ((path === '/v1/models' || path === '/models' || path === '/') && event.httpMethod === 'GET') {
      console.log('Processing models request without API key validation');
      
      const models = {
        object: 'list',
        data: [
          { 
            id: 'gpt-3.5-turbo', 
            object: 'model', 
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai'
          },
          { 
            id: 'gpt-4', 
            object: 'model', 
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai'
          },
          { 
            id: 'gpt-4-turbo', 
            object: 'model', 
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai'
          },
          { 
            id: 'gpt-4o', 
            object: 'model', 
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai'
          }
        ]
      };
      
      console.log('Returning models response:', models);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(models),
      };
    }

    // 获取API密钥 - 支持多种来源
    let apiKey = event.headers.authorization?.replace('Bearer ', '') || 
                 event.headers.Authorization?.replace('Bearer ', '');

    // 如果没有从请求头获取到API密钥，尝试从环境变量获取
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      console.log('Using API key from environment variables');
    }

    // 如果还是没有API密钥，尝试从本地服务器获取（仅在开发环境）
    if (!apiKey && process.env.NODE_ENV !== 'production') {
      console.log('Attempting to get API key from local server...');
      apiKey = await getApiKeyFromLocalServer();
      if (apiKey) {
        console.log('Successfully retrieved API key from local server');
      }
    }

    // 对于需要API密钥的请求，检查密钥
    if (!apiKey || apiKey === 'test-key') {
      console.log('API key missing or test key used for path:', path);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: { 
            message: 'You didn\'t provide an API key. You need to provide your API key in an Authorization header using Bearer auth (i.e. Authorization: Bearer YOUR_KEY), or as the password field (with blank username) if you\'re accessing the API from your browser and are prompted for a username and password.',
            type: 'invalid_request_error',
            param: null,
            code: null
          }
        }),
      };
    }

    // 处理聊天完成请求
    if ((path === '/v1/chat/completions' || path === '/chat/completions') && event.httpMethod === 'POST') {
      console.log('Processing chat completions request');
      
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: { 
              message: 'Request body is required',
              type: 'invalid_request_error'
            }
          }),
        };
      }

      const body = JSON.parse(event.body);
      const { model, messages, temperature = 0.7, max_tokens = 1000 } = body;

      if (!messages || !Array.isArray(messages)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: { 
              message: 'Messages array is required',
              type: 'invalid_request_error'
            }
          }),
        };
      }

      // 模型映射
      const modelMapping = {
        'gpt-3.5-turbo': 'gemini-1.5-flash',
        'gpt-4': 'gemini-1.5-pro',
        'gpt-4-turbo': 'gemini-1.5-pro',
        'gpt-4o': 'gemini-2.0-flash-exp'
      };

      const geminiModel = modelMapping[model] || 'gemini-1.5-flash';
      
      // 初始化 Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiClient = genAI.getGenerativeModel({ model: geminiModel });
      
      // 转换消息格式
      const prompt = messages.map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n');
      
      // 生成内容
      const result = await geminiClient.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: max_tokens,
        }
      });
      
      const response = await result.response;
      const text = response.text();
      
      // 返回 OpenAI 格式的响应
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: prompt.length,
          completion_tokens: text.length,
          total_tokens: prompt.length + text.length
        }
      };
      
      console.log('Returning chat completion response');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(openaiResponse),
      };
    }

    console.log('Path not found:', path);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: { 
          message: `The requested path '${path}' was not found`,
          type: 'invalid_request_error'
        }
      }),
    };

  } catch (error) {
    console.error('Netlify Function Error:', {
      message: error.message,
      stack: error.stack,
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: event.headers
      }
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: {
          message: 'Internal server error: ' + error.message,
          type: 'server_error',
          timestamp: new Date().toISOString()
        }
      }),
    };
  }
};

export { handler };