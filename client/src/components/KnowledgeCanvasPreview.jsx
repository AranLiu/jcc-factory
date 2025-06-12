import React, { useState, useCallback, useEffect } from 'react';
import { DocumentEditor } from '@mindfiredigital/react-canvas-editor';
import { Spin } from 'antd';
import { knowledgeBaseAPI } from '../services/api';

const KnowledgeCanvasPreview = ({ 
  item,
  loading: externalLoading = false
}) => {
  const [documentContent, setDocumentContent] = useState('');
  const [loading, setLoading] = useState(true);

  // 只读模式工具栏配置 - 禁用所有编辑功能
  const previewToolbarConfig = {
    // 禁用所有编辑功能，只保留查看功能
    undo: false,
    redo: false,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    subscript: false,
    superscript: false,
    leftAlign: false,
    centerAlign: false,
    rightAlign: false,
    justify: false,
    bulletList: false,
    numberedList: false,
    fontType: false,
    fontSize: false,
    textColor: false,
    highlight: false,
    heading: false,
    hyperlink: false,
    image: false,
    table: false,
  };

  // 预览样式配置
  const previewStyles = {
    toolbar_class: {
      container: {
        display: 'none', // 隐藏工具栏
      },
    },
    canvas_class: {
      editorMain: {
        backgroundColor: '#ffffff',
        minHeight: '400px',
        maxHeight: '70vh',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        overflow: 'auto',
        cursor: 'default', // 改为默认指针样式
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
        // 获取文件的原始内容用于预览
        const contentResponse = await knowledgeBaseAPI.getContent(item.id);
        setDocumentContent(contentResponse.content || '暂无内容');
      } catch (error) {
        console.error('加载预览内容失败:', error);
        setDocumentContent('预览内容加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [item?.id]);

  // 禁用内容变化处理（只读模式）
  const handleDocumentChange = useCallback(() => {
    // 预览模式下不处理内容变化
  }, []);

  if (loading || externalLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" tip="加载预览中..." />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <DocumentEditor
        toolbar={previewToolbarConfig}
        toolbar_class={previewStyles.toolbar_class}
        canvas_class={previewStyles.canvas_class}
        on_change={handleDocumentChange}
        value={documentContent}
        readOnly={true} // 设置为只读模式
      />
    </div>
  );
};

export default KnowledgeCanvasPreview; 