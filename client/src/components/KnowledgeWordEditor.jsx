import React, { useState, useCallback, useEffect } from 'react';
import { DocumentEditor } from '@mindfiredigital/react-canvas-editor';
import { Button, Space, message, Spin } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { knowledgeBaseAPI } from '../services/api';

const KnowledgeWordEditor = ({ 
  item,
  onSave,
  onCancel,
  loading: externalLoading = false
}) => {
  const [documentContent, setDocumentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 工具栏配置 - 完整的Word功能
  const toolbarConfig = {
    // 基础编辑功能
    undo: true,
    redo: true,
    
    // 文本格式化
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    subscript: true,
    superscript: true,
    
    // 文本对齐
    leftAlign: true,
    centerAlign: true,
    rightAlign: true,
    justify: true,
    
    // 列表
    bulletList: true,
    numberedList: true,
    
    // 字体设置
    fontType: true,
    fontSize: true,
    textColor: true,
    highlight: true,
    
    // 高级功能
    heading: true,
    hyperlink: true,
    image: true,
    table: true,
  };

  // 样式配置
  const editorStyles = {
    toolbar_class: {
      container: {
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #d9d9d9',
        padding: '8px 16px',
        borderRadius: '8px 8px 0 0',
      },
      primaryToolbar: {
        justifyContent: 'flex-start',
        gap: '8px',
        flexWrap: 'wrap',
      },
      item: {
        selectedToolbarItemColor: {
          color: '#1890ff',
        },
      },
    },
    canvas_class: {
      editorMain: {
        backgroundColor: '#ffffff',
        minHeight: '500px',
        maxHeight: '70vh',
        border: '1px solid #d9d9d9',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        overflow: 'auto',
      },
      margin: {
        padding: '20px',
      },
    },
  };

  // 加载文档内容
  useEffect(() => {
    const loadContent = async () => {
      if (!item?.id) return;
      
      setLoading(true);
      try {
        // 获取文件的原始内容用于编辑
        const contentResponse = await knowledgeBaseAPI.getContent(item.id);
        setDocumentContent(contentResponse.content || '开始编辑您的文档...');
      } catch (error) {
        console.error('加载文档内容失败:', error);
        setDocumentContent('开始编辑您的文档...');
        message.warning('无法加载原文档内容，您可以重新编辑');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [item?.id]);

  // 文档内容变化处理
  const handleDocumentChange = useCallback((data) => {
    setDocumentContent(data);
  }, []);

  // 保存文档
  const handleSave = async () => {
    if (!documentContent.trim()) {
      message.warning('文档内容不能为空');
      return;
    }

    setSaving(true);
    try {
      await knowledgeBaseAPI.updateContent(item.id, documentContent);
      message.success('文档保存成功');
      onSave && onSave();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading || externalLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" tip="加载文档中..." />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* 操作按钮栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #d9d9d9'
      }}>
        <div>
          <strong>编辑文档：{item?.title}</strong>
        </div>
        <Space>
          <Button 
            icon={<SaveOutlined />} 
            type="primary"
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
          <Button 
            icon={<CloseOutlined />} 
            onClick={onCancel}
          >
            取消
          </Button>
        </Space>
      </div>

      {/* 编辑器区域 */}
      <div style={{ height: 'calc(100% - 60px)' }}>
        <DocumentEditor
          toolbar={toolbarConfig}
          toolbar_class={editorStyles.toolbar_class}
          canvas_class={editorStyles.canvas_class}
          on_change={handleDocumentChange}
          value={documentContent}
        />
      </div>
    </div>
  );
};

export default KnowledgeWordEditor; 