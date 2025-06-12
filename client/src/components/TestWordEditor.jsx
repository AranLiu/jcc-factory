import React from 'react';
import { DocumentEditor } from '@mindfiredigital/react-canvas-editor';
import { Card } from 'antd';

const TestWordEditor = () => {
  const handleChange = (data) => {
    console.log('文档内容变化:', data);
  };

  const handleSelect = (text) => {
    console.log('选中文本:', text);
  };

  // 基础工具栏配置
  const toolbarConfig = {
    bold: true,
    italic: true,
    underline: true,
    undo: true,
    redo: true,
  };

  return (
    <Card title="Canvas Editor 测试" style={{ margin: '20px' }}>
      <div style={{ height: '400px' }}>
        <DocumentEditor
          toolbar={toolbarConfig}
          on_change={handleChange}
          on_select={handleSelect}
          value="这是一个测试文档，您可以在这里编辑文本。"
        />
      </div>
    </Card>
  );
};

export default TestWordEditor; 