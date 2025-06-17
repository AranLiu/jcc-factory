-- 创建数据库
CREATE DATABASE IF NOT EXISTS jcc_factory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE jcc_factory;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
    permission ENUM('personal', 'readonly_global', 'full_access') DEFAULT 'personal' NOT NULL,
    remarks TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active' NOT NULL,
    
    -- 添加索引
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id INT NOT NULL,
    type ENUM('video', 'novel') NOT NULL,
    status ENUM('created', 'processing', 'completed', 'failed') DEFAULT 'created',
    analysis_prompt TEXT,
    integration_prompt TEXT,
    integrated_script TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_operation_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_operator_id INT,
    
    -- 添加索引
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_last_operation_at (last_operation_at),
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_operator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration FLOAT, -- 视频或音频时长（秒）
    thumbnail_path VARCHAR(255), -- 缩略图路径
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 添加索引
    INDEX idx_project_id (project_id),
    INDEX idx_filename (filename),
    INDEX idx_mime_type (mime_type),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_file_size (file_size),
    
    -- 外键约束
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- AI处理任务表
CREATE TABLE IF NOT EXISTS ai_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    file_id INT,
    prompt TEXT NOT NULL,
    model_config JSON,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    -- 添加索引
    INDEX idx_project_id (project_id),
    INDEX idx_file_id (file_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_completed_at (completed_at),
    INDEX idx_status_created (status, created_at), -- 复合索引，用于按状态和时间查询
    
    -- 外键约束
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_path VARCHAR(255),
    file_type VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 添加索引
    INDEX idx_user_id (user_id),
    INDEX idx_project_id (project_id),
    INDEX idx_title (title),
    INDEX idx_file_type (file_type),
    INDEX idx_created_at (created_at),
    
    -- 全文搜索索引
    FULLTEXT INDEX ft_title_content (title, content),
    
    -- 外键约束
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL, -- 用于存储颜色代码
    
    -- 添加索引
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, name) -- 确保用户的标签名称唯一
);

-- 知识库标签关联表
CREATE TABLE IF NOT EXISTS knowledge_base_tags (
    knowledge_base_id INT NOT NULL,
    tag_id INT NOT NULL,
    
    -- 添加索引
    INDEX idx_knowledge_base_id (knowledge_base_id),
    INDEX idx_tag_id (tag_id),
    
    -- 外键约束
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    
    -- 复合主键，同时避免重复关联
    PRIMARY KEY (knowledge_base_id, tag_id)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'json', 'boolean') DEFAULT 'string' NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    -- 添加索引
    INDEX idx_config_key (config_key),
    INDEX idx_config_type (config_type),
    INDEX idx_updated_at (updated_at),
    
    -- 外键约束（updated_by引用users表）
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('gemini_api_key', '', 'string', 'Google Gemini API密钥'),
('gemini_default_model', 'gemini-1.5-flash', 'string', '默认使用的Gemini模型'),
('gemini_available_models', '["gemini-1.5-flash", "gemini-1.5-pro"]', 'json', '可用的Gemini模型列表'),
('video_analysis_prompt', '请分析这个视频的内容，并提供详细的分析报告。', 'string', '视频分析提示词'),
('script_integration_prompt', '请基于提供的内容整合出一个完整的脚本。', 'string', '脚本整合提示词'),
('max_file_size', '500', 'string', '最大文件上传大小(MB)'),
('allowed_file_types', '["mp4", "avi", "mov", "txt", "docx", "pdf"]', 'json', '允许上传的文件类型'),
('system_maintenance', 'false', 'boolean', '系统维护模式开关')
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
description = VALUES(description);

-- 默认管理员用户 (admin/admin123) 将通过 setup-admin.js 脚本创建
-- 确保在初始化数据库后运行: node scripts/setup-admin.js 