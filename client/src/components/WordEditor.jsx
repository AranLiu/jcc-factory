import React, { useState, useCallback } from 'react';
import { DocumentEditor } from '@mindfiredigital/react-canvas-editor';
import { Card, Button, Space, message, Modal } from 'antd';
import { SaveOutlined, DownloadOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import documentService from '../services/documentService';

const WordEditor = ({ 
  initialValue = '', 
  onSave, 
  onExport,
  readOnly = false,
  title = '文档编辑器'
}) => {
  const [documentContent, setDocumentContent] = useState(initialValue);
  const [selectedText, setSelectedText] = useState('');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);

  // 工具栏配置 - 类似Word的完整功能
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

  // 样式自定义配置
  const editorStyles = {
    toolbar_class: {
      container: {
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #d9d9d9',
        padding: '8px 16px',
      },
      primaryToolbar: {
        justifyContent: 'flex-start',
        gap: '8px',
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
        minHeight: '600px',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
      },
      margin: {
        padding: '20px',
      },
    },
  };

  // 文档内容变化处理
  const handleDocumentChange = useCallback((data) => {
    setDocumentContent(data);
    console.log('文档内容更新:', data);
  }, []);

  // 文本选择处理
  const handleTextSelect = useCallback((text) => {
    setSelectedText(text);
    console.log('选中文本:', text);
  }, []);

  // 保存文档
  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(documentContent);
        message.success('文档保存成功');
      } else {
        // 使用后端API保存文档
        const documentTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        await documentService.saveDocument({
          title: documentTitle,
          content: documentContent,
          format: 'json'
        });
        message.success('文档已保存到服务器');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    }
  };

  // 导出文档
  const handleExport = () => {
    setIsExportModalVisible(true);
  };

  // 导出为不同格式
  const exportDocument = async (format) => {
    try {
      const documentTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      await documentService.exportDocument(documentContent, format, documentTitle);
      message.success(`文档已导出为 ${format.toUpperCase()} 格式`);
      setIsExportModalVisible(false);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入文档
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,.doc,.html';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // 使用后端API处理文件上传和解析
          const result = await documentService.uploadDocument(file);
          setDocumentContent(result.content || '');
          message.success('文档导入成功');
        } catch (error) {
          console.error('导入失败:', error);
          message.error('导入失败，请重试');
          
          // 回退到前端文本文件读取
          if (file.type === 'text/plain' || file.type === 'text/html') {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target.result;
              setDocumentContent(content);
              message.success('文档导入成功');
            };
            reader.readAsText(file);
          }
        }
      }
    };
    input.click();
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            {title}
          </Space>
        }
        extra={
          !readOnly && (
            <Space>
              <Button 
                icon={<UploadOutlined />} 
                onClick={handleImport}
              >
                导入
              </Button>
              <Button 
                icon={<SaveOutlined />} 
                type="primary"
                onClick={handleSave}
              >
                保存
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
              >
                导出
              </Button>
            </Space>
          )
        }
        bodyStyle={{ padding: 0 }}
      >
        <DocumentEditor
          toolbar={toolbarConfig}
          toolbar_class={editorStyles.toolbar_class}
          canvas_class={editorStyles.canvas_class}
          on_change={handleDocumentChange}
          on_select={handleTextSelect}
          value={documentContent}
          readOnly={readOnly}
        />
      </Card>

      {/* 导出选项弹窗 */}
      <Modal
        title="导出文档"
        open={isExportModalVisible}
        onCancel={() => setIsExportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            block 
            onClick={() => exportDocument('txt')}
          >
            导出为 TXT 格式
          </Button>
          <Button 
            block 
            onClick={() => exportDocument('docx')}
          >
            导出为 DOCX 格式
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default WordEditor; 