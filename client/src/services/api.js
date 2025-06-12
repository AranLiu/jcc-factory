import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 30000,
})

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

// 认证相关API
export const authAPI = {
  changePassword: (data) => api.post('/api/auth/change-password', data),
  // 管理员用户管理API
  getUsers: () => api.get('/api/auth/users'),
  createUser: (data) => api.post('/api/auth/users', data),
  resetUserPassword: (userId, newPassword) => api.post(`/api/auth/users/${userId}/reset-password`, { newPassword }),
  deleteUser: (userId) => api.delete(`/api/auth/users/${userId}`),
  updateUserStatus: (userId, status) => api.put(`/api/auth/users/${userId}/status`, { status }),
  updateUserRemarks: (userId, remarks) => api.put(`/api/auth/users/${userId}/remarks`, { remarks }),
  updateUserPermission: (userId, permission) => api.put(`/api/auth/users/${userId}/permission`, { permission })
}

// 系统配置相关API
export const systemConfigAPI = {
  // 获取所有配置
  getAllConfigs: () => api.get('/api/system-config'),
  
  // 获取连接状态
  getStatus: () => api.get('/api/system-config/status'),
  
  // 更新Gemini API密钥
  updateGeminiKey: (apiKey) => api.put('/api/system-config/gemini-key', { apiKey }),
  
  // 更新模型配置
  updateModels: (defaultModel, availableModels) => api.put('/api/system-config/models', { defaultModel, availableModels }),
  
  // 更新代理配置
  updateProxy: (enabled, httpProxy, httpsProxy, noProxy) => api.put('/api/system-config/proxy', { enabled, httpProxy, httpsProxy, noProxy }),
  
  // 测试Gemini连接（使用更长超时）
  testGemini: () => api.post('/api/system-config/test-gemini', {}, { timeout: 120000 }),
  
  // 测试代理连接（使用更长超时）
  testProxy: () => api.post('/api/system-config/test-proxy', {}, { timeout: 120000 }),
  
  // 应用配置
  applyConfigs: () => api.post('/api/system-config/apply'),
  
  // 清除缓存
  clearCache: () => api.post('/api/system-config/clear-cache'),
  
  // 获取推荐的代理URL
  getProxyUrls: () => api.get('/api/system-config/proxy-urls'),
  
  // 获取代理服务配置
  getProxyConfig: () => api.get('/api/system-config/proxy-config'),
  
  // 更新代理服务配置
  updateProxyConfig: (config) => api.put('/api/system-config/proxy-config', config),
  
  // 获取单个配置
  getConfig: (key) => api.get(`/api/system-config/config/${key}`),
  
  // 设置单个配置
  setConfig: (key, value, userId) => api.put(`/api/system-config/config/${key}`, { value, userId })
}

// 项目相关API
export const projectAPI = {
  getList: () => api.get('/api/projects'),
  getDetail: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  updatePrompts: (id, data) => api.put(`/api/projects/${id}/prompts`, data),
  delete: (id) => api.delete(`/api/projects/${id}`)
}

// 文件相关API  
export const fileAPI = {
  upload: (projectId, file, projectType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)
    formData.append('projectType', projectType)
    
    return api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  renameFile: (fileId, name) => api.put(`/api/files/${fileId}/rename`, { name }),
  getProjectFiles: (projectId) => api.get(`/api/files/project/${projectId}`),
  delete: (fileId) => api.delete(`/api/files/${fileId}`),
  getDownloadUrl: (fileId) => `/api/files/${fileId}/download`,
  updateAnalysisResult: (fileId, result) => api.put(`/api/files/${fileId}/analysis-result`, { result })
}

// AI相关API
export const aiAPI = {
  testConnection: () => api.get('/api/ai/test'),
  getModels: () => api.get('/api/ai/models'),
  analyze: (data) => api.post('/api/ai/analyze', data),
  integrate: (data) => api.post('/api/ai/integrate-script', data),
  integrateScript: (data) => api.post('/api/ai/integrate-script', data),
  getTaskStatus: (taskId) => api.get(`/api/ai/task/${taskId}`),
  getProjectTasks: (projectId) => api.get(`/api/ai/tasks/project/${projectId}`)
}

// 知识库相关API
export const knowledgeBaseAPI = {
  getAll: (tagIds) => {
    let url = '/api/knowledge-base';
    if (tagIds && tagIds.length > 0) {
      url += `?tagIds=${tagIds.join(',')}`;
    }
    return api.get(url);
  },
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/knowledge-base/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id) => api.delete(`/api/knowledge-base/${id}`),
  archive: (data) => api.post('/api/knowledge-base/archive', data),
  getPreview: (id) => api.get(`/api/knowledge-base/${id}/preview`),
  getContent: (id) => api.get(`/api/knowledge-base/${id}/content`),
  updateContent: (id, content) => api.put(`/api/knowledge-base/${id}/content`, { content }),
  updateTitle: (id, title) => api.put(`/api/knowledge-base/${id}/title`, { title }),
  addTag: (id, tagId) => api.post(`/api/knowledge-base/${id}/tags`, { tagId }),
  removeTag: (id, tagId) => api.delete(`/api/knowledge-base/${id}/tags/${tagId}`),
}

// 标签相关API
export const tagsAPI = {
  getAll: () => api.get('/api/tags'),
  create: (data) => api.post('/api/tags', data),
  delete: (id) => api.delete(`/api/tags/${id}`),
}

export default api 