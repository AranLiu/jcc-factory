import React, { useState, useEffect } from 'react'
import { 
  Layout, 
  Card, 
  Button, 
  Input, 
  Select, 
  Switch, 
  message,
  Space,
  Typography,
  Divider,
  Tag,
  Spin,
  Row,
  Col,
  Alert,
  Modal
} from 'antd'
import { 
  ArrowLeftOutlined,
  SettingOutlined,
  ApiOutlined,
  GlobalOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { systemConfigAPI } from '../services/api'
import dayjs from 'dayjs'

const { Header, Content } = Layout
const { Text, Title } = Typography
const { Option } = Select

const SystemConfig = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [configs, setConfigs] = useState({})
  const [status, setStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState({})
  const [proxyServiceStatus, setProxyServiceStatus] = useState(null)
  
  // 编辑状态
  const [editing, setEditing] = useState({})
  const [tempValues, setTempValues] = useState({})
  
  // 模型管理状态
  const [newModel, setNewModel] = useState('')
  const [showAddModel, setShowAddModel] = useState(false)
  
  // Prompt编辑弹窗状态
  const [promptModal, setPromptModal] = useState({
    visible: false,
    type: '', // 'video_analysis_prompt' 或 'script_integration_prompt'
    title: '',
    value: '',
    placeholder: ''
  })
  
  useEffect(() => {
    // 检查是否是管理员
    if (user?.role !== 'admin') {
      message.error('您没有访问此页面的权限')
      navigate('/')
      return
    }
    
    loadConfigs()
    loadStatus()
  }, [user, navigate])

  const loadConfigs = async () => {
    try {
      const response = await systemConfigAPI.getAllConfigs()
      setConfigs(response.data || {})
    } catch (error) {
      message.error('加载配置失败: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  const loadStatus = async () => {
    try {
      const response = await systemConfigAPI.getStatus()
      setStatus(response.data || {})
    } catch (error) {
      console.error('加载状态失败:', error)
    }
  }

  const startEdit = (key, currentValue) => {
    setEditing({ ...editing, [key]: true })
    setTempValues({ ...tempValues, [key]: currentValue })
  }

  const cancelEdit = (key) => {
    setEditing({ ...editing, [key]: false })
    const newTempValues = { ...tempValues }
    delete newTempValues[key]
    setTempValues(newTempValues)
  }

  const saveEdit = async (key, value) => {
    try {
      if (key === 'gemini_api_key') {
        await systemConfigAPI.updateGeminiKey(value)
      } else if (key === 'gemini_default_model') {
        const availableModels = configs.gemini_available_models?.value || []
        await systemConfigAPI.updateModels(value, availableModels)
      } else if (key === 'video_analysis_prompt') {
        await systemConfigAPI.updateVideoAnalysisPrompt(value)
      } else if (key === 'script_integration_prompt') {
        await systemConfigAPI.updateScriptIntegrationPrompt(value)
      } else if (key.startsWith('proxy_')) {
        const proxyData = {
          enabled: configs.proxy_enabled?.value || false,
          httpProxy: configs.proxy_http?.value || '',
          httpsProxy: configs.proxy_https?.value || '',
          noProxy: configs.proxy_no_proxy?.value || 'localhost,127.0.0.1'
        }
        
        if (key === 'proxy_enabled') {
          proxyData.enabled = value
        } else if (key === 'proxy_http') {
          proxyData.httpProxy = value
        } else if (key === 'proxy_https') {
          proxyData.httpsProxy = value
        } else if (key === 'proxy_no_proxy') {
          proxyData.noProxy = value
        }
        
        await systemConfigAPI.updateProxy(
          proxyData.enabled, 
          proxyData.httpProxy, 
          proxyData.httpsProxy, 
          proxyData.noProxy
        )
      }
      
      message.success('配置更新成功')
      
      // 清除编辑状态
      cancelEdit(key)
      
      // 重新加载配置和状态
      await Promise.all([loadConfigs(), loadStatus()])
      
    } catch (error) {
      message.error('更新失败: ' + (error.response?.data?.message || error.message))
    }
  }

  // 打开Prompt编辑弹窗
  const openPromptModal = (type, currentValue) => {
    const titles = {
      'video_analysis_prompt': '编辑视频解析Prompt',
      'script_integration_prompt': '编辑剧本整合Prompt'
    }
    
    const placeholders = {
      'video_analysis_prompt': '请输入视频解析的提示词...',
      'script_integration_prompt': '请输入剧本整合的提示词...'
    }

    setPromptModal({
      visible: true,
      type,
      title: titles[type],
      value: currentValue || '',
      placeholder: placeholders[type]
    })
  }

  // 保存Prompt编辑
  const savePromptModal = async () => {
    try {
      await saveEdit(promptModal.type, promptModal.value)
      setPromptModal({ ...promptModal, visible: false })
    } catch (error) {
      // 错误已在saveEdit中处理
    }
  }

  // 关闭Prompt编辑弹窗
  const closePromptModal = () => {
    setPromptModal({
      visible: false,
      type: '',
      title: '',
      value: '',
      placeholder: ''
    })
  }

  const testConnection = async (type) => {
    setTesting({ ...testing, [type]: true })
    
    try {
      const response = type === 'gemini' 
        ? await systemConfigAPI.testGemini()
        : await systemConfigAPI.testProxy()
      
      const result = response.data
      
      if (result.success) {
        message.success(`${type === 'gemini' ? 'Gemini API' : '代理'} 连接测试成功`)
      } else {
        message.warning(`${type === 'gemini' ? 'Gemini API' : '代理'} 连接测试失败: ${result.message}`)
      }
      
      // 重新加载状态
      await loadStatus()
      
    } catch (error) {
      message.error('测试失败: ' + (error.response?.data?.message || error.message))
    } finally {
      setTesting({ ...testing, [type]: false })
    }
  }

  const addModel = async () => {
    if (!newModel.trim()) {
      message.warning('请输入模型名称')
      return
    }
    
    const currentModels = configs.gemini_available_models?.value || []
    if (currentModels.includes(newModel.trim())) {
      message.warning('模型已存在')
      return
    }
    
    const updatedModels = [...currentModels, newModel.trim()]
    
    try {
      await systemConfigAPI.updateModels(
        configs.gemini_default_model?.value || updatedModels[0],
        updatedModels
      )
      
      message.success('模型添加成功')
      setNewModel('')
      setShowAddModel(false)
      await loadConfigs()
      
    } catch (error) {
      message.error('添加模型失败: ' + (error.response?.data?.message || error.message))
    }
  }

  const removeModel = async (modelToRemove) => {
    const currentModels = configs.gemini_available_models?.value || []
    
    if (currentModels.length <= 1) {
      message.warning('至少需要保留一个模型')
      return
    }
    
    if (configs.gemini_default_model?.value === modelToRemove) {
      message.warning('不能删除当前默认模型，请先设置其他模型为默认')
      return
    }
    
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除模型 "${modelToRemove}" 吗？`,
      onOk: async () => {
        const updatedModels = currentModels.filter(m => m !== modelToRemove)
        
        try {
          await systemConfigAPI.updateModels(
            configs.gemini_default_model?.value,
            updatedModels
          )
          
          message.success('模型删除成功')
          await loadConfigs()
          
        } catch (error) {
          message.error('删除模型失败: ' + (error.response?.data?.message || error.message))
        }
      }
    })
  }

  const getStatusIcon = (success) => {
    return success ? '🟢' : '🔴'
  }

  const getStatusText = (success, message) => {
    return (
      <Space>
        <span>{getStatusIcon(success)}</span>
        <Text type={success ? 'success' : 'danger'}>
          {message || (success ? '连接正常' : '连接失败')}
        </Text>
      </Space>
    )
  }

  const renderEditableField = (key, label, value, type = 'input', options = {}) => {
    const isEditing = editing[key]
    const tempValue = tempValues[key]
    
    if (isEditing) {
      return (
        <div style={{ width: '100%' }}>
          {type === 'input' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={tempValue}
                onChange={(e) => setTempValues({ ...tempValues, [key]: e.target.value })}
                placeholder={label}
                style={{ flex: 1 }}
                {...options}
              />
              <Button 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={() => saveEdit(key, tempValue)}
              />
              <Button 
                icon={<CloseOutlined />}
                onClick={() => cancelEdit(key)}
              />
            </div>
          )}
          {type === 'select' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                value={tempValue}
                onChange={(value) => setTempValues({ ...tempValues, [key]: value })}
                style={{ flex: 1 }}
                {...options}
              >
                {options.data?.map(item => (
                  <Option key={item} value={item}>{item}</Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={() => saveEdit(key, tempValue)}
              />
              <Button 
                icon={<CloseOutlined />}
                onClick={() => cancelEdit(key)}
              />
            </div>
          )}
        </div>
      )
    }
    
    return (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text code={key.includes('key')} style={{ flex: 1 }}>
          {key.includes('key') && value ? 
            `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : 
            value || '未设置'
          }
        </Text>
        <Button 
          type="link" 
          icon={<EditOutlined />}
          size="small"
          onClick={() => startEdit(key, value)}
        />
      </Space>
    )
  }

  // Prompt字段专用渲染函数
  const renderPromptField = (key, value) => {
    return (
      <div style={{ 
        border: '1px solid #d9d9d9', 
        borderRadius: '6px', 
        padding: '8px 12px',
        backgroundColor: '#fafafa',
        position: 'relative'
      }}>
        <Text style={{ 
          fontSize: '14px', 
          color: '#666',
          display: 'block',
          lineHeight: '20px',
          maxHeight: '60px',
          overflow: 'hidden',
          wordBreak: 'break-word'
        }}>
          {value ? `${value.substring(0, 120)}${value.length > 120 ? '...' : ''}` : '未设置'}
        </Text>
        <Button 
          type="link" 
          icon={<EditOutlined />}
          size="small"
          onClick={() => openPromptModal(key, value)}
          style={{ 
            position: 'absolute',
            top: '4px',
            right: '4px',
            padding: '4px',
            minWidth: 'auto'
          }}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <Layout className="workspace-layout" style={{ minHeight: '100vh' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <Spin size="large" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout className="workspace-layout" style={{ minHeight: '100vh' }}>
      <Header className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/workspace')}
            style={{ marginRight: 16 }}
          >
            返回工作台
          </Button>
          <h4 style={{ margin: 0, color: 'white', fontSize: 16 }}>系统配置</h4>
        </div>
        <div className="header-right">
          <span style={{ color: '#000', marginRight: 16 }}>👋 {user?.username}</span>
          <Button type="link" onClick={logout} style={{ color: '#000' }}>退出</Button>
        </div>
      </Header>

      <Content className="workspace-content">
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <div>
              <Title level={4} style={{ margin: 0, marginBottom: 8, fontSize: 23 }}>
                <SettingOutlined /> 系统配置
              </Title>
              <Text type="secondary">
                管理AI模型和代理配置，确保系统正常运行
              </Text>
            </div>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {/* AI模型配置卡片 - 紧凑版本 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={8}>
                    <ApiOutlined />
                    <span>AI模型配置</span>
                    {status.gemini && getStatusIcon(status.gemini.success)}
                  </Space>
                  <Button 
                    type="text" 
                    icon={<PlayCircleOutlined />}
                    size="small"
                    onClick={() => testConnection('gemini')}
                    loading={testing.gemini}
                  >
                    测试
                  </Button>
                </div>
              }
              style={{ height: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '400px' }}>
                {/* API密钥 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong>API密钥</Text>
                    {status.gemini && (
                      <div style={{ fontSize: '14px' }}>
                        {getStatusText(status.gemini.success, status.gemini.message)}
                      </div>
                    )}
                  </div>
                  {renderEditableField(
                    'gemini_api_key',
                    '请输入您的Gemini API密钥',
                    configs.gemini_api_key?.value,
                    'input',
                    { type: 'password' }
                  )}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 默认模型 */}
                <div>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>默认模型</Text>
                  {renderEditableField(
                    'gemini_default_model',
                    '选择默认模型',
                    configs.gemini_default_model?.value,
                    'select',
                    { data: configs.gemini_available_models?.value || [] }
                  )}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 可用模型列表 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong>可用模型</Text>
                    <Button 
                      type="dashed" 
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setShowAddModel(true)}
                    >
                      添加模型
                    </Button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(configs.gemini_available_models?.value || []).map(model => (
                      <Tag 
                        key={model} 
                        color={model === configs.gemini_default_model?.value ? 'blue' : 'default'}
                        closable={configs.gemini_available_models?.value?.length > 1}
                        onClose={() => removeModel(model)}
                      >
                        {model}
                        {model === configs.gemini_default_model?.value && ' (默认)'}
                      </Tag>
                    ))}
                  </div>

                  {showAddModel && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                          placeholder="请输入新模型名称"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                          onPressEnter={addModel}
                          style={{ flex: 1 }}
                        />
                        <Button type="primary" onClick={addModel}>添加</Button>
                        <Button onClick={() => { setShowAddModel(false); setNewModel('') }}>取消</Button>
                      </div>
                    </div>
                  )}
                </div>

                {configs.gemini_api_key?.updated_at && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      最后更新: {dayjs(configs.gemini_api_key.updated_at).format('YYYY-MM-DD HH:mm:ss')} 
                      {configs.gemini_api_key.updated_by_name && ` by ${configs.gemini_api_key.updated_by_name}`}
                    </Text>
                  </>
                )}
              </div>
            </Card>
          </Col>

          {/* Prompt配置卡片 - 紧凑版本 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space size={8}>
                  <EditOutlined />
                  <span>Prompt配置</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '400px' }}>
                {/* 视频解析Prompt */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>视频解析Prompt</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                      用于视频内容分析的默认提示词
                    </Text>
                  </div>
                  {renderPromptField(
                    'video_analysis_prompt',
                    configs.video_analysis_prompt?.value
                  )}
                  {configs.video_analysis_prompt?.updated_at && (
                    <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                      最后更新: {dayjs(configs.video_analysis_prompt.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                      {configs.video_analysis_prompt.updated_by_name && ` by ${configs.video_analysis_prompt.updated_by_name}`}
                    </Text>
                  )}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* 剧本整合Prompt */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>剧本整合Prompt</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                      用于剧本整合的默认提示词
                    </Text>
                  </div>
                  {renderPromptField(
                    'script_integration_prompt',
                    configs.script_integration_prompt?.value
                  )}
                  {configs.script_integration_prompt?.updated_at && (
                    <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                      最后更新: {dayjs(configs.script_integration_prompt.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                      {configs.script_integration_prompt.updated_by_name && ` by ${configs.script_integration_prompt.updated_by_name}`}
                    </Text>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>

      {/* Prompt编辑弹窗 */}
      <Modal
        title={promptModal.title}
        open={promptModal.visible}
        onOk={savePromptModal}
        onCancel={closePromptModal}
        width={800}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {promptModal.type === 'video_analysis_prompt' 
              ? '此Prompt将作为视频解析功能的默认提示词，用于指导AI如何分析视频内容。'
              : '此Prompt将作为剧本整合功能的默认提示词，用于指导AI如何整合分析结果成完整剧本。'
            }
          </Text>
        </div>
        <Input.TextArea
          value={promptModal.value}
          onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
          placeholder={promptModal.placeholder}
          rows={12}
          showCount
          maxLength={2000}
        />
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：您可以使用换行符来组织Prompt结构，建议包含明确的任务说明和输出格式要求。
          </Text>
        </div>
      </Modal>
    </Layout>
  )
}

export default SystemConfig