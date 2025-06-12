import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, List, Card, message, Space, Modal, Spin, Upload, Tag, Popconfirm,
  Select, Popover, Input, Divider, Table, Checkbox, Dropdown, Menu, Form, ColorPicker, Tooltip, Row, Col
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, FileTextOutlined, EyeOutlined, PlusOutlined,
  DeleteOutlined, TagOutlined, EditOutlined, MoreOutlined, CheckOutlined, 
  CloseOutlined, FolderOpenOutlined, DownCircleOutlined, FileWordOutlined, FilePdfOutlined,
  FormOutlined, EllipsisOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { knowledgeBaseAPI, tagsAPI } from '../services/api';
import dayjs from 'dayjs';
import { CirclePicker } from 'react-color';
import KnowledgeWordEditor from '../components/KnowledgeWordEditor';
import KnowledgeCanvasPreview from '../components/KnowledgeCanvasPreview';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PREDEFINED_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B801', '#5F67E8', '#1DDBB3', '#A267E3', '#F9844A',
  '#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'
];

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '未知';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 根据文件类型获取图标
const getFileIcon = (fileType, title) => {
  if (!fileType && !title) return <FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
  
  const type = fileType || '';
  const fileName = title || '';
  
  if (type.includes('text/plain') || fileName.toLowerCase().endsWith('.txt')) {
    return <FileTextOutlined style={{ fontSize: 16, color: '#52c41a' }} />;
  } else if (type.includes('msword') || type.includes('wordprocessingml') || 
             fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) {
    return <FileWordOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
  }
  
  return <FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
};

// 分离文件名和扩展名
const parseFileName = (fullName) => {
  if (!fullName) return { name: '', extension: '' };
  
  const lastDotIndex = fullName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return { name: fullName, extension: '' };
  }
  
  const name = fullName.substring(0, lastDotIndex);
  const extension = fullName.substring(lastDotIndex + 1); // 保持原始大小写
  
  return { name, extension };
};

// --- Main Component ---
const KnowledgeBase = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagManagerVisible, setTagManagerVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchTagVisible, setBatchTagVisible] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [entriesData, tagsData] = await Promise.all([
        knowledgeBaseAPI.getAll(selectedTagIds),
        tagsAPI.getAll()
      ]);
      setEntries(entriesData.items || []);
      setTags(tagsData || []);
    } catch (error) {
      message.error('加载知识库数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedTagIds]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    
    // 检查文件类型
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      message.error('只允许上传 .doc, .docx, .txt 文件');
      onError(new Error('不支持的文件类型'));
      return;
    }

    try {
      await knowledgeBaseAPI.upload(file);
      message.success('文件上传成功');
      onSuccess();
      fetchAllData();
    } catch (error) {
      message.error('文件上传失败');
      onError(error);
    }
  };

  const handleDeleteEntry = async (item) => {
    try {
      await knowledgeBaseAPI.delete(item.id);
      message.success('文件删除成功');
      fetchAllData();
    } catch (error) {
      message.error("删除文件失败");
    }
  };

  // 批量操作
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedFiles(entries.map(item => item.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (fileId, checked) => {
    if (checked) {
      setSelectedFiles([...selectedFiles, fileId]);
    } else {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    }
  };

  const handleBatchDownload = async () => {
    const selectedEntries = entries.filter(item => selectedFiles.includes(item.id));
    const token = localStorage.getItem('token');
    let successCount = 0;
    
    for (const item of selectedEntries) {
      if (item.id) {
        try {
          const downloadUrl = `${API_BASE_URL}/api/knowledge-base/${item.id}/download`;
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', item.title);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          successCount++;
          // 添加小延迟，避免浏览器同时下载太多文件
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`下载文件 ${item.title} 失败:`, error);
          message.error(`文件 ${item.title} 下载失败`);
        }
      }
    }
    
    if (successCount > 0) {
      message.success(`成功开始下载 ${successCount} 个文件`);
    }
  };

  const handleBatchDelete = async () => {
    try {
      await Promise.all(selectedFiles.map(id => knowledgeBaseAPI.delete(id)));
      message.success(`成功删除 ${selectedFiles.length} 个文件`);
      setSelectedFiles([]);
      fetchAllData();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchAddTag = async (tagId) => {
    try {
      await Promise.all(selectedFiles.map(id => knowledgeBaseAPI.addTag(id, tagId)));
      message.success(`成功为 ${selectedFiles.length} 个文件添加标签`);
      setBatchTagVisible(false);
      fetchAllData();
    } catch (error) {
      message.error('批量添加标签失败');
    }
  };

  const refreshData = fetchAllData;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <KnowledgeBaseHeader navigate={navigate} fileCount={entries.length} />
      <Content style={{ padding: '24px' }}>
        <Toolbar
          tags={tags}
          selectedTagIds={selectedTagIds}
          onTagFilterChange={setSelectedTagIds}
          onUpload={handleUpload}
          onManageTags={() => setTagManagerVisible(true)}
        />
        
        {/* 批量操作工具栏 */}
        <BatchToolbar
          selectedFiles={selectedFiles}
          entries={entries}
          tags={tags}
          onSelectAll={handleSelectAll}
          onBatchDownload={handleBatchDownload}
          onBatchDelete={handleBatchDelete}
          onBatchAddTag={() => setBatchTagVisible(true)}
        />
        
        <Divider />
        
        <FileList
          loading={loading}
          entries={entries}
          allTags={tags}
          selectedFiles={selectedFiles}
          onDelete={handleDeleteEntry}
          onDataRefresh={refreshData}
          onSelectFile={handleSelectFile}
        />
        
        <TagManagementModal
          visible={tagManagerVisible}
          tags={tags}
          onClose={() => setTagManagerVisible(false)}
          onDataRefresh={refreshData}
        />

        <BatchTagModal
          visible={batchTagVisible}
          tags={tags}
          onClose={() => setBatchTagVisible(false)}
          onAddTag={handleBatchAddTag}
        />
      </Content>
    </Layout>
  );
};

// --- Sub-components ---

const KnowledgeBaseHeader = ({ navigate, fileCount }) => (
  <Header style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')} style={{ marginRight: 16 }}>
      返回工作区
    </Button>
    <Title level={4} style={{ margin: 0, flex: 1 }}>知识库</Title>
    <Text type="secondary">共 {fileCount} 个文件</Text>
  </Header>
);

const Toolbar = ({ tags, selectedTagIds, onTagFilterChange, onUpload, onManageTags }) => {
  const [searchText, setSearchText] = useState('');

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ') { // 空格键
      e.preventDefault();
      const trimmedSearch = searchText.trim();
      if (trimmedSearch) {
        // 查找匹配的标签
        const matchedTag = tags.find(tag => 
          tag.name.toLowerCase().includes(trimmedSearch.toLowerCase())
        );
        
        if (matchedTag && !selectedTagIds.includes(matchedTag.id)) {
          // 添加到已选标签
          onTagFilterChange([...selectedTagIds, matchedTag.id]);
        }
        
        // 清空搜索文本
        setSearchText('');
      }
    }
  };

  // 过滤标签，优先显示搜索匹配的标签
  const filteredTags = tags.filter(tag => 
    searchText ? tag.name.toLowerCase().includes(searchText.toLowerCase()) : true
  ).sort((a, b) => {
    if (!searchText) return 0;
    const aMatches = a.name.toLowerCase().includes(searchText.toLowerCase());
    const bMatches = b.name.toLowerCase().includes(searchText.toLowerCase());
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return 0;
  });

  return (
    <Space wrap style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
      <Select
        mode="multiple"
        style={{ minWidth: 240, maxWidth: 500 }}
        placeholder="输入文本搜索标签，空格键选择..."
        value={selectedTagIds}
        onChange={onTagFilterChange}
        allowClear
        showSearch
        searchValue={searchText}
        onSearch={handleSearch}
        onInputKeyDown={handleKeyDown}
        filterOption={false} // 关闭默认过滤，使用自定义过滤
        notFoundContent={searchText ? `未找到匹配"${searchText}"的标签` : '暂无标签'}
      >
        {filteredTags.map(tag => (
          <Option key={tag.id} value={tag.id}>
            <Tag color={tag.color} style={{ margin: 0 }}>
              {tag.name} ({tag.file_count || 0})
            </Tag>
          </Option>
        ))}
      </Select>
      <Space>
        <Button icon={<TagOutlined />} onClick={onManageTags}>管理标签</Button>
        <Upload 
          customRequest={onUpload} 
          showUploadList={false}
          accept=".doc,.docx,.txt"
        >
          <Tooltip title="只允许上传 .doc, .docx, .txt 文件">
            <Button icon={<PlusOutlined />}>上传文件</Button>
          </Tooltip>
        </Upload>
      </Space>
    </Space>
  );
};

// 批量操作工具栏
const BatchToolbar = ({ selectedFiles, entries, tags, onSelectAll, onBatchDownload, onBatchDelete, onBatchAddTag }) => {
  const isAllSelected = selectedFiles.length === entries.length && entries.length > 0;
  const isIndeterminate = selectedFiles.length > 0 && selectedFiles.length < entries.length;

  const batchMenu = (
    <Menu>
      <Menu.Item key="download" icon={<DownloadOutlined />} onClick={onBatchDownload}>
        批量下载
      </Menu.Item>
      <Menu.Item key="tag" icon={<TagOutlined />} onClick={onBatchAddTag}>
        批量添加标签
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={onBatchDelete}>
        批量删除
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <Space>
        <Checkbox
          indeterminate={isIndeterminate}
          checked={isAllSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
        >
          全选
        </Checkbox>
        {selectedFiles.length > 0 && (
          <>
            <Text type="secondary">已选择 {selectedFiles.length} 个文件</Text>
            <Dropdown overlay={batchMenu} trigger={['click']} disabled={selectedFiles.length === 0}>
              <Button icon={<MoreOutlined />}>批量操作</Button>
            </Dropdown>
          </>
        )}
      </Space>
    </div>
  );
};

const FileList = ({ loading, entries, allTags, selectedFiles, onDelete, onDataRefresh, onSelectFile }) => (
  <List
    loading={loading}
    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 6, xxl: 8 }} // 增加列数，缩小卡片
    dataSource={entries}
    renderItem={item => (
      <List.Item>
        <FileCard 
          item={item} 
          allTags={allTags} 
          onDelete={onDelete} 
          onDataRefresh={onDataRefresh}
          selected={selectedFiles.includes(item.id)}
          onSelect={(checked) => onSelectFile(item.id, checked)}
        />
      </List.Item>
    )}
  />
);

const FileCard = ({ item, allTags, onDelete, onDataRefresh, selected, onSelect }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(parseFileName(item.title).name); // 只保存文件名部分
  const [hovered, setHovered] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState(3); // 默认显示3个标签
  // 移除了未使用的 tagsContainerRef 和复杂的标签计算逻辑

  // 简化标签显示逻辑 - 固定显示3个标签
  const displayTags = item.tags.slice(0, visibleTagCount);
  const hasMoreTags = item.tags.length > visibleTagCount;

  const handleDownload = () => {
    if (!item.id) {
      message.error('文件ID不存在，无法下载');
      return;
    }
    
    // 使用专门的下载API端点
    const downloadUrl = `${API_BASE_URL}/api/knowledge-base/${item.id}/download`;
    const token = localStorage.getItem('token');
    
    fetch(downloadUrl, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.title);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('文件下载开始');
    })
    .catch(error => {
      console.error('下载失败:', error);
      message.error('文件下载失败，请检查文件是否存在');
    });
  };

  // 文件名点击预览
  const handleTitleClick = () => {
    if (!item.file_path) {
      message.error('此项目没有关联的文件，无法预览');
      return;
    }
    if (!editingTitle) { // 只有在非编辑状态下才能预览
      setPreviewVisible(true);
    }
  };

  const handleTitleSave = async () => {
    const trimmedNewTitle = newTitle.trim();
    const { name: originalName, extension } = parseFileName(item.title);
    
    if (trimmedNewTitle && trimmedNewTitle !== originalName) {
      try {
        // 组合新的完整文件名：新文件名 + 原扩展名
        const fullNewTitle = extension ? `${trimmedNewTitle}.${extension.toLowerCase()}` : trimmedNewTitle;
        await knowledgeBaseAPI.updateTitle(item.id, fullNewTitle);
        message.success('文件名修改成功');
        onDataRefresh();
      } catch (error) {
        message.error('文件名修改失败');
        setNewTitle(originalName); // 恢复到原文件名
      }
    }
    setEditingTitle(false);
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await knowledgeBaseAPI.removeTag(item.id, tagId);
      onDataRefresh();
    } catch (error) {
      console.error('移除标签失败', error);
    }
  };

  // 编辑文档
  const handleEdit = () => {
    setEditModalVisible(true);
  };

  // 编辑保存成功
  const handleEditSave = () => {
    setEditModalVisible(false);
    onDataRefresh(); // 刷新数据
  };

  // 取消编辑
  const handleEditCancel = () => {
    setEditModalVisible(false);
  };

  // 操作菜单配置 - 放到函数定义之后
  const menuItems = [
    {
      key: 'rename',
      icon: <EditOutlined style={{ fontSize: 16 }} />,
      label: '重命名',
      onClick: () => {
        setNewTitle(parseFileName(item.title).name); // 确保只编辑文件名部分
        setEditingTitle(true);
      },
    },
    {
      key: 'edit',
      icon: <FormOutlined style={{ fontSize: 16 }} />,
      label: '编辑',
      onClick: handleEdit,
    },
    {
      key: 'download',
      icon: <DownloadOutlined style={{ fontSize: 16 }} />,
      label: '下载',
      onClick: handleDownload,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined style={{ fontSize: 16 }} />,
      label: '删除',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确定删除此文件吗？',
          content: '删除后将无法恢复',
          okText: '确定',
          cancelText: '取消',
          onOk: () => onDelete(item),
        });
      },
    },
  ];

  const handleAddOrCreateTag = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    try {
      let tagToAssociate = allTags.find(t => t.name.toLowerCase() === trimmedValue.toLowerCase());
      if (!tagToAssociate) {
        // 创建新标签时自动分配颜色
        const usedColors = allTags.map(tag => tag.color);
        const availableColors = PREDEFINED_COLORS.filter(color => !usedColors.includes(color));
        const selectedColor = availableColors.length > 0 ? availableColors[0] : PREDEFINED_COLORS[allTags.length % PREDEFINED_COLORS.length];
        
        tagToAssociate = await tagsAPI.create({ 
          name: trimmedValue, 
          color: selectedColor 
        });
      }

      if (!item.tags.some(t => t.id === tagToAssociate.id)) {
        await knowledgeBaseAPI.addTag(item.id, tagToAssociate.id);
        message.success(`标签"${tagToAssociate.name}"添加成功`);
      } else {
        message.warning(`标签"${tagToAssociate.name}"已存在`);
      }
      onDataRefresh();
    } catch (error) {
      console.error("添加标签失败", error);
      message.error("添加标签失败");
    }
  };

  // 使用真实的文件大小
  const fileSize = item.file_size || 0;

  return (
    <>
      <Card
        style={{ 
          position: 'relative',
          border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          borderRadius: 8,
          transition: 'all 0.2s ease',
          height: 200, // 固定高度
        }}
        bodyStyle={{ 
          padding: 16, // 8点网格系统：2*8px
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 顶部操作区 - 8px间距 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16, // 2*8px
        }}>
          {/* 选择框 */}
          <Checkbox
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
          
          {/* 操作菜单 */}
          <Dropdown 
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              type="text" 
              icon={<EllipsisOutlined style={{ fontSize: 16 }} />}
              style={{
                padding: '4px 8px', // 8点网格
                opacity: hovered ? 1 : 0.6,
                transition: 'opacity 0.2s',
              }}
            />
          </Dropdown>
        </div>

        {/* 文件名区域 - 可点击预览 */}
        <div style={{ marginBottom: 8 }}> {/* 8px间距 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {getFileIcon(item.file_type, item.title)}
            {editingTitle ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                flex: 1,
                minWidth: 0 
              }}>
                <Input
                  size="small"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onPressEnter={handleTitleSave}
                  onBlur={handleTitleSave}
                  autoFocus
                  placeholder="输入新文件名"
                  style={{ flex: 1 }}
                />
                {parseFileName(item.title).extension && (
                  <span style={{
                    fontSize: 11,
                    color: '#999',
                    backgroundColor: '#f5f5f5',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}>
                    .{parseFileName(item.title).extension.toLowerCase()}
                   </span>
                )}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                flex: 1,
                minWidth: 0 // 允许子元素缩小
              }}>
                <Text 
                  strong 
                  style={{ 
                    fontSize: 14, 
                    lineHeight: '20px',
                    cursor: item.file_path ? 'pointer' : 'default',
                    color: item.file_path ? '#1890ff' : 'inherit',
                    transition: 'color 0.2s',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}
                  onClick={handleTitleClick}
                  onMouseEnter={(e) => {
                    if (item.file_path && !editingTitle) {
                      e.target.style.textDecoration = 'underline';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                  }}
                  title={parseFileName(item.title).name} // 悬停显示完整文件名
                >
                  {parseFileName(item.title).name}
                </Text>
                {parseFileName(item.title).extension && (
                  <span style={{
                    fontSize: 11,
                    color: '#999',
                    backgroundColor: '#f5f5f5',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    flexShrink: 0, // 不允许扩展名缩小
                  }}>
                    .{parseFileName(item.title).extension.toLowerCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 文件信息行 - 左右分布 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16, // 2*8px
          color: '#666',
          fontSize: 12,
        }}>
          <span>{formatFileSize(fileSize)}</span>
          <span>{dayjs(item.updated_at).format('YYYY-MM-DD HH:mm')}</span>
        </div>

        {/* 标签区域 */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8, // 8px间距
          alignItems: 'center',
        }}>
          {/* 显示标签 */}
          {displayTags.map((tag) => (
            <Tag
              key={tag.id}
              closable
              onClose={() => handleRemoveTag(tag.id)}
              color={tag.color}
              style={{ 
                margin: 0,
                fontSize: 11,
                lineHeight: '18px',
                height: 20,
                borderRadius: 4,
              }}
            >
              {tag.name}
            </Tag>
          ))}
          
          {/* 更多标签指示器 - 悬停显示所有标签 */}
          {hasMoreTags && (
            <Popover
              content={
                <div style={{ maxWidth: 400 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>所有标签 ({item.tags.length})：</Text>
                  </div>
                  <Space wrap size={4}>
                    {item.tags.map(tag => (
                      <Tag 
                        key={tag.id} 
                        color={tag.color} 
                        closable 
                        onClose={() => handleRemoveTag(tag.id)}
                        style={{ fontSize: 11, margin: '2px' }}
                      >
                        {tag.name}
                      </Tag>
                    ))}
                  </Space>
                </div>
              }
              trigger="hover"
              placement="bottomLeft"
            >
              <Tag 
                style={{ 
                  margin: 0,
                  fontSize: 11,
                  lineHeight: '18px',
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: '#f5f5f5',
                  borderColor: '#d9d9d9',
                  color: '#666',
                  cursor: 'pointer',
                }}
              >
                +{item.tags.length - visibleTagCount}
              </Tag>
            </Popover>
          )}
          
          {/* 轻量化添加标签按钮 */}
          <TagSelector
            allTags={allTags}
            itemTags={item.tags}
            onSelect={handleAddOrCreateTag}
          />
        </div>
      </Card>

      {/* Canvas预览模态框 */}
      <Modal
        title={`预览：${item.title}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80vw"
        style={{ top: 20 }}
        destroyOnClose
      >
        <KnowledgeCanvasPreview
          item={item}
        />
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title={null}
        open={editModalVisible}
        onCancel={handleEditCancel}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        destroyOnClose
        maskClosable={false}
      >
        <KnowledgeWordEditor
          item={item}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      </Modal>
    </>
  );
};

const TagSelector = ({ allTags, itemTags, onSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [visible, setVisible] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchText.trim()) {
        onSelect(searchText);
        setSearchText('');
        setVisible(false);
      }
    }
  };

  const handleTagClick = (tag) => {
    const isDisabled = itemTags.some(t => t.id === tag.id);
    if (isDisabled) return;

    if (selectedTags.find(t => t.id === tag.id)) {
      // 取消选择
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // 添加选择
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleConfirm = () => {
    if (selectedTags.length > 0) {
      // 批量添加选中的标签
      selectedTags.forEach(tag => onSelect(tag.name));
      setSelectedTags([]);
      setVisible(false);
    }
  };

  const handleCancel = () => {
    setSelectedTags([]);
    setVisible(false);
  };

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const content = (
    <div style={{ width: 280 }}>
      <Input
        placeholder="搜索或回车创建新标签..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        size="small"
      />
      <Divider style={{ margin: '8px 0' }} />
      
      {selectedTags.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              已选择 {selectedTags.length} 个标签：
            </Text>
          </div>
          <div style={{ marginBottom: 8, maxHeight: 60, overflowY: 'auto' }}>
            <Space wrap size={4}>
              {selectedTags.map(tag => (
                <Tag 
                  key={tag.id} 
                  color={tag.color} 
                  closable
                  onClose={() => handleTagClick(tag)}
                  style={{ fontSize: 12 }}
                >
                  {tag.name}
                </Tag>
              ))}
            </Space>
          </div>
          <Divider style={{ margin: '8px 0' }} />
        </>
      )}

      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          点击标签进行多选：
        </Text>
      </div>
      <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
        <Space wrap size={4}>
          {filteredTags.map(tag => {
            const isDisabled = itemTags.some(t => t.id === tag.id);
            const isSelected = selectedTags.find(t => t.id === tag.id);
            return (
              <Tag
                key={tag.id}
                color={tag.color}
                onClick={() => handleTagClick(tag)}
                style={{
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  fontSize: 12,
                  border: isSelected ? '2px solid #1890ff' : 'none'
                }}
              >
                {tag.name} {isSelected && '✓'}
              </Tag>
            );
          })}
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Button size="small" onClick={handleCancel}>
          取消
        </Button>
        <Button 
          type="primary" 
          size="small" 
          onClick={handleConfirm}
          disabled={selectedTags.length === 0}
        >
          添加 {selectedTags.length > 0 && `(${selectedTags.length})`}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover 
      content={content} 
      trigger="click" 
      placement="bottomLeft"
      open={visible}
      onOpenChange={setVisible}
    >
      <Tag style={{ 
        background: '#fff', 
        borderStyle: 'dashed', 
        cursor: 'pointer',
        fontSize: 11,
        lineHeight: '18px',
        height: 20,
        margin: 0,
        borderRadius: 4,
        borderColor: '#d9d9d9',
        color: '#666',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
      }}>
        <PlusOutlined style={{ fontSize: 12 }} />
      </Tag>
    </Popover>
  );
};

// 批量标签模态框
const BatchTagModal = ({ visible, tags, onClose, onAddTag }) => {
  const [selectedTag, setSelectedTag] = useState(null);

  return (
    <Modal
      title="批量添加标签"
      open={visible}
      onCancel={onClose}
      onOk={() => {
        if (selectedTag) {
          onAddTag(selectedTag);
          setSelectedTag(null);
        }
      }}
      okButtonProps={{ disabled: !selectedTag }}
    >
      <div>
        <p>请选择要添加的标签：</p>
        <Space wrap>
          {tags.map(tag => (
            <Tag
              key={tag.id}
              color={tag.color}
              style={{
                cursor: 'pointer',
                border: selectedTag === tag.id ? '2px solid #1890ff' : 'none'
              }}
              onClick={() => setSelectedTag(tag.id)}
            >
              {tag.name}
            </Tag>
          ))}
        </Space>
      </div>
    </Modal>
  );
};

const TagManagementModal = ({ visible, tags, onClose, onDataRefresh }) => {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const handleDelete = async (tagId) => {
    try {
      await tagsAPI.delete(tagId);
      onDataRefresh();
    } catch (error) {
      message.error("删除标签失败");
    }
  };

  const handleCreate = async (values) => {
    try {
      setCreating(true);
      // 自动分配颜色，确保唯一性
      const usedColors = tags.map(tag => tag.color);
      const availableColors = PREDEFINED_COLORS.filter(color => !usedColors.includes(color));
      const selectedColor = availableColors.length > 0 ? availableColors[0] : PREDEFINED_COLORS[tags.length % PREDEFINED_COLORS.length];
      
      await tagsAPI.create({
        ...values,
        color: selectedColor
      });
      message.success('标签创建成功');
      form.resetFields();
      onDataRefresh();
    } catch (error) {
      message.error('标签创建失败');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { 
      title: '标签', 
      dataIndex: 'name', 
      key: 'name', 
      render: (text, record) => <Tag color={record.color}>{text}</Tag> 
    },
    { 
      title: '使用次数', 
      dataIndex: 'usage_count', 
      key: 'usage_count' 
    },
    {
      title: '操作',
      key: 'action',
      render: (text, record) => (
        record.usage_count === 0 ? (
          <Popconfirm title="确定删除这个标签吗？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        ) : null
      ),
    },
  ];

  return (
    <Modal
      title="管理标签"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>关闭</Button>
      ]}
      width={700}
    >
      {/* 新增标签表单 */}
      <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
        
        <Form form={form} layout="inline" onFinish={handleCreate}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="标签名称" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              创建标签
            </Button>
          </Form.Item>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
             
            </Text>
        </Form>
      </div>

      <Table dataSource={tags} columns={columns} rowKey="id" pagination={false} />
    </Modal>
  );
};

export default KnowledgeBase; 