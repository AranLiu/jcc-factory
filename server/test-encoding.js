const { spawn } = require('child_process');
const path = require('path');

async function testEncoding() {
    console.log('🔧 测试Python-Node.js编码传输');
    
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../test-encoding.py');
        const pythonProcess = spawn('python', [pythonScript], {
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.setEncoding('utf8');
        pythonProcess.stderr.setEncoding('utf8');

        pythonProcess.stdout.on('data', (data) => {
            output += data;
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data;
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    console.log('📤 Python原始输出:');
                    console.log(output);
                    
                    const result = JSON.parse(output.trim());
                    console.log('✅ JSON解析成功:');
                    console.log(JSON.stringify(result, null, 2));
                    
                    console.log('📝 中文文本内容:');
                    console.log(result.text);
                    
                    resolve(result);
                } catch (parseError) {
                    console.error('❌ JSON解析失败:', parseError.message);
                    console.error('原始输出:', output);
                    reject(parseError);
                }
            } else {
                reject(new Error(`Python进程退出，代码: ${code}\n错误: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Python进程错误: ${error.message}`));
        });
    });
}

testEncoding()
    .then(result => {
        console.log('🎉 编码测试成功！');
    })
    .catch(error => {
        console.error('💥 编码测试失败:', error.message);
    }); 