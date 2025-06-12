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
  
  // 代理服务配置状态
  const [proxyUrls, setProxyUrls] = useState({
    local: 'http://localhost:8080',
    netlify: '',
    vercel: '',
    cloudflare: '',
    custom: ''
  })
  const [proxyConfig, setProxyConfig] = useState({
    enabled: false,
    provider: 'local',
    customUrl: '',
    fallbackToLocal: true
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
    loadProxyConfig()
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

  const loadProxyConfig = async () => {
    try {
      // 加载代理服务配置
      const configResponse = await systemConfigAPI.getProxyConfig()
      setProxyConfig(configResponse.data || {
        enabled: false,
        provider: 'local',
        customUrl: '',
        fallbackToLocal: true
      })

      // 从数据库加载代理URLs配置
      try {
        const urlsConfig = await systemConfigAPI.getConfig('proxy_service_urls')
        if (urlsConfig && urlsConfig.data && urlsConfig.data.config_value) {
          const savedUrls = JSON.parse(urlsConfig.data.config_value)
          setProxyUrls(savedUrls)
        } else {
          // 使用默认配置
          setProxyUrls({
            local: 'http://localhost:8080',
            netlify: '',
            vercel: '',
            cloudflare: '',
            custom: ''
          })
        }
      } catch (e) {
        console.log('代理URLs配置未找到，使用默认值')
        setProxyUrls({
          local: 'http://localhost:8080',
          netlify: '',
          vercel: '',
          cloudflare: '',
          custom: ''
        })
      }
    } catch (error) {
      console.error('加载代理配置失败:', error)
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

  const updateProxyServiceConfig = async (newConfig) => {
    try {
      setProxyConfig(newConfig)
      await systemConfigAPI.updateProxyConfig(newConfig)
      message.success('代理服务配置已更新')
      
      // 同时更新代理URLs配置到数据库
      if (newConfig.provider !== 'local') {
        await systemConfigAPI.setConfig('proxy_service_urls', JSON.stringify(proxyUrls), 1)
      }
    } catch (error) {
      message.error('更新代理服务配置失败: ' + error.message)
    }
  }

  // 新增: 更新代理URLs配置
  const updateProxyUrls = async (provider, url) => {
    const newUrls = { ...proxyUrls, [provider]: url }
    setProxyUrls(newUrls)
    
    try {
      await systemConfigAPI.setConfig('proxy_service_urls', JSON.stringify(newUrls), 1)
      message.success('代理地址已更新')
    } catch (error) {
      message.error('更新代理地址失败: ' + error.message)
    }
  }

  const testProxyService = async () => {
    if (!proxyConfig.enabled) {
      message.warning('请先启用代理服务')
      return
    }

    setTesting({ ...testing, proxyService: true })
    
    try {
      // 根据当前配置获取代理URL
      let currentProxyUrl = proxyConfig.provider === 'local' ? proxyUrls.local :
                           proxyUrls[proxyConfig.provider]
      
      // 如果是本地代理，确保使用正确的端口
      if (proxyConfig.provider === 'local') {
        currentProxyUrl = 'http://localhost:8080'  // 强制使用8080端口
      }

      if (!currentProxyUrl) {
        message.error('代理地址不能为空，请先配置代理地址')
        setTesting({ ...testing, proxyService: false })
        return
      }

      const startTime = Date.now()
      
      // 测试代理服务连接
      const response = await fetch(currentProxyUrl + '/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${configs.gemini_api_key || 'test-key'}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10秒超时
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        // 200 成功
        setProxyServiceStatus({
          success: true,
          message: '代理服务连接正常',
          responseTime
        })
        message.success(`代理服务测试成功 (${responseTime}ms)`)
      } else if (response.status === 401) {
        // 401表示需要认证，但代理服务是可达的
        setProxyServiceStatus({
          success: true,
          message: '代理服务可达（需要有效API密钥）',
          responseTime
        })
        message.warning(`代理服务可达，但需要有效的API密钥 (${responseTime}ms)`)
      } else {
        // 尝试读取错误详情
        let errorDetail = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorDetail = errorData.message || errorData.error || errorDetail
        } catch (e) {
          // 忽略JSON解析错误
        }
        
        setProxyServiceStatus({
          success: false,
          message: `代理服务响应异常: ${errorDetail}`,
          responseTime
        })
        message.error(`代理服务测试失败: ${errorDetail}`)
      }
    } catch (error) {
      setProxyServiceStatus({
        success: false,
        message: error.message.includes('timeout') ? '连接超时' : '连接失败',
        responseTime: null
      })
      
      if (error.message.includes('timeout')) {
        message.error('代理服务连接超时，请检查网络或代理配置')
      } else {
        message.error('代理服务连接失败: ' + error.message)
      }
    } finally {
      setTesting({ ...testing, proxyService: false })
    }
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
        <Space.Compact style={{ width: '100%' }}>
          {type === 'input' && (
            <Input
              value={tempValue}
              onChange={(e) => setTempValues({ ...tempValues, [key]: e.target.value })}
              placeholder={label}
              {...options}
            />
          )}
          {type === 'select' && (
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
          )}
          <Button 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => saveEdit(key, tempValue)}
          />
          <Button 
            icon={<CloseOutlined />}
            onClick={() => cancelEdit(key)}
          />
        </Space.Compact>
      )
    }
    
    return (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text code={key.includes('key')}>
          {key.includes('key') && value ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : value || '未设置'}
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
          <h3 style={{ margin: 0, color: 'white' }}>系统配置</h3>
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
              <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                <SettingOutlined /> 系统配置
              </Title>
              <Text type="secondary">
                管理AI模型和代理配置，确保系统正常运行
              </Text>
            </div>
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => Promise.all([loadConfigs(), loadStatus(), loadProxyConfig()])}
            >
              刷新状态
            </Button>
          </div>
        </div>

        {/* 系统状态总览 - 移到最上方 */}
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <ApiOutlined />
                  <span>系统状态总览</span>
                  {status.overall && getStatusIcon(status.overall)}
                </Space>
              }
              size="small"
            >
              <Alert
                message={
                  status.overall 
                    ? "系统运行正常，所有组件连接正常" 
                    : "系统状态异常，请检查配置并测试连接"
                }
                type={status.overall ? "success" : "warning"}
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" title="Gemini API" style={{ textAlign: 'center' }}>
                    {status.gemini ? (
                      <div>
                        {getStatusText(status.gemini.success, status.gemini.message)}
                        {status.gemini.responseTime && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              响应时间: {status.gemini.responseTime}ms
                            </Text>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Text type="secondary">未知</Text>
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" title="代理服务" style={{ textAlign: 'center' }}>
                    {status.proxy ? (
                      <div>
                        {getStatusText(status.proxy.success, status.proxy.message)}
                        {status.proxy.responseTime && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              响应时间: {status.proxy.responseTime}ms
                            </Text>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Text type="secondary">未知</Text>
                    )}
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card size="small" title="整体状态" style={{ textAlign: 'center' }}>
                    {getStatusText(status.overall, status.overall ? '系统正常' : '需要检查')}
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* AI模型配置卡片 - 移除测试连接按钮 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <ApiOutlined />
                  <span>AI模型配置</span>
                  {status.gemini && getStatusIcon(status.gemini.success)}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* API密钥 */}
                <div>
                  <Text strong>Gemini API密钥</Text>
                  <div style={{ marginTop: 8 }}>
                    {renderEditableField(
                      'gemini_api_key',
                      '请输入您的Gemini API密钥',
                      configs.gemini_api_key?.value,
                      'input',
                      { type: 'password' }
                    )}
                  </div>
                  {status.gemini && (
                    <div style={{ marginTop: 8 }}>
                      {getStatusText(status.gemini.success, status.gemini.message)}
                    </div>
                  )}
                </div>

                <Divider />

                {/* 默认模型 */}
                <div>
                  <Text strong>默认模型</Text>
                  <div style={{ marginTop: 8 }}>
                    {renderEditableField(
                      'gemini_default_model',
                      '选择默认模型',
                      configs.gemini_default_model?.value,
                      'select',
                      { data: configs.gemini_available_models?.value || [] }
                    )}
                  </div>
                </div>

                <Divider />

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
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="请输入新模型名称"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                          onPressEnter={addModel}
                        />
                        <Button type="primary" onClick={addModel}>添加</Button>
                        <Button onClick={() => { setShowAddModel(false); setNewModel('') }}>取消</Button>
                      </Space.Compact>
                    </div>
                  )}
                </div>

                {configs.gemini_api_key?.updated_at && (
                  <>
                    <Divider />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      最后更新: {dayjs(configs.gemini_api_key.updated_at).format('YYYY-MM-DD HH:mm:ss')} 
                      {configs.gemini_api_key.updated_by_name && ` by ${configs.gemini_api_key.updated_by_name}`}
                    </Text>
                  </>
                )}
              </Space>
            </Card>
          </Col>

          {/* 代理服务配置卡片 - 添加测试连接按钮 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <GlobalOutlined />
                  <span>代理服务配置</span>
                  {proxyConfig.enabled && getStatusIcon(true)}
                </Space>
              }
              extra={
                proxyConfig.enabled && (
                  <Button 
                    type="link" 
                    icon={<PlayCircleOutlined />}
                    loading={testing.proxyService}
                    onClick={() => testProxyService()}
                    size="small"
                  >
                    测试连接
                  </Button>
                )
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 启用代理服务 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>启用代理服务</Text>
                  <Switch 
                    checked={proxyConfig.enabled}
                    onChange={(checked) => 
                      updateProxyServiceConfig({
                        ...proxyConfig,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {proxyConfig.enabled && (
                  <>
                    <Divider />

                    {/* 代理提供商 */}
                    <div>
                      <Text strong>代理提供商</Text>
                      <div style={{ marginTop: 8 }}>
                        <Select
                          value={proxyConfig.provider}
                          onChange={(value) => 
                            updateProxyServiceConfig({
                              ...proxyConfig,
                              provider: value
                            })
                          }
                          style={{ width: '100%' }}
                        >
                          <Option value="local">🏠 本地代理 (localhost:8080)</Option>
                          <Option value="netlify">🌐 Netlify 代理</Option>
                          <Option value="vercel">⚡ Vercel 代理</Option>
                          <Option value="cloudflare">☁️ Cloudflare 代理</Option>
                          <Option value="custom">🔧 自定义代理</Option>
                        </Select>
                      </div>
                    </div>

                    {/* 代理地址配置 */}
                    {proxyConfig.provider !== 'local' && (
                      <div>
                        <Text strong>
                          {proxyConfig.provider === 'netlify' ? 'Netlify 代理地址' :
                           proxyConfig.provider === 'vercel' ? 'Vercel 代理地址' :
                           proxyConfig.provider === 'cloudflare' ? 'Cloudflare 代理地址' :
                           '自定义代理地址'}
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          <Input
                            value={proxyUrls[proxyConfig.provider] || ''}
                            onChange={(e) => setProxyUrls({ ...proxyUrls, [proxyConfig.provider]: e.target.value })}
                            onBlur={(e) => updateProxyUrls(proxyConfig.provider, e.target.value)}
                            placeholder={
                              proxyConfig.provider === 'netlify' ? '请输入 Netlify 代理地址，如: https://your-app.netlify.app' :
                              proxyConfig.provider === 'vercel' ? '请输入 Vercel 代理地址，如: https://your-app.vercel.app' :
                              proxyConfig.provider === 'cloudflare' ? '请输入 Cloudflare Workers 代理地址' :
                              '请输入自定义代理地址'
                            }
                            addonBefore={
                              proxyConfig.provider === 'netlify' ? '🌐' : 
                              proxyConfig.provider === 'vercel' ? '⚡' :
                              proxyConfig.provider === 'cloudflare' ? '☁️' : '🔧'
                            }
                          />
                        </div>
                        {proxyConfig.provider === 'netlify' && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            💡 使用 Netlify 函数作为代理服务，需要在 Netlify 设置 GEMINI_API_KEY 环境变量
                          </Text>
                        )}
                        {proxyConfig.provider === 'vercel' && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            💡 使用 Vercel Serverless 函数作为代理服务，需要在 Vercel 设置 GEMINI_API_KEY 环境变量
                          </Text>
                        )}
                        {proxyConfig.provider === 'cloudflare' && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            💡 使用 Cloudflare Workers 作为代理服务，需要在 Workers 中配置 GEMINI_API_KEY
                          </Text>
                        )}
                      </div>
                    )}

                    {/* 失败回退 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>失败时回退到本地</Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            当远程代理失败时自动切换到本地代理
                          </Text>
                        </div>
                      </div>
                      <Switch 
                        checked={proxyConfig.fallbackToLocal}
                        onChange={(checked) => 
                          updateProxyServiceConfig({
                            ...proxyConfig,
                            fallbackToLocal: checked
                          })
                        }
                      />
                    </div>

                    {/* 当前代理状态 */}
                    <div style={{ 
                      background: '#f6f8fa', 
                      padding: '12px', 
                      borderRadius: '6px',
                      border: '1px solid #e1e8ed'
                    }}>
                      <Text strong style={{ color: '#1890ff' }}>当前代理状态</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          提供商: {proxyConfig.provider === 'local' ? '🏠 本地代理' :
                                  proxyConfig.provider === 'netlify' ? '🌐 Netlify' :
                                  proxyConfig.provider === 'vercel' ? '⚡ Vercel' :
                                  proxyConfig.provider === 'cloudflare' ? '☁️ Cloudflare' : '🔧 自定义'}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          地址: {proxyConfig.provider === 'local' ? proxyUrls.local :
                                proxyUrls[proxyConfig.provider] || '未设置'}
                        </Text>
                        {proxyServiceStatus && (
                          <>
                            <br />
                            <div style={{ marginTop: 8, padding: '8px', background: proxyServiceStatus.success ? '#f6ffed' : '#fff2f0', borderRadius: '4px' }}>
                              {getStatusText(proxyServiceStatus.success, proxyServiceStatus.message)}
                              {proxyServiceStatus.responseTime && (
                                <Text type="secondary" style={{ marginLeft: 16, fontSize: '12px' }}>
                                  响应时间: {proxyServiceStatus.responseTime}ms
                                </Text>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Space>
            </Card>
          </Col>

          {/* 传统代理配置卡片 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <GlobalOutlined />
                  <span>传统代理配置</span>
                  {status.proxy && getStatusIcon(status.proxy.success)}
                </Space>
              }
              extra={
                <Button 
                  type="link" 
                  icon={<PlayCircleOutlined />}
                  loading={testing.proxy}
                  onClick={() => testConnection('proxy')}
                  size="small"
                >
                  测试连接
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 代理开关 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>启用代理</Text>
                  <Switch 
                    checked={configs.proxy_enabled?.value || false}
                    onChange={(checked) => saveEdit('proxy_enabled', checked)}
                  />
                </div>

                {status.proxy && (
                  <div>
                    {getStatusText(status.proxy.success, status.proxy.message)}
                    {status.proxy.responseTime && (
                      <Text type="secondary" style={{ marginLeft: 16 }}>
                        响应时间: {status.proxy.responseTime}ms
                      </Text>
                    )}
                  </div>
                )}

                {configs.proxy_enabled?.value && (
                  <>
                    <Divider />

                    {/* HTTP代理 */}
                    <div>
                      <Text strong>HTTP代理</Text>
                      <div style={{ marginTop: 8 }}>
                        {renderEditableField(
                          'proxy_http',
                          '例如: http://proxy.example.com:8080',
                          configs.proxy_http?.value,
                          'input',
                          { placeholder: 'http://proxy.example.com:8080' }
                        )}
                      </div>
                    </div>

                    {/* HTTPS代理 */}
                    <div>
                      <Text strong>HTTPS代理</Text>
                      <div style={{ marginTop: 8 }}>
                        {renderEditableField(
                          'proxy_https',
                          '例如: http://proxy.example.com:8080',
                          configs.proxy_https?.value,
                          'input',
                          { placeholder: '留空使用HTTP代理地址' }
                        )}
                      </div>
                    </div>

                    {/* 排除地址 */}
                    <div>
                      <Text strong>排除地址</Text>
                      <div style={{ marginTop: 8 }}>
                        {renderEditableField(
                          'proxy_no_proxy',
                          '例如: localhost,127.0.0.1,.local',
                          configs.proxy_no_proxy?.value,
                          'input',
                          { placeholder: 'localhost,127.0.0.1,.local' }
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        不使用代理的地址列表，用逗号分隔
                      </Text>
                    </div>
                  </>
                )}

                {configs.proxy_enabled?.updated_at && (
                  <>
                    <Divider />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      最后更新: {dayjs(configs.proxy_enabled.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                      {configs.proxy_enabled.updated_by_name && ` by ${configs.proxy_enabled.updated_by_name}`}
                    </Text>
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default SystemConfig 