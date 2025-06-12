import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// 配置axios默认设置
axios.defaults.baseURL = ''
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // 只在token验证失败时跳转，登录失败时不跳转
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        error.config?.url !== '/api/auth/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          const response = await axios.get('/api/auth/verify')
          // 使用服务器返回的最新用户信息，确保包含权限字段
          const latestUser = response.data.user
          setUser(latestUser)
          // 更新localStorage中的用户信息
          localStorage.setItem('user', JSON.stringify(latestUser))
        } catch (error) {
          console.error('Token验证失败:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      
      return { success: true, message: response.data.message }
    } catch (error) {
      const message = error.response?.data?.message || '登录失败'
      return { success: false, message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 