const { pool } = require('../config/database');

async function checkDatabase() {
    console.log('检查数据库表结构...\n');
    
    try {
        // 查看knowledge_base表结构
        console.log('=== knowledge_base 表结构 ===');
        const [kbColumns] = await pool.execute('DESCRIBE knowledge_base');
        console.table(kbColumns);
        
        // 查看tags表是否存在
        console.log('\n=== tags 表结构 ===');
        try {
            const [tagColumns] = await pool.execute('DESCRIBE tags');
            console.table(tagColumns);
        } catch (error) {
            console.log('❌ tags表不存在:', error.message);
        }
        
        // 查看knowledge_base_tags表是否存在
        console.log('\n=== knowledge_base_tags 表结构 ===');
        try {
            const [kbtColumns] = await pool.execute('DESCRIBE knowledge_base_tags');
            console.table(kbtColumns);
        } catch (error) {
            console.log('❌ knowledge_base_tags表不存在:', error.message);
        }
        
        // 查看所有表
        console.log('\n=== 所有表 ===');
        const [tables] = await pool.execute('SHOW TABLES');
        console.table(tables);
        
    } catch (error) {
        console.error('❌ 检查数据库失败:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase(); 