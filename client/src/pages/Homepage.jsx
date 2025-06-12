import React, { useState } from 'react'
import { Button, Dropdown, Menu, Modal, Form, Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import shibaLogo from '../assets/shiba-logo.png.png';
import { authAPI } from '../services/api'

const ChangePasswordModal = ({ visible, onCancel, onFinish }) => {
  const [form] = Form.useForm();
  return (
    <Modal
      title="修改密码"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="确认"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" onFinish={onFinish} name="change_password">
        <Form.Item
          name="oldPassword"
          label="旧密码"
          rules={[{ required: true, message: '请输入您的旧密码' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入您的新密码' },
            { min: 6, message: '密码长度不能少于6位' }
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入您的新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const Homepage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [modalVisible, setModalVisible] = useState(false);

  const handleFeatureSelect = (type) => {
    navigate('/workspace', { state: { projectType: type } })
  }

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
    } else if (key === 'changePassword') {
      setModalVisible(true);
    } else if (key === 'userManagement') {
      navigate('/user-management');
    } else if (key === 'systemConfig') {
      navigate('/system-config');
    }
  };
  
  const handleChangePassword = async (values) => {
    try {
      await authAPI.changePassword(values);
      message.success('密码修改成功');
      setModalVisible(false);
    } catch (error) {
      message.error(error.response?.data?.message || '密码修改失败');
    }
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {user?.role === 'admin' && <Menu.Item key="userManagement">用户管理</Menu.Item>}
      {user?.role === 'admin' && <Menu.Item key="systemConfig">系统配置</Menu.Item>}
      <Menu.Item key="changePassword">修改密码</Menu.Item>
      <Menu.Item key="logout">退出</Menu.Item>
    </Menu>
  );

  return (
    <div className="homepage-container">
      <div className="homepage-content">
        {/* 头部信息 */}
        <div style={{ 
          position: 'absolute', 
          top: 20, 
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="link" style={{ padding: 0, color: '#444444', fontWeight: 500 }}>
              👋 {user?.username}
            </Button>
          </Dropdown>
        </div>

        {/* 品牌标识 */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ 
            fontSize: '22px', 
            color: '#666', 
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src={shibaLogo} alt="Logo" style={{ width: '38px', marginRight: '12px' }}/>
            <span style={{ fontWeight: 'bold',fontSize: '28px'}}>剧柴柴 - 短剧本工坊</span>
          </div>
          <div style={{ 
            fontSize: 18, 
            color: '#999',
            display: 'flex',
            justifyContent: 'center',
            gap: 16
          }}>
          </div>
        </div>

        {/* 主标题 */}
        <h1 className="homepage-title" style={{
          fontFamily: "'Zhi Mang Xing', cursive",
          fontSize: '46px',
          fontWeight: 'normal',
          background: 'linear-gradient(45deg, #f3ec78, #af4261)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '20px 0 40px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          好戏拆出来
        </h1>

        {/* 功能按钮 */}
        <div className="feature-buttons">
          <Button 
            className="feature-button"
            onClick={() => handleFeatureSelect('video')}
          >
            拆短剧
          </Button>
          <Button 
            className="feature-button"
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="功能开发中，敬请期待"
          >
            拆小说
          </Button>
        </div>
      </div>
      <ChangePasswordModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onFinish={handleChangePassword}
      />
    </div>
  )
}

export default Homepage 