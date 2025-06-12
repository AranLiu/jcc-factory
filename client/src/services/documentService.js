import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 创建axios实例
const documentAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/documents`,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
documentAPI.interceptors.request.use(
  (config) => {
    // 添加认证token（如果有的话）
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
documentAPI.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    
    // 处理不同的错误状态
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          // 未授权，可能需要重新登录
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          break;
        case 403:
          throw new Error('权限不足');
        case 404:
          throw new Error('文档不存在');
        case 413:
          throw new Error('文件过大');
        case 429:
          throw new Error('请求过于频繁，请稍后再试');
        case 500:
          throw new Error('服务器内部错误');
        default:
          throw new Error(data?.error || '未知错误');
      }
    } else if (error.request) {
      throw new Error('网络连接失败，请检查网络');
    } else {
      throw new Error('请求配置错误');
    }
  }
);

/**
 * 文档服务类
 */
class DocumentService {
  /**
   * 保存文档
   * @param {Object} documentData - 文档数据
   * @param {string} documentData.title - 文档标题
   * @param {string} documentData.content - 文档内容
   * @param {string} documentData.format - 保存格式 (json, html, txt)
   */
  async saveDocument(documentData) {
    try {
      const response = await documentAPI.post('/save', documentData);
      return response;
    } catch (error) {
      throw new Error(`保存文档失败: ${error.message}`);
    }
  }

  /**
   * 获取文档列表
   */
  async getDocumentList() {
    try {
      const response = await documentAPI.get('/list');
      return response;
    } catch (error) {
      throw new Error(`获取文档列表失败: ${error.message}`);
    }
  }

  /**
   * 获取单个文档内容
   * @param {string} filename - 文件名
   */
  async getDocument(filename) {
    try {
      const response = await documentAPI.get(`/${filename}`);
      return response;
    } catch (error) {
      throw new Error(`获取文档失败: ${error.message}`);
    }
  }

  /**
   * 删除文档
   * @param {string} filename - 文件名
   */
  async deleteDocument(filename) {
    try {
      const response = await documentAPI.delete(`/${filename}`);
      return response;
    } catch (error) {
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  /**
   * 上传文档
   * @param {File} file - 文件对象
   */
  async uploadDocument(file) {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await axios.post(
        `${API_BASE_URL}/api/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 上传文件需要更长时间
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`上传进度: ${progress}%`);
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`上传文档失败: ${error.message}`);
    }
  }

  /**
   * 搜索文档
   * @param {string} query - 搜索关键词
   */
  async searchDocuments(query) {
    try {
      const response = await documentAPI.get(`/search/${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      throw new Error(`搜索文档失败: ${error.message}`);
    }
  }

  /**
   * 将HTML内容转换为DOCX
   * @param {string} htmlContent - HTML内容
   * @param {string} title - 文档标题
   */
  async convertHtmlToDocx(htmlContent, title = 'document') {
    try {
      const response = await documentAPI.post('/convert/html-to-docx', {
        htmlContent,
        title,
      });
      return response;
    } catch (error) {
      throw new Error(`HTML转DOCX失败: ${error.message}`);
    }
  }

  /**
   * 获取文档下载链接
   * @param {string} filename - 文件名
   */
  getDownloadUrl(filename) {
    return `${API_BASE_URL}/api/documents/download/${filename}`;
  }

  /**
   * 下载文档
   * @param {string} filename - 文件名
   * @param {string} originalName - 原始文件名（可选）
   */
  async downloadDocument(filename, originalName) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/documents/download/${filename}`,
        {
          responseType: 'blob',
          timeout: 60000,
        }
      );

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: '下载成功' };
    } catch (error) {
      throw new Error(`下载文档失败: ${error.message}`);
    }
  }

  /**
   * 批量删除文档
   * @param {string[]} filenames - 文件名数组
   */
  async batchDeleteDocuments(filenames) {
    try {
      const deletePromises = filenames.map(filename => 
        this.deleteDocument(filename)
      );
      
      const results = await Promise.allSettled(deletePromises);
      
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      return {
        successful: successful.length,
        failed: failed.length,
        total: filenames.length,
        errors: failed.map(result => result.reason.message)
      };
    } catch (error) {
      throw new Error(`批量删除失败: ${error.message}`);
    }
  }

  /**
   * 导出文档为指定格式
   * @param {string} content - 文档内容
   * @param {string} format - 导出格式 (txt, html, docx)
   * @param {string} filename - 文件名
   */
  async exportDocument(content, format, filename) {
    try {
      let blob;
      let mimeType;
      let fileExtension;

      switch (format.toLowerCase()) {
        case 'txt':
          blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          mimeType = 'text/plain';
          fileExtension = 'txt';
          break;
        case 'html':
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>${filename}</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
                  h1, h2, h3 { color: #333; }
                  p { margin: 10px 0; }
                </style>
              </head>
              <body>
                ${content}
              </body>
            </html>
          `;
          blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          mimeType = 'text/html';
          fileExtension = 'html';
          break;
        case 'docx':
          // 使用API转换为DOCX
          const result = await this.convertHtmlToDocx(content, filename);
          window.open(result.downloadUrl, '_blank');
          return { success: true, message: 'DOCX文档已生成并可下载' };
        default:
          throw new Error('不支持的导出格式');
      }

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: `${format.toUpperCase()}文档导出成功` };
    } catch (error) {
      throw new Error(`导出文档失败: ${error.message}`);
    }
  }
}

// 导出单例
export default new DocumentService(); 