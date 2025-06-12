import React, { useState } from 'react';
import { Layout, Row, Col, Typography, Space, Divider, Card } from 'antd';
import { FileTextOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import WordEditor from '../components/WordEditor';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const WordEditorPage = () => {
  const [documentContent, setDocumentContent] = useState(`
    欢迎使用在线Word编辑器

    这是一个基于Canvas技术的现代化文档编辑器，支持类似Microsoft Word的完整编辑功能。

    主要特性：
    • 丰富的文本格式化选项
    • 插入图片和表格
    • 多种导出格式
    • 协同编辑支持
    • 响应式设计

    开始编辑您的文档吧！
  `);

  // 保存文档的回调函数
  const handleSaveDocument = async (content) => {
    console.log('保存文档内容:', content);
    // 这里可以调用API保存到服务器
    // await api.saveDocument(content);
    setDocumentContent(content);
  };

  // 导出文档的回调函数
  const handleExportDocument = (format) => {
    console.log('导出文档格式:', format);
    // 这里可以实现更复杂的导出逻辑
  };

  const features = [
    {
      icon: <EditOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      title: '完整编辑功能',
      description: '支持文本格式化、表格、图片等Word常用功能'
    },
    {
      icon: <FileTextOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      title: '多格式支持',
      description: '支持导入导出多种文档格式，包括DOCX、TXT等'
    },
    {
      icon: <TeamOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
      title: '协同编辑',
      description: '支持多人实时协同编辑，提升团队协作效率'
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Header style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <Space align="center">
            <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              JCC工坊 - 在线Word编辑器
            </Title>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* 功能介绍 */}
        <div style={{ marginBottom: '24px' }}>
          <Row gutter={[24, 24]}>
            {features.map((feature, index) => (
              <Col xs={24} md={8} key={index}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', height: '100%' }}
                >
                  <Space direction="vertical" size="small">
                    {feature.icon}
                    <Title level={5}>{feature.title}</Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      {feature.description}
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        {/* 主编辑器区域 */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px' }}>
          <WordEditor
            initialValue={documentContent}
            onSave={handleSaveDocument}
            onExport={handleExportDocument}
            title="我的文档"
          />
        </div>

        {/* 使用说明 */}
        <div style={{ marginTop: '24px' }}>
          <Card title="使用说明" type="inner">
            <Typography>
              <Paragraph>
                <strong>基本操作：</strong>
              </Paragraph>
              <ul>
                <li>点击编辑器区域开始输入文本</li>
                <li>使用工具栏进行文本格式化</li>
                <li>支持撤销/重做操作 (Ctrl+Z / Ctrl+Y)</li>
                <li>可以插入图片、表格等元素</li>
              </ul>
              
              <Paragraph>
                <strong>保存和导出：</strong>
              </Paragraph>
              <ul>
                <li>点击"保存"按钮保存文档到服务器</li>
                <li>点击"导出"按钮下载文档到本地</li>
                <li>支持多种格式导出：TXT、DOCX等</li>
              </ul>
            </Typography>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default WordEditorPage; 