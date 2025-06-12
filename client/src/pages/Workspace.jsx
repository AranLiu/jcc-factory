import React, { useState, useEffect } from 'react'
import { 
  Layout, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Space,
  Popconfirm,
  Dropdown,
  Menu
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FolderOpenOutlined,
  ArrowLeftOutlined,
  BookOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { projectAPI, authAPI } from '../services/api'
import dayjs from 'dayjs'

const { Header, Content } = Layout
const { TextArea } = Input

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
      <Form form={form} layout="vertical" onFinish={onFinish} name="change_password_workspace">
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

const Workspace = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  
  const [form] = Form.useForm()
  
  const defaultProjectType = location.state?.projectType || 'video'

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const response = await projectAPI.getList()
      setProjects(response.projects || [])
    } catch (error) {
      message.error('加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleShowModal = (project = null) => {
    if (project) {
      setIsEditing(true)
      setEditingProject(project)
      form.setFieldsValue(project)
    } else {
      setIsEditing(false)
      setEditingProject(null)
      form.resetFields()
      form.setFieldsValue({ type: defaultProjectType })
    }
    setIsModalVisible(true)
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
  }

  const handleFormSubmit = async (values) => {
    const dataToSubmit = {
      ...values,
      type: values.type || defaultProjectType,
    };

    try {
      if (isEditing) {
        await projectAPI.update(editingProject.id, dataToSubmit)
        message.success('项目更新成功')
      } else {
        await projectAPI.create(dataToSubmit)
        message.success('项目创建成功')
      }
      setIsModalVisible(false)
      loadProjects()
    } catch (error) {
      message.error(isEditing ? '更新失败' : '创建失败')
    }
  }

  const handleDeleteProject = async (id) => {
    try {
      await projectAPI.delete(id)
      message.success('项目删除成功')
      loadProjects()
    } catch (error) {
      message.error('项目删除失败')
    }
  }

  const handleChangePassword = async (values) => {
    try {
      await authAPI.changePassword(values);
      message.success('密码修改成功');
      setPasswordModalVisible(false);
    } catch (error) {
      message.error(error.response?.data?.message || '密码修改失败');
    }
  };

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
    } else if (key === 'changePassword') {
      setPasswordModalVisible(true);
    } else if (key === 'userManagement') {
      navigate('/user-management');
    } else if (key === 'systemConfig') {
      navigate('/system-config');
    }
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {user?.role === 'admin' && (
        <Menu.Item key="userManagement">用户管理</Menu.Item>
      )}
      {user?.role === 'admin' && (
        <Menu.Item key="systemConfig">系统配置</Menu.Item>
      )}
      <Menu.Item key="changePassword">修改密码</Menu.Item>
      <Menu.Item key="logout">退出</Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Button 
          type="link" 
          icon={<FolderOpenOutlined />}
          onClick={() => navigate(`/project/${record.id}`)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      )
    },
    {
      title: '项目描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    // 只有全局权限用户才显示项目所有者列
    ...(user?.permission === 'global' || user?.permission === 'readonly_global' ? [{
      title: '项目所有者',
      dataIndex: 'owner_name',
      key: 'owner_name',
      render: (name) => name || '未知'
    }] : []),
    {
      title: '文件数量',
      dataIndex: 'file_count',
      key: 'file_count',
      render: (count) => count || 0
    },
    {
      title: '最后操作时间',
      dataIndex: 'last_operation_at',
      key: 'last_operation_at',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '未知'
    },
    {
      title: '最后操作人',
      dataIndex: 'last_operator_name',
      key: 'last_operator_name',
      render: (name) => name || '未知'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        // 根据权限决定是否显示编辑和删除按钮
        const userPermission = user?.permission || 'personal'; // NULL视为personal权限
        
        // 权限检查：确保数据类型一致的比较
        const isOwner = Number(record.user_id) === Number(user?.id);
        
        const canEdit = userPermission === 'global' || 
                       ((userPermission === 'personal' || userPermission === 'readonly_global') && isOwner);
        
        const canDelete = userPermission === 'global' || 
                         ((userPermission === 'personal' || userPermission === 'readonly_global') && isOwner);
        
        return (
          <Space>
            {canEdit && (
              <Button 
                type="link" 
                icon={<EditOutlined />}
                onClick={() => handleShowModal(record)}
              >
                编辑
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="确定要删除这个项目吗？"
                description="删除后无法恢复，相关文件也会被删除。"
                onConfirm={() => handleDeleteProject(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button 
                  type="link" 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
            {!canEdit && !canDelete && (
              <span style={{ color: '#999', fontStyle: 'italic' }}>只读</span>
            )}
          </Space>
        )
      }
    }
  ]

  return (
    <Layout className="workspace-layout" style={{ minHeight: '100vh' }}>
      <Header className="workspace-header">
        <div>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
            style={{ marginRight: 16 }}
          >
            返回主页
          </Button>
          <Button 
            icon={<BookOutlined />} 
            onClick={() => navigate('/knowledge-base')}
          >
            知识库
          </Button>
        </div>
        <div className="header-right">
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="link" className="user-menu-button">
              👋 {user?.username}
            </Button>
          </Dropdown>
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
              <h2 style={{ margin: 0, marginBottom: 8 }}>项目管理</h2>
              <p style={{ color: '#666', margin: 0 }}>
              管理和创建你的项目。
              </p>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleShowModal()}
            >
              新建项目
            </Button>
          </div>
        </div>

        <Table 
          columns={columns}
          dataSource={projects}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个项目`
          }}
        />

        <Modal
          title={isEditing ? '编辑项目' : '创建新项目'}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[{ required: true, message: '请输入项目名称' }]}
            >
              <Input placeholder="请输入项目名称" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="项目描述"
            >
              <TextArea rows={4} placeholder="请输入项目描述（可选）" />
            </Form.Item>

            <Form.Item name="type" hidden>
              <Input />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={handleCancel}>取消</Button>
                <Button type="primary" htmlType="submit">
                  {isEditing ? '保存' : '创建'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
        <ChangePasswordModal
          visible={passwordModalVisible}
          onCancel={() => setPasswordModalVisible(false)}
          onFinish={handleChangePassword}
        />
      </Content>
    </Layout>
  )
}

export default Workspace 