-- 系统配置表迁移脚本
-- 用于存储AI模型和代理等系统配置

CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键名',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'json', 'boolean') DEFAULT 'string' COMMENT '配置值类型',
    description TEXT COMMENT '配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT COMMENT '最后更新用户ID',
    INDEX idx_config_key (config_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT '系统配置表';

-- 插入默认配置数据
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('gemini_api_key', '', 'string', 'Google Gemini API密钥'),
('gemini_default_model', 'gemini-1.5-flash', 'string', '默认使用的Gemini模型'),
('gemini_available_models', '["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"]', 'json', '可用的Gemini模型列表'),
('proxy_enabled', 'false', 'boolean', '是否启用代理'),
('proxy_http', '', 'string', 'HTTP代理地址'),
('proxy_https', '', 'string', 'HTTPS代理地址'),
('proxy_no_proxy', 'localhost,127.0.0.1', 'string', '不使用代理的地址列表')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP; 