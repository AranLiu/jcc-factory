import React, { useState, useEffect, useMemo } from 'react'
import { 
  Layout, 
  Row, 
  Col, 
  Card, 
  Button, 
  Upload, 
  List, 
  Form,
  Input,
  Slider,
  Select,
  message,
  Space,
  Tag,
  Spin,
  Typography,
  Divider,
  Checkbox,
  Pagination,
  Modal,
  Popconfirm,
  Tooltip,
  Tabs,
  InputNumber
} from 'antd'
import { 
  ArrowLeftOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  RobotOutlined,
  DownloadOutlined,
  EditOutlined,
  DownOutlined,
  SaveOutlined,
  BookOutlined,
  ExpandOutlined,
  DeleteOutlined,
  SelectOutlined,
  PicCenterOutlined,
  FunctionOutlined,
  BorderOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { projectAPI, fileAPI, aiAPI, knowledgeBaseAPI, systemConfigAPI } from '../services/api'
import VideoPlayer from '../components/VideoPlayer'

import dayjs from 'dayjs'
import './ProjectDetail.css'

const { Header, Content } = Layout
const { Option } = Select
const { TextArea } = Input
const { Text, Title, Paragraph } = Typography
const { Dragger } = Upload;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 可编辑、可放大的文本域组件
const EditableTextArea = ({ value, onChange, onSave, onLoadDefault, placeholder, title = "编辑内容", rows = 5, disabled = false, autoSize = false }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(value);

  useEffect(() => {
    setModalContent(value);
  }, [value])

  const handleModalOk = () => {
    onChange(modalContent);
    if(onSave) onSave(modalContent);
    setIsModalVisible(false);
  }
  
  const handleModalCancel = () => {
    setModalContent(value);
    setIsModalVisible(false);
  }

  const handleLoadDefault = async () => {
    if (onLoadDefault) {
      try {
        await onLoadDefault();
        message.success('已加载系统默认Prompt');
      } catch (error) {
        message.error('加载默认Prompt失败');
      }
    }
  }

  return (
    <div style={{ position: 'relative', flex: autoSize ? 1 : 'none', display: autoSize ? 'flex' : 'block', flexDirection: 'column' }}>
      <TextArea
        value={value}
        readOnly={true} // 始终只读，不允许直接编辑
        rows={autoSize ? undefined : rows}
        autoSize={autoSize ? { minRows: 6 } : false}
        placeholder={disabled ? "只读权限，无法编辑" : placeholder}
        style={{ backgroundColor: '#f5f5f5', flex: autoSize ? 1 : 'none' }}
        disabled={disabled}
      />
      {!disabled && (
        <div style={{ position: 'absolute', top: 5, right: 5, zIndex: 10, display: 'flex', gap: '4px' }}>
          {onLoadDefault && (
            <Tooltip title="加载系统默认">
              <Button icon={<PicCenterOutlined />} onClick={handleLoadDefault} />
            </Tooltip>
          )}
          <Tooltip title="放大编辑">
            <Button 
              icon={<ExpandOutlined />} 
              onClick={() => setIsModalVisible(true)}
            />
          </Tooltip>
        </div>
      )}
      <Modal
        title={title}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width="60vw"
        destroyOnClose
        footer={disabled ? [
          <Button key="close" onClick={handleModalCancel}>关闭</Button>
        ] : undefined}
      >
        <TextArea
          value={modalContent}
          onChange={disabled ? undefined : (e) => setModalContent(e.target.value)}
          autoSize={{ minRows: 15, maxRows: 25 }}
          readOnly={disabled}
          disabled={disabled}
        />
      </Modal>
    </div>
  )
}

const VideoCard = ({ file, onRename, onAnalyze, onPlay, onDelete, onEdit, onDownload, selected, onSelect, isProcessing, canEdit = true }) => {
  const getStatusTag = (status) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">已解析</Tag>;
      case 'processing':
        return <Tag color="processing">解析中...</Tag>;
      case 'failed':
        return <Tag color="error">失败</Tag>;
      default:
        return <Tag color="default">待处理</Tag>;
    }
  };

  const handleRename = (newName) => {
    if (newName && newName !== file.original_name) {
      onRename(file.id, newName);
    }
  }
  
  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const fileSize = file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A';
  const duration = formatDuration(file.duration);

  return (
    <div className="video-card-wrapper-list">
      <Card bordered={false} bodyStyle={{ padding: 0, position: 'relative' }}>
        <Checkbox checked={selected} onChange={(e) => onSelect(file.id, e.target.checked)} style={{position: 'absolute', top: '8px', left: '8px', zIndex: 10}}/>
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
          {getStatusTag(file.task_status)}
        </div>
        
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Left Side: Thumbnail */}
            <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
              <div className="video-thumbnail-list" onClick={() => onPlay(file)}>
                {file.thumbnail_path ? (
                  <img 
                    alt={`${file.original_name} 缩略图`} 
                    src={file.thumbnail_path} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      console.error('缩略图加载失败:', file.thumbnail_path);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={() => {
                      console.log('缩略图加载成功:', file.thumbnail_path);
                    }}
                  />
                ) : null}
                <div 
                  className="thumbnail-placeholder-list" 
                  style={{ display: file.thumbnail_path ? 'none' : 'flex' }}
                >
                  <FileTextOutlined />
                </div>
                <div className="thumbnail-overlay-list">
                  <PlayCircleOutlined />
                </div>
              </div>
              <div className="video-meta-list">
                <span><PlayCircleOutlined /> {duration}</span>
                <span><FileTextOutlined /> {fileSize}</span>
              </div>
            </div>

            {/* Right Side: Details */}
            <div style={{
              flex: '1 1 auto',
              minWidth: 0, // Crucial for flex shrinking
              height: '200px',
              display: 'flex',
              flexDirection: 'column'
            }}>
               <Typography.Title 
                  level={5} 
                  ellipsis={{ rows: 1, tooltip: file.original_name }}
                  editable={canEdit ? { onChange: (newName) => onRename(file.id, newName) } : false}
                  style={{ flexShrink: 0, margin: '0 0 8px 0' }}
                >
                  {file.original_name}
                </Typography.Title>
              <div className="analysis-result-wrapper" style={{ 
                position: 'relative',
                flex: 1, // Grow to fill available space
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #f0f0f0',
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: '#fafafa'
              }}>
                  {isProcessing ? (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: '100%',
                      width: '100%',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      backgroundColor: 'rgba(250, 250, 250, 0.8)',
                      borderRadius: '6px'
                    }}>
                      <Spin size="large" />
                      <Text type="secondary">正在解析中...</Text>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      position: 'relative'
                    }}>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        <Paragraph
                          className="analysis-result-list"
                          style={{ 
                            margin: 0,
                            whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
                            overflowWrap: 'break-word' // Break long words to prevent overflow
                          }}
                        >
                          {file.task_result || '待解析处理...'}
                        </Paragraph>
                      </div>
                      {canEdit && (
                        <Tooltip title="编辑解析结果">
                          <Button 
                            className="edit-result-btn" 
                            icon={<EditOutlined />} 
                            onClick={() => onEdit(file)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              zIndex: 10
                            }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  )}
              </div>

              <div className="video-actions-list" style={{
                height: '40px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}>
                <Tooltip title={canEdit ? "解析" : "只读权限，无法解析"}>
                  <Button 
                    icon={<FunctionOutlined />} 
                    onClick={() => onAnalyze([file.id])} 
                    disabled={!canEdit}
                  />
                </Tooltip>
                <Tooltip title="下载">
                  <Button icon={<DownloadOutlined />} onClick={() => onDownload([file.id])} />
                </Tooltip>
                {canEdit && (
                  <Popconfirm
                      title="确定要删除这个文件吗？"
                      onConfirm={() => onDelete([file.id])}
                      okText="确定"
                      cancelText="取消"
                    >
                    <Tooltip title="删除">
                      <Button danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [integrating, setIntegrating] = useState(false);
  
  // 权限检查 - 根据project状态动态计算
  const userPermission = user?.permission || 'personal';
  

  
  const canEdit = useMemo(() => {
    if (user?.role === 'admin') {
      return true; // 管理员总是可编辑
    }
    if (userPermission === 'global') {
      return true; // 全局权限用户总是可以编辑所有项目
    }
    if (!project) {
      // 项目加载中时，给予乐观预估
      // personal和readonly_global用户都能编辑自己的项目
      return userPermission === 'personal' || userPermission === 'readonly_global';
    }
    // 项目加载完成后，验证具体权限
    const isOwner = Number(project.user_id) === Number(user?.id);
    if (userPermission === 'personal') {
      return isOwner; // personal权限：只能编辑自己的项目
    }
    if (userPermission === 'readonly_global') {
      return isOwner; // readonly_global权限：可以编辑自己的项目，其他项目只读
    }
    return false;
  }, [userPermission, project, user?.id, user?.role]);
  
  // 判断是否对当前项目只读（非所有者的readonly_global用户）
  const isReadOnly = useMemo(() => {
    if (userPermission !== 'readonly_global' || !project) {
      return false;
    }
    return Number(project.user_id) !== Number(user?.id);
  }, [userPermission, project, user?.id]);
  
  // 使用函数为状态提供初始值，从localStorage加载
  const [integrationResult, setIntegrationResult] = useState(() => {
    return localStorage.getItem(`integrationResult_${id}`) || '';
  });
  const [draftContent, setDraftContent] = useState(() => {
    return localStorage.getItem(`draftContent_${id}`) || '';
  });

  const [archiveTitle, setArchiveTitle] = useState('');
  const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [modalSelectedFileIds, setModalSelectedFileIds] = useState(new Set());
  const [playingFile, setPlayingFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  
  // 新增状态管理
  const [processingFileIds, setProcessingFileIds] = useState(new Set())
  const [modelConfig, setModelConfig] = useState({ 
    defaultModel: 'gemini-1.5-flash', 
    availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'] 
  });
  const [usingSystemDefaults, setUsingSystemDefaults] = useState({
    analysis: false,
    integration: false
  });
  
  const [form] = Form.useForm()

  useEffect(() => {
    if (id) {
      loadProjectDetail()
      loadModelConfig()
    }
  }, [id])

  // 加载模型配置
  const loadModelConfig = async () => {
    try {
      const config = await aiAPI.getModels();
      setModelConfig(config);
    } catch (error) {
      console.warn('加载模型配置失败，使用默认配置:', error);
    }
  };

  // 当draftContent变化时，保存到localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem(`draftContent_${id}`, draftContent);
    }
  }, [draftContent, id]);

  // 当integrationResult变化时，保存到localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem(`integrationResult_${id}`, integrationResult);
    }
  }, [integrationResult, id]);

  // 在项目数据加载完成后加载Prompt
  useEffect(() => {
    if (project) {
      loadSavedPrompts()
    }
  }, [project])

  // 移除自动刷新，改为任务完成时的状态更新

  // 从数据库加载Prompt
  const loadSavedPrompts = async () => {
    try {
      // 先获取系统默认Prompt
      let defaultPrompts = {}
      try {
        const response = await systemConfigAPI.getPublicPrompts()
        if (response.success && response.data) {
          defaultPrompts = {
            analysis_prompt: response.data.video_analysis_prompt?.value || '',
            integrationPrompt: response.data.script_integration_prompt?.value || ''
          }
        }
      } catch (error) {
        console.warn('加载系统默认Prompt失败:', error)
      }

      // 从项目数据中加载已保存的Prompt（优先使用项目自定义的）
      const formData = { ...defaultPrompts }
      const usingDefaults = { analysis: false, integration: false }
      
      if (project) {
        if (project.analysis_prompt) {
          formData.analysis_prompt = project.analysis_prompt
        } else if (defaultPrompts.analysis_prompt) {
          usingDefaults.analysis = true
        }
        
        if (project.integration_prompt) {
          formData.integrationPrompt = project.integration_prompt
        } else if (defaultPrompts.integrationPrompt) {
          usingDefaults.integration = true
        }
      } else {
        // 如果没有项目数据，且有默认值，则标记为使用系统默认
        if (defaultPrompts.analysis_prompt) usingDefaults.analysis = true
        if (defaultPrompts.integrationPrompt) usingDefaults.integration = true
      }
      
      setUsingSystemDefaults(usingDefaults)
      
      // 设置表单值
      if (Object.keys(formData).length > 0) {
        form.setFieldsValue(formData)
      }
    } catch (error) {
      console.warn('加载保存的Prompt失败:', error)
    }
  }

  const loadProjectDetail = async () => {
    setLoading(true); 
    try {
      const response = await projectAPI.getDetail(id)
      setProject(response.project)
      setFiles(response.files || [])
      setTasks(response.tasks || [])
    } catch (error) {
      message.error('加载项目详情失败')
      navigate('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const response = await fileAPI.upload(id, file, project.type);
      message.success(response.message);
      // Add the new file to the state directly with the full URL from the response
      setFiles(prevFiles => [response.file, ...prevFiles]);
    } catch (error) {
      message.error(error.response?.data?.message || '文件上传失败');
    } finally {
      setUploading(false);
    }
    return false; // 阻止默认上传行为
  };

  const handleAIAnalysis = async (values) => {
    setAnalyzing(true)
    try {
      const response = await aiAPI.analyze({
        projectId: id,
        fileId: values.fileId,
        prompt: values.prompt,
        modelConfig: {
          temperature: values.temperature || 1,
          model: values.model || 'gemini-pro'
        }
      })
      message.success('AI分析任务已创建')
      form.resetFields()
      // 定期检查任务状态
      checkTaskStatus(response.taskId)
    } catch (error) {
      console.error(error);
      
      // 检查是否是API配置或连接问题
      const errorMessage = error.response?.data?.message || error.message || '未知错误';
      if (errorMessage.includes('API') || errorMessage.includes('密钥') || 
          errorMessage.includes('代理') || errorMessage.includes('连接') ||
          errorMessage.includes('proxy') || errorMessage.includes('timeout')) {
        message.warning('模型调用失败，请联系管理员检查系统配置', 6);
      } else {
        message.error('创建AI分析任务失败');
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const checkTaskStatus = async (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await aiAPI.getTaskStatus(taskId)
        if (response.task.status === 'completed' || response.task.status === 'failed') {
          clearInterval(interval)
          loadProjectDetail()
          if (response.task.status === 'completed') {
            message.success('AI分析完成')
          } else {
            message.error('AI分析失败')
          }
        }
      } catch (error) {
        clearInterval(interval)
        // 新增：403权限错误友好提示
        if (error.response?.status === 403) {
          message.error('无权访问该AI任务，请确认登录账号与项目归属一致')
          // 可选：自动刷新用户信息或跳转登录
          // window.location.reload()
        }
      }
    }, 3000)
  }

  // Memoize the combined file and task data
  const processedFiles = useMemo(() => {
    return files.map(file => {
      const relatedTasks = tasks.filter(t => t.file_id === file.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestTask = relatedTasks[0];
      return {
        ...file,
        task_status: latestTask?.status || 'pending',
        task_result: latestTask?.result,
        task_prompt: latestTask?.prompt,
        task_error: latestTask?.error_message,
      };
    }).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  }, [files, tasks]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedFiles.slice(startIndex, startIndex + pageSize);
  }, [processedFiles, currentPage, pageSize]);

  const handleSavePrompts = async (values) => {
    try {
      await projectAPI.update(id, { ...values })
      message.success('配置保存成功')
      loadProjectDetail()
    } catch (error) {
      message.error('配置保存失败')
    }
  }

  // 从文件名中提取集数
  const extractEpisodeNumber = (filename) => {
    // 移除文件扩展名
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // 尝试匹配各种格式的数字
    const patterns = [
      /第(\d+)集/,           // 第X集
      /第(\d+)话/,           // 第X话
      /(\d+)集/,             // X集
      /(\d+)话/,             // X话
      /ep(\d+)/i,            // epX
      /episode(\d+)/i,       // episodeX
      /(\d+)/,               // 纯数字（作为后备选项）
    ];
    
    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    
    return null;
  };

  const handleConfirmSelectionAndAddToDraft = () => {
    const selectedFiles = processedFiles.filter(f => modalSelectedFileIds.has(f.id));
    const contentToDraft = selectedFiles
      .map(f => {
        const episodeNum = extractEpisodeNumber(f.original_name);
        const episodeTitle = episodeNum ? `第${episodeNum}集` : f.original_name;
        return `${episodeTitle}\n\n${f.task_result || '无内容'}`;
      })
      .join('\n\n---\n\n');
    
    setDraftContent(prev => prev ? `${prev}\n\n---\n\n${contentToDraft}` : contentToDraft);
    setIsSelectionModalVisible(false);
    setModalSelectedFileIds(new Set());
    message.success(`${selectedFiles.length}个文件内容已添加到草稿区`);
  };

  const handleIntegrate = async (values) => {
    if (!draftContent.trim()) {
      message.warning('整合草稿区内容不能为空');
      return;
    }
    
    setIntegrating(true)
    try {
      console.log('Integration values:', values); // 调试日志
      const response = await aiAPI.integrate({ 
        projectId: id,
        integrationPrompt: values.integrationPrompt,
        draftContent: draftContent,
        modelConfig: {
          model: values.integration_model || modelConfig.defaultModel,
          temperature: values.integration_temperature || 1
        }
      })
      setIntegrationResult(response.integratedScript)
      message.success('整合成功')
    } catch (error) {
      console.error(error)
      
      // 检查是否是API配置或连接问题
      const errorMessage = error.response?.data?.message || error.message || '未知错误';
      if (errorMessage.includes('API') || errorMessage.includes('密钥') || 
          errorMessage.includes('代理') || errorMessage.includes('连接') ||
          errorMessage.includes('proxy') || errorMessage.includes('timeout')) {
        message.warning('模型调用失败，请联系管理员检查系统配置', 6);
      } else {
        message.error(`整合失败: ${errorMessage}`);
      }
      
      setIntegrationResult(`整合失败: ${errorMessage}`);
    } finally {
      setIntegrating(false)
    }
  }

  const handleArchive = async () => {
    if (!integrationResult) {
      message.warn('没有可存档的内容');
      return;
    }
    setArchiveTitle(project?.name || '未命名存档');
    setIsArchiveModalVisible(true);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTitle) {
      message.warn('请输入存档标题');
      return;
    }
    try {
      await knowledgeBaseAPI.archive({
        title: archiveTitle,
        content: integrationResult,
        projectId: id
      });
      message.success('已成功存档到知识库');
      setIsArchiveModalVisible(false);
      setArchiveTitle('');
    } catch (error) {
      message.error('存档失败');
    }
  };

  const handleRenameFile = async (fileId, newName) => {
    try {
      await fileAPI.renameFile(fileId, newName);
      message.success("文件名修改成功");
      setFiles(files.map(f => f.id === fileId ? {...f, original_name: newName} : f));
    } catch (error) {
       message.error(error.response?.data?.message || "文件名修改失败");
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      await fileAPI.delete(fileId);
      message.success("文件删除成功");
      setFiles(files.filter(f => f.id !== fileId));
    } catch(error) {
      message.error(error.response?.data?.message || "文件删除失败");
    }
  }

  const handleAnalyseOne = async (fileId) => {
    message.info(`开始解析文件 (ID: ${fileId})...`);
    // Here you would call the AI analysis API for a single file
    // For now, it's a placeholder
  }

  const handleEditAnalysisResult = (fileId, newResult, isTemporary = false) => {
    const newFiles = files.map(f => {
      if (f.id === fileId) {
        return { ...f, task_result: newResult };
      }
      return f;
    });
    setFiles(newFiles);

    if(!isTemporary) {
      // Here you would call an API to save the result permanently
      // e.g., fileAPI.updateResult(fileId, newResult)
      message.success("解析结果已更新（前端）");
    }
  }

  const handleFileSelect = (fileId, checked) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if(checked) newSet.add(fileId);
      else newSet.delete(fileId);
      return newSet;
    })
  }

  const handleSelectAll = () => {
    const allFileIds = processedFiles.map(f => f.id);
    const newSelectedFileIds = new Set(selectedFileIds);
    if (allFilesSelected) {
      // 取消全选
      allFileIds.forEach(id => newSelectedFileIds.delete(id));
    } else {
      // 全选所有视频
      allFileIds.forEach(id => newSelectedFileIds.add(id));
    }
    setSelectedFileIds(newSelectedFileIds);
  }

  const handleAnalyseFiles = async (fileIds) => {
    if (analyzing) return;
    setAnalyzing(true);
    message.info(`开始为 ${fileIds.length} 个文件创建解析任务...`);
    
    const { analysis_prompt, temperature, model, top_k, top_p, max_output_tokens } = form.getFieldsValue();
    
    if (!analysis_prompt) {
      message.error('请输入内容解析的Prompt');
      setAnalyzing(false);
      return;
    }

    // 保存最新的Prompt到数据库
    await savePromptToDatabase('analysis', analysis_prompt);

    try {
      const taskPromises = [];
      
      // 标记文件为处理中状态
      setProcessingFileIds(prev => new Set([...prev, ...fileIds]));
      
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        const data = {
          projectId: id,
          fileId: fileId,
          prompt: analysis_prompt,
          modelConfig: {
            model: model || 'gemini-1.5-flash',
            temperature: temperature || 1,
            topK: top_k,
            topP: top_p,
            maxOutputTokens: max_output_tokens
          }
        };
        
        // 创建任务并立即开始轮询
        const taskPromise = (async () => {
          try {
            const response = await aiAPI.analyze(data);
            if (response.taskId) {
              message.success(`${file?.original_name} 开始解析`);
              
              // 轮询任务状态
              const pollTaskStatus = async () => {
                let completed = false;
                while (!completed) {
                  await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
                  
                  try {
                    const statusResponse = await aiAPI.getTaskStatus(response.taskId);
                    const task = statusResponse.task;
                    
                    if (task.status === 'completed') {
                      // 任务完成，更新文件状态和结果
                      setFiles(prevFiles => 
                        prevFiles.map(f => 
                          f.id === fileId 
                            ? { ...f, task_result: task.result }
                            : f
                        )
                      );
                      setTasks(prevTasks => [...prevTasks, task]);
                      setProcessingFileIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(fileId);
                        return newSet;
                      });
                      message.success(`${file?.original_name} 解析完成`);
                      completed = true;
                    } else if (task.status === 'failed') {
                      // 任务失败
                      setProcessingFileIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(fileId);
                        return newSet;
                      });
                      // 检查是否是API配置或连接问题
                      const errorMessage = task.error_message || '未知错误';
                      if (errorMessage.includes('API') || errorMessage.includes('密钥') || 
                          errorMessage.includes('代理') || errorMessage.includes('连接') ||
                          errorMessage.includes('proxy') || errorMessage.includes('timeout')) {
                        message.warning(`${file?.original_name} 模型调用失败，请联系管理员检查系统配置`, 6);
                      } else {
                        message.error(`${file?.original_name} 解析失败: ${errorMessage}`);
                      }
                      completed = true;
                    }
                    // 如果还是 processing 或 pending，继续轮询
                  } catch (error) {
                    console.error('轮询任务状态失败:', error);
                    // 继续轮询，不中断
                  }
                }
              };
              
              pollTaskStatus();
            } else {
              message.warning(`${file?.original_name} 解析任务创建失败`);
              setProcessingFileIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
              });
            }
          } catch (error) {
            // 检查是否是API配置或连接问题
            const errorMessage = error.response?.data?.message || error.message || '未知错误';
            if (errorMessage.includes('API') || errorMessage.includes('密钥') || 
                errorMessage.includes('代理') || errorMessage.includes('连接') ||
                errorMessage.includes('proxy') || errorMessage.includes('timeout')) {
              message.warning(`${file?.original_name} 模型调用失败，请联系管理员检查系统配置`, 6);
            } else {
              message.error(`${file?.original_name} 解析失败: ${errorMessage}`);
            }
            setProcessingFileIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(fileId);
              return newSet;
            });
          }
        })();
        
        taskPromises.push(taskPromise);
      }
      
      // 等待所有任务创建完成
      await Promise.all(taskPromises);
      
    } catch (error) {
      console.error('AI分析任务创建失败:', error);
      
      // 检查是否是API配置或连接问题
      const errorMessage = error.response?.data?.message || error.message || '未知错误';
      if (errorMessage.includes('API') || errorMessage.includes('密钥') || 
          errorMessage.includes('代理') || errorMessage.includes('连接') ||
          errorMessage.includes('proxy') || errorMessage.includes('timeout')) {
        message.warning('模型调用失败，请联系管理员检查系统配置', 6);
      } else {
        message.error(errorMessage || 'AI分析任务创建失败');
      }
      
      // 清除处理状态
      setProcessingFileIds(prev => {
        const newSet = new Set(prev);
        fileIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEditResultModal = (file) => {
    setEditingFile(file);
    setEditContent(file.task_result || '');
  }
  
  const handleSaveAnalysisResult = async () => {
    if (!editingFile) return;
    
    try {
      // 先更新后端
      await fileAPI.updateAnalysisResult(editingFile.id, editContent);
      
      // 更新前端状态 - 找到该文件最新的任务并更新结果
      setTasks(prevTasks => {
        // 找到该文件的最新任务
        const taskIndex = prevTasks.findIndex(t => t.file_id === editingFile.id);
        if (taskIndex >= 0) {
          // 更新现有任务的结果
          const newTasks = [...prevTasks];
          newTasks[taskIndex] = { ...newTasks[taskIndex], result: editContent };
          return newTasks;
        } else {
          // 如果没有找到任务，创建一个新的任务记录（前端展示用）
          return [...prevTasks, {
            id: Date.now(), // 临时ID
            file_id: editingFile.id,
            result: editContent,
            status: 'completed',
            created_at: new Date().toISOString()
          }];
        }
      });
      
      setEditingFile(null);
      message.success("解析结果已保存！");
    } catch (error) {
      console.error('保存解析结果失败:', error);
      message.error(error.response?.data?.message || '保存失败，请重试');
    }
  }

  const handleDeleteFiles = async (fileIds) => {
     if (fileIds.length === 0) return;
    try {
      // In a real scenario, you'd likely have a bulk delete endpoint
      for (const fileId of fileIds) {
        await fileAPI.delete(fileId);
      }
      message.success(`成功删除了 ${fileIds.length} 个文件`);
      setFiles(files.filter(f => !fileIds.includes(f.id)));
      setSelectedFileIds(new Set());
    } catch(error) {
      message.error(error.response?.data?.message || "文件删除失败");
    }
  }

  const handleDownloadFiles = (fileIds) => {
    if (fileIds.length === 0) return;
    
    fileIds.forEach(fileId => {
      const file = files.find(f => f.id === fileId);
      if (file) {
        const downloadUrl = fileAPI.getDownloadUrl(fileId);
        // 创建一个隐藏的下载链接
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.original_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    
    message.success(`开始下载 ${fileIds.length} 个文件`);
    
    // 如果是批量下载，清除选择
    if (fileIds.length > 1) {
      setSelectedFileIds(new Set());
    }
  }

  const allFilesSelected = useMemo(() => 
    processedFiles.length > 0 && processedFiles.every(f => selectedFileIds.has(f.id)),
    [processedFiles, selectedFileIds]
  );

  const handleSaveAnalysisPrompt = async (prompt) => {
    try {
        await projectAPI.update(id, { analysis_prompt: prompt });
        // 更新本地项目数据
        setProject(prev => ({ ...prev, analysis_prompt: prompt }))
        message.success('内容解析Prompt已保存');
        form.setFieldsValue({ analysis_prompt: prompt });
    } catch (error) {
        message.error('保存失败');
    }
  }

  const handleSaveIntegrationPrompt = async (prompt) => {
    try {
        await projectAPI.update(id, { integration_prompt: prompt });
        // 更新本地项目数据
        setProject(prev => ({ ...prev, integration_prompt: prompt }))
        message.success('剧本整合Prompt已保存');
        form.setFieldsValue({ integrationPrompt: prompt });
    } catch (error) {
        message.error('保存失败');
    }
  }

  // 保存Prompt到数据库
  const savePromptToDatabase = async (type, prompt) => {
    try {
      const updateData = {}
      updateData[`${type}_prompt`] = prompt
      
      await projectAPI.update(id, updateData)
      
      // 更新本地项目数据
      setProject(prev => ({ ...prev, [`${type}_prompt`]: prompt }))
      
    } catch (error) {
      console.warn('保存Prompt到数据库失败:', error)
      throw error
    }
  }

  const handleSelectAllInModal = () => {
    const completedFiles = processedFiles.filter(f => f.task_status === 'completed');
    const allCompletedFileIds = completedFiles.map(f => f.id);
    
    // Check if all completed files are currently selected in the modal
    const allCurrentlySelected = allCompletedFileIds.length > 0 && allCompletedFileIds.every(id => modalSelectedFileIds.has(id));

    if (allCurrentlySelected) {
      setModalSelectedFileIds(new Set()); // Deselect all
    } else {
      setModalSelectedFileIds(new Set(allCompletedFileIds)); // Select all
    }
  };

  // 加载系统默认的视频解析Prompt
  const handleLoadDefaultAnalysisPrompt = async () => {
    try {
      const response = await systemConfigAPI.getPublicPrompts();
      if (response.success && response.data && response.data.video_analysis_prompt?.value) {
        const defaultPrompt = response.data.video_analysis_prompt.value;
        form.setFieldsValue({ analysis_prompt: defaultPrompt });
        setUsingSystemDefaults(prev => ({ ...prev, analysis: true }));
      } else {
        message.warning('系统未配置默认的视频解析Prompt');
      }
    } catch (error) {
      console.error('加载默认视频解析Prompt失败:', error);
      throw error;
    }
  };

  // 加载系统默认的剧本整合Prompt
  const handleLoadDefaultIntegrationPrompt = async () => {
    try {
      const response = await systemConfigAPI.getPublicPrompts();
      if (response.success && response.data && response.data.script_integration_prompt?.value) {
        const defaultPrompt = response.data.script_integration_prompt.value;
        form.setFieldsValue({ integrationPrompt: defaultPrompt });
        setUsingSystemDefaults(prev => ({ ...prev, integration: true }));
      } else {
        message.warning('系统未配置默认的剧本整合Prompt');
      }
    } catch (error) {
      console.error('加载默认剧本整合Prompt失败:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout className="workspace-layout">
      <Header className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/workspace')}
          >
            返回项目选择
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {project?.name}
          </Title>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>👋 {user?.username}</span>
          <Button type="link" onClick={logout}>退出</Button>
        </div>
      </Header>

      <Content style={{ padding: '16px' }}>
        <Tabs type="card" defaultActiveKey="1" style={{ height: '100%' }}>
          <Tabs.TabPane tab="视频解析" key="1">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                  <Row gutter={24}>
                    {/* Left: Analysis Controls */}
                    <Col xs={24} lg={8}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '82vh' }}>
                        <Form form={form} layout="vertical" onFinish={handleSavePrompts} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <Card title={<Title level={5} style={{margin:0}}>1. 批量上传视频</Title>} style={{ marginBottom: 16, flexShrink: 0 }}>
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Button 
                              type="dashed" 
                              icon={<UploadOutlined />} 
                              style={{ width: '100%', height: '80px' }}
                              disabled={!canEdit}
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = '.mp4,.mov,.avi,.mkv,.wmv';
                                input.onchange = (e) => {
                                  Array.from(e.target.files).forEach(file => {
                                    if (canEdit) handleFileUpload(file);
                                  });
                                };
                                input.click();
                              }}
                            >
                              <div style={{ textAlign: 'center' }}>
                                <div>{canEdit ? "点击上传视频文件" : "只读权限，无法上传"}</div>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                  {canEdit ? "支持 MP4, MOV, AVI 等格式" : ""}
                                </div>
                              </div>
                            </Button>
                            </Space>
                          </Card>
                          <Card 
                            title={<Title level={5} style={{margin:0}}>2. 模型配置</Title>} 
                            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                          >
                            <Form.Item name="model" label="模型">
                            <Select 
                              defaultValue={modelConfig.defaultModel} 
                              style={{ width: '100%' }} 
                              disabled={!canEdit}
                            >
                              {modelConfig.availableModels.map(model => (
                                <Select.Option key={model} value={model}>
                                  {model === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash' :
                                   model === 'gemini-1.5-pro' ? 'Gemini 1.5 Pro' :
                                   model === 'gemini-pro' ? 'Gemini Pro' : model}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            label="Temperature"
                            style={{ marginBottom: 0 }}
                            shouldUpdate={(prev, curr) => prev.temperature !== curr.temperature}
                          >
                            {({ getFieldValue, setFieldsValue }) => (
                              <Row align="middle" gutter={8}>
                                <Col flex="auto">
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={getFieldValue('temperature') ?? 1}
                                    onChange={val => setFieldsValue({ temperature: val })}
                                    disabled={!canEdit}
                                  />
                                </Col>
                                <Col>
                                  <InputNumber
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={getFieldValue('temperature') ?? 1}
                                    onChange={val => setFieldsValue({ temperature: val })}
                                    disabled={!canEdit}
                                    style={{ width: 60, marginLeft: 8 }}
                                  />
                                </Col>
                              </Row>
                            )}
                          </Form.Item>
                          <Form.Item name="analysis_prompt" label="Prompt" style={{ marginBottom: 8, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <EditableTextArea
                                value={form.getFieldValue('analysis_prompt')}
                                onChange={value => form.setFieldsValue({ analysis_prompt: value })}
                                onSave={canEdit ? handleSaveAnalysisPrompt : undefined}
                                onLoadDefault={canEdit ? handleLoadDefaultAnalysisPrompt : undefined}
                                placeholder={usingSystemDefaults.analysis ? 
                                  "当前使用系统默认Prompt（点击放大编辑按钮进行编辑）" : 
                                  "例如：请将视频内容解析为剧本格式..."}
                                title="编辑内容解析Prompt"
                                rows={15}
                                disabled={!canEdit}
                                autoSize={true}
                              />
                            </div>
                          </Form.Item>
                        </Card>
                      </Form>
                      </div>
                    </Col>

                    {/* Right: Video List */}
                    <Col xs={24} lg={16}>
                      <div className="video-processing-container">
                         <div className="video-list-header">
                            <Space>
                              <Tooltip title={allFilesSelected ? `取消全选（已选择${selectedFileIds.size}个视频）` : `选择全部视频（共${processedFiles.length}个）`}>
                                <Button 
                                    icon={<BorderOutlined />} 
                                    onClick={handleSelectAll}
                                    type={allFilesSelected ? 'primary' : 'default'}
                                >
                                  {allFilesSelected ? `全选(${selectedFileIds.size})` : '全选'}
                                </Button>
                              </Tooltip>
                              <Tooltip title={canEdit ? "批量解析" : "只读权限，无法解析"}>
                                <Button 
                                  icon={<FunctionOutlined />} 
                                  disabled={selectedFileIds.size === 0 || !canEdit} 
                                  onClick={() => handleAnalyseFiles(Array.from(selectedFileIds))} 
                                />
                              </Tooltip>
                              <Tooltip title="批量下载">
                                <Button icon={<DownloadOutlined />} disabled={selectedFileIds.size === 0} onClick={() => handleDownloadFiles(Array.from(selectedFileIds))} />
                              </Tooltip>
                              <Popconfirm
                                title={`确定要删除选中的 ${selectedFileIds.size} 个文件吗？`}
                                disabled={selectedFileIds.size === 0 || !canEdit}
                                onConfirm={() => handleDeleteFiles(Array.from(selectedFileIds))}
                              >
                                <Tooltip title={canEdit ? "批量删除" : "只读权限，无法删除"}>
                                    <Button danger icon={<DeleteOutlined />} disabled={selectedFileIds.size === 0 || !canEdit} />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          </div>
                          <div className="video-list-content">
                            {loading ? (
                               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                  <Spin size="large" />
                               </div>
                            ) : paginatedFiles.length > 0 ? (
                               <List
                                itemLayout="vertical"
                                dataSource={paginatedFiles}
                                renderItem={file => (
                                  <List.Item key={file.id} style={{padding: '0', margin: '0 0 16px 0', border: 'none'}}>
                                    <VideoCard {...{ 
                                      file, 
                                      onRename: handleRenameFile, 
                                      onAnalyze: handleAnalyseFiles, 
                                      onPlay: setPlayingFile, 
                                      onDelete: handleDeleteFiles, 
                                      onEdit: handleEditResultModal, 
                                      onDownload: handleDownloadFiles,
                                      selected: selectedFileIds.has(file.id), 
                                      onSelect: handleFileSelect,
                                      isProcessing: processingFileIds.has(file.id),
                                      canEdit: canEdit
                                    }} />
                                  </List.Item>
                                )}
                              />
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                               <Card><div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无文件，请先上传</div></Card>
                              </div>
                            )}
                          </div>
                          {processedFiles.length > pageSize && (
                            <div className="video-list-footer">
                              <Pagination 
                                current={currentPage} 
                                total={processedFiles.length} 
                                pageSize={pageSize} 
                                onChange={setCurrentPage}
                              />
                            </div>
                          )}
                      </div>
                    </Col>
                  </Row>
              </Col>
            </Row>
          </Tabs.TabPane>
          <Tabs.TabPane tab="剧本整合" key="2">
            <Form form={form} layout="vertical" onFinish={handleIntegrate}>
               <Row gutter={24}>
                  <Col xs={8}>
                     <Card 
                       title="模型配置" 
                       bordered={false}
                     >
                        <Form.Item label="模型" name="integration_model">
                            <Select defaultValue={modelConfig.defaultModel} disabled={!canEdit}>
                              {modelConfig.availableModels.map(model => (
                                <Select.Option key={model} value={model}>
                                  {model === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash' :
                                   model === 'gemini-1.5-pro' ? 'Gemini 1.5 Pro' :
                                   model === 'gemini-pro' ? 'Gemini Pro' : model}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Row align="middle" gutter={8}>
                            <Col flex="auto">
                              <Form.Item
                                label="Temperature"
                                name="integration_temperature"
                                initialValue={1}
                              >
                                <Slider
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  disabled={!canEdit}
                                />
                              </Form.Item>
                            </Col>
                            <Col>
                              <Form.Item
                                name="integration_temperature"
                                initialValue={1}
                                style={{ marginTop: 30 }}
                              >
                                <InputNumber
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  disabled={!canEdit}  
                                  style={{ width: 60, marginLeft: 8 }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item label="Prompt" name="integrationPrompt">
                             <EditableTextArea 
                               value={form.getFieldValue('integrationPrompt')}
                               onChange={value => form.setFieldsValue({ integrationPrompt: value })}
                               onSave={canEdit ? handleSaveIntegrationPrompt : undefined}
                               onLoadDefault={canEdit ? handleLoadDefaultIntegrationPrompt : undefined}
                               placeholder={usingSystemDefaults.integration ? 
                                 "当前使用系统默认Prompt（点击放大编辑按钮进行编辑）" : 
                                 "例如：请将以下内容整合成一个连贯的剧本..."}
                               title="编辑剧本整合Prompt"
                               rows={12}
                               disabled={!canEdit}
                             />
                           </Form.Item>

                           <Button 
                             type="primary" 
                             icon={<FunctionOutlined />} 
                             style={{ width: '100%'}} 
                             loading={integrating} 
                             onClick={() => handleIntegrate(form.getFieldsValue(true))}
                             disabled={!canEdit}
                           >
                             {canEdit ? "开始整合" : "只读权限，无法整合"}
                           </Button>
                     </Card>
                  </Col>
                  <Col xs={16}>
                    <Card title="整合工作台" bordered={false}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '32px', marginBottom: '8px' }}>
                            <Title level={5} style={{ margin: 0 }}>素材区</Title>
                            <Button 
                              icon={<SelectOutlined />} 
                              onClick={() => {
                                setModalSelectedFileIds(new Set()); // Reset selection on open
                                setIsSelectionModalVisible(true);
                              }}
                              disabled={!canEdit}
                            >
                              {canEdit ? "选择解析文本" : "只读权限"}
                            </Button>
                          </div>
                          <EditableTextArea
                            value={draftContent}
                            onChange={setDraftContent}
                            placeholder="选择解析文本添加到此处，或直接编辑..."
                            rows={22}
                            disabled={!canEdit}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '32px', marginBottom: '8px' }}>
                            <Title level={5} style={{ margin: 0 }}>成品区</Title>
                            <Tooltip title={canEdit ? "保存为DOCX格式到知识库" : "只读权限，无法存档"}>
                              <Button 
                                icon={<BookOutlined />} 
                                onClick={handleArchive} 
                                disabled={!integrationResult || !canEdit}
                              >
                                知识库存档
                              </Button>
                            </Tooltip>
                          </div>
                          <div className="integration-result-panel" style={{position: 'relative', minHeight: '320px'}}>
                            {integrating && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 10,
                                borderRadius: '8px'
                              }}>
                                <Spin tip="整合中..." size="large"/>
                              </div>
                            )}
                            <EditableTextArea
                              value={integrationResult}
                              onChange={setIntegrationResult}
                              placeholder="暂无整合结果..."
                              rows={22}
                              disabled={!canEdit}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
               </Row>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Content>
      <Modal
        title="最终整合剧本"
        open={isResultModalVisible}
        onCancel={() => setIsResultModalVisible(false)}
        footer={[
          <Button key="copy" onClick={() => {
            navigator.clipboard.writeText(integrationResult);
            message.success('已复制到剪贴板');
          }}>
            复制内容
          </Button>,
          <Button key="back" onClick={() => setIsResultModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width="60%"
      >
        <TextArea 
          value={integrationResult} 
          readOnly 
          autoSize={{ minRows: 15, maxRows: 25 }}
          style={{ background: '#f5f5f5', border: 'none' }}
        />
      </Modal>
      <Modal
        title="剧本存档"
        open={isArchiveModalVisible}
        onOk={handleConfirmArchive}
        onCancel={() => setIsArchiveModalVisible(false)}
        okText="存档"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            剧本将以专业格式保存为DOCX文档，包含格式化的标题。
          </Text>
        </div>
        <Input 
          placeholder="输入剧本存档的标题（将作为文档标题）"
          value={archiveTitle}
          onChange={(e) => setArchiveTitle(e.target.value)}
          suffix={<Text type="secondary">.docx</Text>}
        />
      </Modal>
      <Modal
        title="选择解析文本"
        open={isSelectionModalVisible}
        onCancel={() => setIsSelectionModalVisible(false)}
        onOk={handleConfirmSelectionAndAddToDraft}
        okText="确认选择"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Button 
            onClick={handleSelectAllInModal}
            disabled={processedFiles.filter(f => f.task_status === 'completed').length === 0}
          >
            {processedFiles.filter(f => f.task_status === 'completed').length > 0 && processedFiles.filter(f => f.task_status === 'completed').every(f => modalSelectedFileIds.has(f.id))
              ? '取消全选'
              : '全选'}
          </Button>
        </div>
        <List
            dataSource={processedFiles.filter(f => f.task_status === 'completed')}
            renderItem={file => (
                <List.Item>
                    <Checkbox
                        style={{ width: '100%' }}
                        checked={modalSelectedFileIds.has(file.id)}
                        onChange={e => {
                            setModalSelectedFileIds(prev => {
                                const newSet = new Set(prev);
                                if (e.target.checked) {
                                    newSet.add(file.id);
                                } else {
                                    newSet.delete(file.id);
                                }
                                return newSet;
                            });
                        }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                        <Text strong>{file.original_name}</Text>
                        <Paragraph type="secondary" ellipsis={{ rows: 2, expandable: false }}>
                          {file.task_result || '无解析内容'}
                        </Paragraph>
                      </div>
                    </Checkbox>
                </List.Item>
            )}
          />
          {processedFiles.filter(f => f.task_status === 'completed').length === 0 && (
            <Text type="secondary">暂无可选择的已解析文件。</Text>
          )}
      </Modal>
      {editingFile && (
        <Modal
          title={`编辑解析结果 - ${editingFile.original_name}`}
          open={!!editingFile}
          onOk={handleSaveAnalysisResult}
          onCancel={() => setEditingFile(null)}
          okText="保存"
          width="50vw"
          destroyOnClose
        >
          <TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoSize={{ minRows: 15, maxRows: 25 }}
          />
        </Modal>
      )}
      {playingFile && (
        <Modal
          title={playingFile.original_name}
          open={!!playingFile}
          onCancel={() => setPlayingFile(null)}
          footer={null}
          destroyOnClose
          width="70vw"
          bodyStyle={{ padding: 0, lineHeight: 0 }}
        >
          <VideoPlayer 
            file={playingFile}
            autoPlay
          />
        </Modal>
      )}
      
    </Layout>
  )
}

export default ProjectDetail