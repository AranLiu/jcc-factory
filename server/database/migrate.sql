-- 数据库迁移脚本
-- 用于更新现有数据库结构而不丢失数据

USE jcc_factory;

-- 检查并添加 knowledge_base 表的缺失字段
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS user_id INT NOT NULL DEFAULT 1 AFTER project_id,
ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) AFTER content,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(255) AFTER file_path,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 修改 file_type 字段长度（如果已存在）
ALTER TABLE knowledge_base MODIFY COLUMN file_type VARCHAR(255);

-- 添加外键约束（如果不存在）
ALTER TABLE knowledge_base 
ADD CONSTRAINT IF NOT EXISTS fk_kb_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 创建 tags 表（如果不存在）
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL, -- 用于存储十六进制颜色代码，如 #FF5733
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, name) -- 确保用户的标签名称唯一
);

-- 创建 knowledge_base_tags 关联表（如果不存在）
CREATE TABLE IF NOT EXISTS knowledge_base_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    knowledge_base_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_kb_tag (knowledge_base_id, tag_id) -- 避免重复关联
); 