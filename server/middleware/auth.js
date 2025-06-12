const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: '访问令牌缺失' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 验证用户是否仍然存在
        const [users] = await pool.execute(
            'SELECT id, username, email, role, permission, status FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: '用户不存在' });
        }

        const user = users[0];
        
        // 检查用户状态
        if (user.status === 'inactive') {
            return res.status(401).json({ message: '账号已被停用' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token验证失败:', error);
        return res.status(403).json({ message: '访问令牌无效' });
    }
};

// 管理员权限验证中间件
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: '未认证' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '需要管理员权限' });
    }
    
    next();
};

module.exports = { authenticateToken, requireAdmin }; 