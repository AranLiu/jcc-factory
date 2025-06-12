import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { message } from 'antd'
import Login from './pages/Login'
import Homepage from './pages/Homepage'
import Workspace from './pages/Workspace'
import ProjectDetail from './pages/ProjectDetail'
import KnowledgeBase from './pages/KnowledgeBase'
import UserManagement from './pages/UserManagement'
import SystemConfig from './pages/SystemConfig'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div>加载中...</div>
  }
  
  return user ? children : <Navigate to="/login" replace />
}

// 公开路由组件（已登录用户重定向）
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div>加载中...</div>
  }
  
  return user ? <Navigate to="/" replace /> : children
}

function App() {
  // 配置全局消息
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
  })

  return (
    <AuthProvider>
      <Routes>
        {/* 公开路由 */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* 受保护的路由 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/project/:id" 
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/knowledge-base" 
          element={
            <ProtectedRoute>
              <KnowledgeBase />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/user-management" 
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/system-config" 
          element={
            <ProtectedRoute>
              <SystemConfig />
            </ProtectedRoute>
          } 
        />
        
        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App 